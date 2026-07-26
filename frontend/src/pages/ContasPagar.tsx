// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Grid,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  TablePagination,
  ThemeProvider,
  createTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentIcon from '@mui/icons-material/Payment';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import ReceiptIcon from '@mui/icons-material/Receipt';
import api from '../utils/api';
import { useAbortController } from '../hooks/useAbortController';
import { isRequestCancelled, getRequestErrorMessage } from '../utils/requestUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tema Premium Indigo/Emerald
const contasTheme = createTheme({
  palette: {
    primary: { main: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
    secondary: { main: '#10b981', dark: '#059669', light: '#34d399' },
    background: { paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, color: '#0f172a' },
    h6: { fontWeight: 600, color: '#1e293b' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
          border: '1px solid #f1f5f9',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(99,102,241,0.2)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
  },
});

const ROWS_PER_PAGE = 50;

const ContasPagar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Forçando recompilação após correções
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [subgrupos, setSubgrupos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  const [filtros, setFiltros] = useState({
    ativo: 'todas', // 'todas' | 'ativas' | 'inativas'
    status: 'todos', // 'todos' | 'pendentes' | 'pagas' | 'vencidas'
    dataInicio: '',
    dataFim: ''
  });
  const [openCadastro, setOpenCadastro] = useState(false);
  const [openPagamento, setOpenPagamento] = useState(false);
  const [openFornecedor, setOpenFornecedor] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [contaEditId, setContaEditId] = useState(null);
  const [fornecedorData, setFornecedorData] = useState({ nome: '', tipo: '', documento: '', telefone: '', email: '', endereco: '', observacoes: '' });
  const [formData, setFormData] = useState({
    nome: '',
    dataVencimento: '',
    valor: '',
    fornecedor: '',
    observacao: '',
    totalParcelas: '1',
    parcelMode: 'dividir', // dividir, mesmo_valor, manual
    tipoControle: '',
    subgrupo: '',
  });
  const [pagamentoData, setPagamentoData] = useState({
    formaPagamento: '',
    contaBancaria: '',
    cartao: '',
    juros: '',
  });
  const [openConfirmCancel, setOpenConfirmCancel] = useState(false);
  const [contaToCancel, setContaToCancel] = useState(null);
  const [openConfirmEstorno, setOpenConfirmEstorno] = useState(false);
  const [contaToEstornar, setContaToEstornar] = useState(null);
  const [openConfirmHardDelete, setOpenConfirmHardDelete] = useState(false);
  const [contaToHardDelete, setContaToHardDelete] = useState(null);
  const [openConfirmParcelas, setOpenConfirmParcelas] = useState(false);
  const [parcelasInfo, setParcelasInfo] = useState({ count: 0, contaId: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [parcelasList, setParcelasList] = useState([]);
  const [parcelaData, setParcelaData] = useState({ valor: '', data: '' });
  const [actionType, setActionType] = useState('cancel');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { getSignal: getContasSignal } = useAbortController();
  const { getSignal: getAuxSignal } = useAbortController();

  const contasValidas = useMemo(
    () => contas.filter((conta) => conta && conta.valor != null),
    [contas]
  );

  // Normaliza o campo `ativo` que pode vir como boolean, string, number ou undefined
  const isActive = (conta) => {
    const v = conta?.ativo;
    if (v === undefined || v === null) return true;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
      return true;
    }
    if (typeof v === 'number') return v !== 0;
    return Boolean(v);
  };

  const isNotEmpty = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return v !== 0;
    return Boolean(v);
  };

  const fetchContas = useCallback(async (pageIndex = page, externalSignal) => {
    const signal = externalSignal ?? getContasSignal();
    try {
      setLoading(true);
      const params = {
        mes,
        ano,
        page: pageIndex + 1,
        limit: ROWS_PER_PAGE,
      };
      if (filtros.ativo && filtros.ativo !== 'todas') params.ativo = filtros.ativo;
      if (filtros.status && filtros.status !== 'todos') params.status = filtros.status;
      if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
      if (filtros.dataFim) params.dataFim = filtros.dataFim;

      const response = await api.get('/contas', { params, signal });
      const payload = response.data;
      const listas = (payload.items || []).filter((conta) => conta && conta.valor != null);
      setContas(listas);
      setTotalCount(payload.total ?? 0);
    } catch (err) {
      if (!isRequestCancelled(err)) {
        setError(getRequestErrorMessage(err, 'Erro ao carregar contas'));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [mes, ano, filtros, page, getContasSignal]);


  // Limpa a lista de parcelas quando o modo de parcelamento muda para algo diferente de 'manual'
  useEffect(() => {
    if (formData.parcelMode !== 'manual') {
      setParcelasList([]);
      setParcelaData({ valor: '', data: '' });
    }
  }, [formData.parcelMode]);

  const fetchFornecedores = async () => {
    try {
      const response = await api.get('/fornecedores');
      setFornecedores(response.data.filter(f => f.ativo));
    } catch (err) {
      setError('Erro ao carregar fornecedores');
    }
  };

  const fetchContasBancarias = async () => {
    try {
      const response = await api.get('/contas-bancarias');
      setContasBancarias(response.data);
    } catch (err) {
      setError('Erro ao carregar contas bancárias');
    }
  };

  const fetchFormasPagamento = async () => {
    try {
      const response = await api.get('/formas-pagamento');
      setFormasPagamento(response.data);
    } catch (err) {
      setError('Erro ao carregar formas de pagamento');
    }
  };

  const fetchGrupos = async () => {
    try {
      const response = await api.get('/grupos');
      setGrupos(response.data);
    } catch (err) {
      setError('Erro ao carregar grupos');
    }
  };

  // Carregar subgrupos quando um grupo é selecionado
  const handleTipoControleChange = (value) => {
    setFormData({ ...formData, tipoControle: value, subgrupo: '' }); // Limpar subgrupo ao mudar grupo

    if (value) {
      const grupoSelecionado = grupos.find(g => g.nome === value);
      if (grupoSelecionado && grupoSelecionado.subgrupos) {
        setSubgrupos(grupoSelecionado.subgrupos);
      } else {
        setSubgrupos([]);
      }
    } else {
      setSubgrupos([]);
    }
  };

  const fetchCartoes = async () => {
    try {
      const response = await api.get('/cartoes');
      setCartoes(response.data.filter(cartao => cartao.ativo));
    } catch (err) {
      setError('Erro ao carregar cartões');
    }
  };

  useEffect(() => {
    const signal = getAuxSignal();

    const carregarDados = async () => {
      try {
        await Promise.all([
          fetchContas(0, signal),
          api.get('/fornecedores', { signal }).then((res) => {
            setFornecedores(res.data.filter((f) => f.ativo));
          }),
          api.get('/contas-bancarias', { signal }).then((res) => {
            setContasBancarias(res.data);
          }),
          api.get('/grupos', { signal }).then((res) => {
            setGrupos(res.data);
          }),
          api.get('/formas-pagamento', { signal }).then((res) => {
            setFormasPagamento(res.data);
          }),
          api.get('/cartoes', { signal }).then((res) => {
            setCartoes(res.data.filter((cartao) => cartao.ativo));
          }),
        ]);
      } catch (error) {
        if (!isRequestCancelled(error)) {
          console.error('Erro ao carregar dados iniciais:', error);
        }
      }
    };

    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAuxSignal]);

  useEffect(() => {
    const handler = () => fetchFormasPagamento();
    window.addEventListener('formasUpdated', handler);
    return () => window.removeEventListener('formasUpdated', handler);
  }, []);

  const handleAddParcela = () => {
    if (parcelaData.valor && parcelaData.data) {
      setParcelasList([...parcelasList, { ...parcelaData }]);
      setParcelaData({ valor: '', data: '' });
    }
  };

  const handleRemoveParcela = (index) => {
    setParcelasList(parcelasList.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      dataVencimento: '',
      valor: '',
      fornecedor: '',
      observacao: '',
      totalParcelas: '1',
      parcelMode: 'dividir',
      tipoControle: '',
      subgrupo: '',
    });
    setParcelasList([]);
    setParcelaData({ valor: '', data: '' });
    setSubgrupos([]); // Limpar subgrupos ao resetar
    setEditMode(false);
    setContaEditId(null);
  };

  const handleOpenCadastro = () => {
    resetForm();
    setOpenCadastro(true);
  };

  const handleCloseCadastro = () => {
    setOpenCadastro(false);
  };

  const handleEdit = (conta) => {
    setFormData({
      nome: conta.nome,
      dataVencimento: conta.dataVencimento ? conta.dataVencimento.split('T')[0] : '',
      valor: conta.valor.toString(),
      fornecedor: conta.fornecedor?._id || conta.fornecedor || '',
      observacao: conta.observacao || '',
      tipoControle: conta.tipoControle || '',
      subgrupo: conta.tipoDespesa?.subgrupo || '',
      totalParcelas: '1',
      parcelMode: 'dividir',
    });
    setEditMode(true);
    setContaEditId(conta._id);

    if (conta.tipoControle) {
      const grupoSelecionado = grupos.find(g => g.nome === conta.tipoControle);
      if (grupoSelecionado && grupoSelecionado.subgrupos) {
        setSubgrupos(grupoSelecionado.subgrupos);
      } else {
        setSubgrupos([]);
      }
    }

    setOpenCadastro(true);
  };

  const handleOpenFornecedor = () => {
    setFornecedorData({ nome: '', tipo: '', documento: '', telefone: '', email: '', endereco: '', observacoes: '' });
    setOpenFornecedor(true);
  };

  const handleCloseFornecedor = () => {
    setOpenFornecedor(false);
  };

  const handleSubmitFornecedor = async (e) => {
    e.preventDefault();
    try {

      // Desabilitar botão para evitar cliques duplicados
      const submitButton = e.target.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';
      }

      const response = await api.post('/fornecedores', fornecedorData);

      setSuccess('Fornecedor cadastrado com sucesso!');
      // Atualizar lista de fornecedores localmente (mais rápido)
      setFornecedores(prev => [...prev, response.data]);

      // Atualizar formulário com o novo fornecedor
      setFormData({ ...formData, fornecedor: response.data._id });

      // Fechar diálogo imediatamente
      handleCloseFornecedor();

      // Buscar fornecedores em background (para garantir consistência)
      fetchFornecedores().catch(console.error);

      // Reabilitar botão
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar';
      }

    } catch (err) {
      console.error('❌ Erro ao cadastrar fornecedor:', err);

      // Reabilitar botão em caso de erro
      const submitButton = e.target.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar';
      }

      setError(err.response?.data?.message || 'Erro ao cadastrar fornecedor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editMode && formData.parcelMode === 'manual') {
      const totalParcelas = parseInt(formData.totalParcelas);
      if (parcelasList.length !== totalParcelas) {
        setError(`Número de parcelas adicionadas (${parcelasList.length}) não corresponde ao informado (${totalParcelas}).`);
        return;
      }
      const somaParcelas = parcelasList.reduce((sum, p) => sum + parseFloat(p.valor), 0);
      const valorTotal = parseFloat(formData.valor);
      if (Math.abs(somaParcelas - valorTotal) > 0.01) {
        setError(`Soma dos valores das parcelas (R$ ${somaParcelas.toFixed(2)}) não corresponde ao valor total (R$ ${valorTotal.toFixed(2)}).`);
        return;
      }
    }

    try {
      const jsonData = {
        nome: formData.nome,
        valor: formData.valor,
        dataVencimento: formData.dataVencimento,
        fornecedor: formData.fornecedor,
        observacao: formData.observacao,
        tipoControle: formData.tipoControle
      };

      if (formData.tipoControle) {
        const grupoSelecionado = grupos.find(g => g.nome === formData.tipoControle);
        if (grupoSelecionado) {
          jsonData.tipoDespesa = {
            grupo: grupoSelecionado._id,
            subgrupo: formData.subgrupo || ''
          };
        }
      }

      if (!editMode) {
        if (formData.parcelMode === 'manual') {
          jsonData.parcelas = parcelasList;
          jsonData.parcelMode = formData.parcelMode;
          delete jsonData.dataVencimento; // Not needed for manual mode
          delete jsonData.valor; // Individual parcel values are in parcelas array
        } else {
          if (parseInt(formData.totalParcelas) > 1) {
            jsonData.totalParcelas = formData.totalParcelas;
            jsonData.parcelMode = formData.parcelMode;
          }
        }
      }

      if (editMode && contaEditId) {
        await api.put(`/contas/${contaEditId}`, jsonData);
      } else {
        await api.post('/contas', jsonData);
      }

      fetchContas();
      handleCloseCadastro();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar conta');
    }
  };

  const handleOpenPagamento = (conta) => {
    if (!conta || !conta.valor) return;
    setContaSelecionada(conta);
    setPagamentoData({
      formaPagamento: '',
      contaBancaria: '',
      cartao: '',
      juros: '',
    });
    setOpenPagamento(true);
  };

  const handleClosePagamento = () => {
    setOpenPagamento(false);
    setContaSelecionada(null);
  };

  const handlePagar = async () => {
    try {
      // Verificar se a conta ainda está pendente antes de pagar
      const responseCheck = await api.get(`/contas/${contaSelecionada._id}`);
      if (responseCheck.data.status === 'Pago') {
        setError('Esta conta já foi paga por outro usuário ou em outra aba.');
        handleClosePagamento();
        return;
      }

      // Desabilitar botão para evitar cliques duplicados
      const originalButton = document.querySelector('[type="submit"]');
      if (originalButton) {
        originalButton.disabled = true;
        originalButton.textContent = 'Processando...';
      }

      await api.post(`/contas/${contaSelecionada._id}/pagar`, pagamentoData);

      setSuccess('Conta paga com sucesso!');
      // Pequeno delay para garantir que o backend processou
      await new Promise(resolve => setTimeout(resolve, 500));

      fetchContas();
      handleClosePagamento();
      setError('');

      // Reabilitar botão
      if (originalButton) {
        originalButton.disabled = false;
        originalButton.textContent = 'Pagar';
      }
    } catch (err) {
      console.error('❌ Erro ao pagar conta:', err);

      // Reabilitar botão em caso de erro
      const originalButton = document.querySelector('[type="submit"]');
      if (originalButton) {
        originalButton.disabled = false;
        originalButton.textContent = 'Pagar';
      }

      if (err.response?.status === 400 && err.response?.data?.message?.includes('já foi paga')) {
        setError('Esta conta já foi paga. Atualizando a lista...');
        fetchContas();
        handleClosePagamento();
      } else {
        setError(err.response?.data?.message || 'Erro ao pagar conta');
      }
    }
  };

  const handleEstornar = (id) => {
    setContaToEstornar(id);
    setOpenConfirmEstorno(true);
  };

  const confirmEstorno = async () => {
    if (contaToEstornar) {
      try {
        await api.post(`/contas/${contaToEstornar}/estornar`);
        setSuccess('Pagamento estornado com sucesso!');
        fetchContas();
      } catch (err) {
        console.error('Erro ao estornar:', err);
        setError(err.response?.data?.message || 'Erro ao estornar pagamento');
      } finally {
        setOpenConfirmEstorno(false);
        setContaToEstornar(null);
      }
    }
  };

  const handleCancelar = (id) => {
    setActionType('cancel');
    setContaToCancel(id);
    setOpenConfirmCancel(true);
  };

  const confirmCancel = async () => {
    if (contaToCancel) {
      try {
        // Verificar no backend se há parcelas restantes
        const checkResponse = await api.get(`/contas/${contaToCancel}/check-installments`);

        if (checkResponse.data.hasRemainingInstallments) {
          setParcelasInfo({
            count: checkResponse.data.remainingCount,
            contaId: contaToCancel
          });
          setOpenConfirmParcelas(true);
          setOpenConfirmCancel(false);
          return; // Não inativa ainda, espera escolha do usuário
        }

        // Se não há parcelas restantes, inativa diretamente
        const response = await api.delete(`/contas/${contaToCancel}/hard`);
        await fetchContas();
        setOpenConfirmCancel(false);
        setContaToCancel(null);
      } catch (err) {
        console.error('Erro ao cancelar conta:', err);
        setError('Erro ao cancelar conta');
      }
    }
  };

  const handleHardDelete = (id) => {
    setActionType('hardDelete');
    setContaToHardDelete(id);
    setOpenConfirmHardDelete(true);
  };

  const confirmHardDelete = async () => {
    if (!contaToHardDelete) return;
    try {
      // Primeiro, verificar se há parcelas restantes
      const checkResponse = await api.get(`/contas/${contaToHardDelete}/check-installments`);

      if (checkResponse.data.hasRemainingInstallments) {
        setParcelasInfo({
          count: checkResponse.data.remainingCount,
          contaId: contaToHardDelete
        });
        setOpenConfirmParcelas(true);
        setOpenConfirmHardDelete(false);
      } else {
        // Se não tiver parcelas restantes, tenta excluir permanentemente
        try {
          await api.delete(`/contas/${contaToHardDelete}/permanent`);
          await fetchContas();
          setOpenConfirmHardDelete(false);
          setContaToHardDelete(null);
        } catch (err) {
          // Se a rota permanent falhar (conta ainda ativa), usa a rota normal
          if (err.response?.status === 404) {
            await api.delete(`/contas/${contaToHardDelete}/hard`);
            await fetchContas();
            setOpenConfirmHardDelete(false);
            setContaToHardDelete(null);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      setError('Erro ao excluir conta');
    }
  };

  // Função para inativar apenas esta parcela
  const cancelarApenasEsta = async () => {
    try {
      if (actionType === 'cancel') {
        await api.delete(`/contas/${parcelasInfo.contaId}/hard`);
      } else {
        await api.delete(`/contas/${parcelasInfo.contaId}?force=true`);
      }
      await fetchContas();
      setOpenConfirmParcelas(false);
      setParcelasInfo({ count: 0, contaId: null });
      setContaToCancel(null);
      setContaToHardDelete(null);
    } catch (err) {
      setError('Erro ao inativar/excluir parcela');
    }
  };

  // Função para inativar todas as parcelas restantes
  const cancelarTodasParcelas = async () => {
    try {
      if (actionType === 'cancel') {
        await api.delete(`/contas/${parcelasInfo.contaId}/hard-all-remaining`);
      } else {
        await api.delete(`/contas/${parcelasInfo.contaId}/cancel-all-remaining`);
      }
      await fetchContas();
      setOpenConfirmParcelas(false);
      setParcelasInfo({ count: 0, contaId: null });
      setContaToCancel(null);
      setContaToHardDelete(null);
    } catch (err) {
      setError('Erro ao inativar/excluir parcelas');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pago':
        return 'success';
      case 'Vencida':
        return 'error';
      case 'Cancelada':
        return 'default';
      case 'Inativo':
        return 'default';
      default:
        return 'primary';
    }
  };

  // Componente para renderizar cards no mobile
  const ContaCard = ({ conta }) => (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, pr: 1 }}>
            {conta.nome}
            {conta.parcelaAtual && (
              <Typography variant="caption" display="block" color="textSecondary">
                Parcela {conta.parcelaAtual} de {conta.totalParcelas}
              </Typography>
            )}
          </Typography>
          <Chip
            label={!isActive(conta) ? 'Inativo' : conta.status}
            color={getStatusColor(!isActive(conta) ? 'Inativo' : conta.status)}
            size="small"
          />
        </Box>

        <Box mb={1}>
          <Typography variant="body2" color="text.secondary">
            Fornecedor: {conta.fornecedor?.nome || 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vencimento: {new Date(conta.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </Typography>
        </Box>

        <Typography variant="h6" color="primary" fontWeight="bold">
          R$ {conta.valor.toFixed(2).replace('.', ',')}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        {(conta.status === 'Pendente' || conta.status === 'Vencida') && isActive(conta) && (
          <>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenPagamento(conta)}
              title="Pagar"
            >
              <PaymentIcon />
            </IconButton>
            <IconButton
              size="small"
              color="secondary"
              onClick={() => handleEdit(conta)}
              title="Editar"
            >
              <EditIcon />
            </IconButton>
          </>
        )}
        {isActive(conta) && conta.status !== 'Pago' && conta.status !== 'Cancelada' && (
          <>
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleCancelar(conta._id)}
              title="Inativar"
            >
              <DeleteIcon />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleHardDelete(conta._id)}
              title="Excluir"
            >
              <DeleteForeverIcon />
            </IconButton>
          </>
        )}
        {!isActive(conta) && (
          <IconButton
            size="small"
            color="error"
            onClick={() => handleHardDelete(conta._id)}
            title="Excluir"
          >
            <DeleteForeverIcon />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );

  const handleExportar = async (formato) => {
    try {
      const params = { formato };
      if (filtros.status && filtros.status !== 'todos') params.status = filtros.status;

      const response = await api.get('/exportar/contas', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `contas.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar arquivo');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={contasTheme}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={3} gap={2}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon color="primary" fontSize="large" /> Contas a Pagar
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              onClick={() => handleExportar('pdf')}
              size="small"
              color="error"
            >
              PDF
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExportar('excel')}
              size="small"
              color="success"
            >
              Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCadastro}
              size="small"
            >
              Cadastrar Conta
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Filtros */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, bgcolor: '#f8fafc' }}>
          <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Mês</InputLabel>
              <Select value={mes} label="Mês" size="small" onChange={(e) => { setMes(parseInt(e.target.value)); }}>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Ano</InputLabel>
              <Select value={ano} label="Ano" size="small" onChange={(e) => { setAno(parseInt(e.target.value)); }}>
                {Array.from({ length: 6 }).map((_, idx) => {
                  const y = today.getFullYear() - 2 + idx;
                  return <MenuItem key={y} value={y}>{y}</MenuItem>;
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Ativo</InputLabel>
              <Select
                value={filtros.ativo}
                label="Ativo"
                size="small"
                onChange={(e) => setFiltros({ ...filtros, ativo: e.target.value })}
              >
                <MenuItem value="todas">Todas</MenuItem>
                <MenuItem value="ativas">Ativas</MenuItem>
                <MenuItem value="inativas">Inativas</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filtros.status}
                label="Status"
                size="small"
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="pendentes">Pendentes</MenuItem>
                <MenuItem value="pagas">Pagas</MenuItem>
                <MenuItem value="vencidas">Vencidas</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Início"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Fim"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant="contained" color="primary" size="small" onClick={() => { setPage(0); fetchContas(0); }}>Aplicar</Button>
            <Button variant="contained" color="primary" size="small" sx={{ ml: 1 }} onClick={() => { setFiltros({ ativo: 'todas', status: 'todos', dataInicio: '', dataFim: '' }); }}>Limpar</Button>
          </Grid>
        </Grid>
      </Paper>

      {contas.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nenhuma conta cadastrada. Clique em "Cadastrar Conta" para adicionar uma nova conta.
        </Alert>
      )}

      {/* Layout responsivo: Cards para mobile, Tabela para desktop */}
      {isMobile ? (
        <Box>
          {contasValidas.map((conta) => (
            <ContaCard key={conta._id} conta={conta} />
          ))}
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Fornecedor</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {contasValidas.map((conta) => (
                <TableRow key={conta._id}>
                  <TableCell>
                    {conta.nome}
                    {conta.parcelaAtual && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        Parcela {conta.parcelaAtual} de {conta.totalParcelas}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{conta.fornecedor?.nome}</TableCell>
                  <TableCell>
                    {new Date(conta.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </TableCell>
                  <TableCell>
                    R$ {conta.valor.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={!isActive(conta) ? 'Inativo' : conta.status}
                      color={getStatusColor(!isActive(conta) ? 'Inativo' : conta.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {(conta.status === 'Pendente' || conta.status === 'Vencida') && isActive(conta) && (
                      <>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenPagamento(conta)}
                          title="Pagar"
                        >
                          <PaymentIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleEdit(conta)}
                          title="Editar"
                        >
                          <EditIcon />
                        </IconButton>
                      </>
                    )}
                    {isActive(conta) && conta.status !== 'Pago' && conta.status !== 'Cancelada' && (
                      <>
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleCancelar(conta._id)}
                          title="Inativar"
                        >
                          <DeleteIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleHardDelete(conta._id)}
                          title="Excluir"
                        >
                          <DeleteForeverIcon />
                        </IconButton>
                      </>
                    )}
                    {isActive(conta) && conta.status === 'Pago' && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="info"
                        startIcon={<UndoIcon />}
                        onClick={() => handleEstornar(conta._id)}
                        sx={{ ml: 1, borderRadius: 6, fontWeight: 'bold' }}
                        title="Estornar Pagamento Seguro"
                      >
                        Estornar
                      </Button>
                    )}
                    {!isActive(conta) && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleHardDelete(conta._id)}
                        title="Excluir"
                      >
                        <DeleteForeverIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      )}

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, newPage) => {
          setPage(newPage);
          fetchContas(newPage);
        }}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />

      {/* Resumo de totais responsivo */}
      <Box mt={2} display="flex" gap={2} flexWrap={isMobile ? 'wrap' : 'nowrap'}>
        <Paper sx={{ p: 2, minWidth: 200, flex: 1 }}>
          <Typography variant="subtitle2">Total Pendentes</Typography>
          <Typography variant="h6" color="error">
            R$ {(contas.reduce((acc, c) => { if (c.status === 'Pendente' || c.status === 'Vencida') return acc + (c.valor || 0); return acc; }, 0)).toFixed(2).replace('.', ',')}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 200, flex: 1 }}>
          <Typography variant="subtitle2">Total Pagas</Typography>
          <Typography variant="h6" color="success.main">
            R$ {(contas.reduce((acc, c) => { if (c.status === 'Pago') return acc + (c.valor || 0); return acc; }, 0)).toFixed(2).replace('.', ',')}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 200, flex: 1 }}>
          <Typography variant="subtitle2">Total Geral</Typography>
          <Typography variant="h6" color="primary">
            R$ {(contas.reduce((acc, c) => acc + (c.valor || 0), 0)).toFixed(2).replace('.', ',')}
          </Typography>
        </Paper>
      </Box>

      {/* Dialog Cadastro */}
      <Dialog open={openCadastro} onClose={handleCloseCadastro} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editMode ? 'Editar Conta' : 'Cadastrar Conta a Pagar'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome da Conta"
              margin="normal"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            {formData.parcelMode !== 'manual' && (
              <TextField
                fullWidth
                label="Data de Vencimento"
                type="date"
                margin="normal"
                required
                InputLabelProps={{ shrink: true }}
                value={formData.dataVencimento}
                onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
              />
            )}
            <TextField
              fullWidth
              label={formData.parcelMode === 'manual' ? "Valor Total" : "Valor"}
              type="number"
              margin="normal"
              required
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mt: 2, mb: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Fornecedor</InputLabel>
                <Select
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                  label="Fornecedor"
                >
                  {fornecedores.map((fornecedor) => (
                    <MenuItem key={fornecedor._id} value={fornecedor._id}>
                      {fornecedor.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                color="primary"
                onClick={handleOpenFornecedor}
                sx={{ mb: 0.5 }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            {!editMode && (
              <TextField
                fullWidth
                label="Número de Parcelas"
                type="number"
                margin="normal"
                InputProps={{ inputProps: { min: 1, max: 72 } }}
                value={formData.totalParcelas}
                onChange={(e) => {
                  const newTotalParcelas = e.target.value;
                  setFormData({
                    ...formData,
                    totalParcelas: newTotalParcelas,
                    // Reseta para modo automático quando volta para 1 parcela
                    parcelMode: parseInt(newTotalParcelas) === 1 ? 'dividir' : formData.parcelMode
                  });
                }}
              />
            )}
            {!editMode && parseInt(formData.totalParcelas) > 1 && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Modo de Parcelamento</InputLabel>
                <Select
                  value={formData.parcelMode}
                  onChange={(e) => setFormData({ ...formData, parcelMode: e.target.value })}
                  label="Modo de Parcelamento"
                >
                  <MenuItem value="dividir">Dividir valor total pelas parcelas</MenuItem>
                  <MenuItem value="mesmo_valor">Mesmo valor nas parcelas restantes</MenuItem>
                  <MenuItem value="manual">Definir valores e datas manualmente</MenuItem>
                </Select>
              </FormControl>
            )}
            <TextField
              fullWidth
              label="Observação"
              margin="normal"
              multiline
              rows={3}
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo de Controle</InputLabel>
              <Select
                value={formData.tipoControle}
                onChange={(e) => handleTipoControleChange(e.target.value)}
                label="Tipo de Controle"
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {grupos.map((grupo) => (
                  <MenuItem key={grupo._id} value={grupo.nome}>
                    {grupo.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formData.tipoControle && subgrupos.length > 0 && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Subgrupo</InputLabel>
                <Select
                  value={formData.subgrupo}
                  onChange={(e) => setFormData({ ...formData, subgrupo: e.target.value })}
                  label="Subgrupo"
                >
                  <MenuItem value="">
                    <em>Nenhum</em>
                  </MenuItem>
                  {subgrupos.map((subgrupo, index) => (
                    <MenuItem key={index} value={subgrupo.nome}>
                      {subgrupo.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {formData.parcelMode === 'manual' && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>Adicionar Parcelas</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Valor da Parcela"
                      type="number"
                      value={parcelaData.valor}
                      onChange={(e) => setParcelaData({ ...parcelaData, valor: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Data de Vencimento"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={parcelaData.data}
                      onChange={(e) => setParcelaData({ ...parcelaData, data: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button variant="contained" onClick={handleAddParcela}>
                      Adicionar
                    </Button>
                  </Grid>
                </Grid>
                {parcelasList.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">Parcelas Adicionadas:</Typography>
                    <List>
                      {parcelasList.map((parcela, index) => (
                        <ListItem key={index} secondaryAction={
                          <IconButton edge="end" onClick={() => handleRemoveParcela(index)}>
                            <DeleteIcon />
                          </IconButton>
                        }>
                          <ListItemText
                            primary={`Parcela ${index + 1}: R$ ${parseFloat(parcela.valor).toFixed(2).replace('.', ',')} - ${format(new Date(parcela.data + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCadastro}>Cancelar</Button>
            <Button type="submit" variant="contained">Salvar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Pagamento */}
      <Dialog open={openPagamento} onClose={handleClosePagamento} maxWidth="sm" fullWidth>
        {contaSelecionada && (
          <>
            <DialogTitle>Pagar Conta</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Valor"
                      value={`R$ ${contaSelecionada.valor.toFixed(2).replace('.', ',')}`}
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Fornecedor"
                      value={contaSelecionada.fornecedor?.nome}
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth required variant="outlined">
                      <InputLabel>Forma de Pagamento</InputLabel>
                      <Select
                        value={pagamentoData.formaPagamento}
                        onChange={(e) =>
                          setPagamentoData({ ...pagamentoData, formaPagamento: e.target.value, cartao: '' })
                        }
                        label="Forma de Pagamento"
                      >
                        {formasPagamento.map((f) => (
                          <MenuItem key={f._id} value={f.nome}>{f.nome}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Campo de Cartão - aparece apenas para formas de pagamento com cartão */}
                  {(pagamentoData.formaPagamento === 'Cartão de Crédito' || pagamentoData.formaPagamento === 'Cartão de Débito') && (
                    <Grid item xs={12}>
                      <FormControl fullWidth required variant="outlined">
                        <InputLabel>Cartão</InputLabel>
                        <Select
                          value={pagamentoData.cartao}
                          onChange={(e) => setPagamentoData({ ...pagamentoData, cartao: e.target.value })}
                          label="Cartão"
                        >
                          {cartoes
                            .filter(cartao =>
                              pagamentoData.formaPagamento === 'Cartão de Crédito' ?
                                cartao.tipo === 'Crédito' :
                                cartao.tipo === 'Débito'
                            )
                            .map((cartao) => (
                              <MenuItem key={cartao._id} value={cartao._id}>
                                {cartao.nome} - {cartao.banco} ({cartao.tipo})
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <FormControl fullWidth required variant="outlined">
                      <InputLabel>Conta Bancária</InputLabel>
                      <Select
                        value={pagamentoData.contaBancaria}
                        onChange={(e) =>
                          setPagamentoData({ ...pagamentoData, contaBancaria: e.target.value })
                        }
                        label="Conta Bancária"
                      >
                        {contasBancarias.map((conta) => (
                          <MenuItem key={conta._id} value={conta._id}>
                            {conta.nome} - {conta.banco}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  {contaSelecionada && contaSelecionada.status === 'Vencida' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Juros (R$)"
                        type="number"
                        value={pagamentoData.juros}
                        onChange={(e) =>
                          setPagamentoData({ ...pagamentoData, juros: e.target.value })
                        }
                        variant="outlined"
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClosePagamento}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handlePagar}
                disabled={
                  !pagamentoData.formaPagamento ||
                  !pagamentoData.contaBancaria ||
                  ((pagamentoData.formaPagamento === 'Cartão de Crédito' || pagamentoData.formaPagamento === 'Cartão de Débito') && !pagamentoData.cartao)
                }
              >
                Confirmar Pagamento
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog Cadastro Fornecedor */}
      <Dialog open={openFornecedor} onClose={handleCloseFornecedor} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleSubmitFornecedor}>
          <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #f1f5f9', mb: 2 }}>
            Cadastrar Novo Fornecedor
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Razão Social / Nome Completo"
                  required
                  value={fornecedorData.nome}
                  onChange={(e) => setFornecedorData({ ...fornecedorData, nome: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Categoria / Tipo"
                  placeholder="Ex: TI, Limpeza, Geral"
                  value={fornecedorData.tipo}
                  onChange={(e) => setFornecedorData({ ...fornecedorData, tipo: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CNPJ / CPF"
                  placeholder="00.000.000/0000-00"
                  value={fornecedorData.documento}
                  onChange={(e) => setFornecedorData({ ...fornecedorData, documento: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone / Celular"
                  placeholder="(00) 00000-0000"
                  value={fornecedorData.telefone}
                  onChange={(e) => setFornecedorData({ ...fornecedorData, telefone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={12}>
                <TextField
                  fullWidth
                  label="E-mail de Contato"
                  type="email"
                  placeholder="contato@fornecedor.com"
                  value={fornecedorData.email}
                  onChange={(e) => setFornecedorData({ ...fornecedorData, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Endereço Completo"
                  value={fornecedorData.endereco}
                  onChange={(e) => setFornecedorData({ ...fornecedorData, endereco: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações Adicionais"
                  multiline
                  rows={3}
                  value={fornecedorData.observacoes}
                  onChange={(e) => setFornecedorData({ ...fornecedorData, observacoes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
            <Button onClick={handleCloseFornecedor} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Confirmar Estorno */}
      <Dialog open={openConfirmEstorno} onClose={() => setOpenConfirmEstorno(false)}>
        <DialogTitle>Confirmar Estorno</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja estornar o pagamento desta conta?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Ela voltará a ficar pendente e o valor pago retornará ao seu saldo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmEstorno(false)}>Cancelar</Button>
          <Button onClick={confirmEstorno} variant="contained" color="warning">
            Sim, Estornar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Cancelamento */}
      <Dialog open={openConfirmCancel} onClose={() => setOpenConfirmCancel(false)}>
        <DialogTitle>Confirmar Inativação</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja inativar esta conta?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmCancel(false)}>Não</Button>
          <Button onClick={confirmCancel} variant="contained" color="warning">
            Sim, Inativar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Cancelamento de Parcelas */}
      <Dialog open={openConfirmParcelas} onClose={() => setOpenConfirmParcelas(false)}>
        <DialogTitle>{actionType === 'cancel' ? 'Inativar' : 'Excluir'} Parcelas Restantes</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, textAlign: 'left' }}>
            Existem <strong>{parcelasInfo.count}</strong> parcela(s) restante(s) deste grupo.
            Deseja {actionType === 'cancel' ? 'inativar' : 'excluir'} apenas esta parcela ou todas as restantes?
          </Typography>
          <Typography>
            Como você deseja proceder com a ação?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            • <strong>{actionType === 'cancel' ? 'Inativar' : 'Excluir'} apenas esta</strong>: {actionType === 'cancel' ? 'Inativa' : 'Exclui'} apenas a parcela atual<br />
            • <strong>{actionType === 'cancel' ? 'Inativar' : 'Excluir'} todas</strong>: {actionType === 'cancel' ? 'Inativa' : 'Exclui'} esta e todas as parcelas restantes
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={cancelarApenasEsta}
            variant="outlined"
            color="primary"
          >
            Apenas Esta
          </Button>
          <Button
            onClick={cancelarTodasParcelas}
            variant="contained"
            color={actionType === 'cancel' ? 'warning' : 'error'}
          >
            Todas as Restantes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Exclusão Permanente */}
      <Dialog open={openConfirmHardDelete} onClose={() => setOpenConfirmHardDelete(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>Esta ação removerá a conta permanentemente. Deseja continuar?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmHardDelete(false)}>Não</Button>
          <Button onClick={confirmHardDelete} variant="contained" color="error">
            Sim, Excluir
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default ContasPagar;

