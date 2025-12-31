import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentIcon from '@mui/icons-material/Payment';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import api from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ContasPagar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Forçando recompilação após correções
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [grupos, setGrupos] = useState([]);
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
  const [fornecedorData, setFornecedorData] = useState({ nome: '', tipo: '' });
  const [formData, setFormData] = useState({
    nome: '',
    dataVencimento: '',
    valor: '',
    fornecedor: '',
    observacao: '',
    totalParcelas: '1',
    parcelMode: 'dividir', // dividir, mesmo_valor, manual
    tipoControle: '',
  });
  const [pagamentoData, setPagamentoData] = useState({
    formaPagamento: '',
    contaBancaria: '',
    cartao: '',
    juros: '',
  });
  const [openConfirmCancel, setOpenConfirmCancel] = useState(false);
  const [contaToCancel, setContaToCancel] = useState(null);
  const [openConfirmHardDelete, setOpenConfirmHardDelete] = useState(false);
  const [contaToHardDelete, setContaToHardDelete] = useState(null);
  const [openConfirmParcelas, setOpenConfirmParcelas] = useState(false);
  const [parcelasInfo, setParcelasInfo] = useState({ count: 0, contaId: null });
  const [error, setError] = useState('');
  const [parcelasList, setParcelasList] = useState([]);
  const [parcelaData, setParcelaData] = useState({ valor: '', data: '' });

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

  const fetchContas = async () => {
    try {
      setLoading(true);
      // Busca contas do mês/ano selecionado por padrão
      const params = { mes, ano };
      // ativo filter
      if (filtros.ativo && filtros.ativo !== 'todas') params.ativo = filtros.ativo;
      // status filter
      if (filtros.status && filtros.status !== 'todos') params.status = filtros.status;
      // date range
      if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
      if (filtros.dataFim) params.dataFim = filtros.dataFim;

      const response = await api.get('/contas', { params });
      const listas = (response.data || []).filter(conta => conta && conta.valor != null);
      setContas(listas);
    } catch (err) {
      setError('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };


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

  const fetchCartoes = async () => {
    try {
      const response = await api.get('/cartoes');
      setCartoes(response.data.filter(cartao => cartao.ativo));
    } catch (err) {
      setError('Erro ao carregar cartões');
    }
  };

  useEffect(() => {
    fetchContas();
    fetchFornecedores();
    fetchContasBancarias();
    fetchGrupos();
    fetchFormasPagamento();
    fetchCartoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleOpenCadastro = () => {
    setFormData({
      nome: '',
      dataVencimento: '',
      valor: '',
      fornecedor: '',
      observacao: '',
      totalParcelas: '1',
      parcelMode: 'dividir',
      tipoControle: '',
    });
    setParcelasList([]);
    setParcelaData({ valor: '', data: '' });
    setOpenCadastro(true);
  };

  const handleCloseCadastro = () => {
    setOpenCadastro(false);
  };

  const handleOpenFornecedor = () => {
    setFornecedorData({ nome: '', tipo: '' });
    setOpenFornecedor(true);
  };

  const handleCloseFornecedor = () => {
    setOpenFornecedor(false);
  };

  const handleSubmitFornecedor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/fornecedores', fornecedorData);
      await fetchFornecedores();
      setFormData({ ...formData, fornecedor: response.data._id });
      handleCloseFornecedor();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar fornecedor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.parcelMode === 'manual') {
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
      const formDataToSend = new FormData();
      if (formData.parcelMode === 'manual') {
        formDataToSend.append('nome', formData.nome);
        formDataToSend.append('parcelas', JSON.stringify(parcelasList));
        formDataToSend.append('parcelMode', formData.parcelMode);
        formDataToSend.append('fornecedor', formData.fornecedor);
        formDataToSend.append('observacao', formData.observacao);
        formDataToSend.append('tipoControle', formData.tipoControle);
      } else {
        // garantir que o nome seja sempre enviado (validação no backend exige)
        formDataToSend.append('nome', formData.nome);
        formDataToSend.append('valor', formData.valor);
        formDataToSend.append('dataVencimento', formData.dataVencimento);
        formDataToSend.append('fornecedor', formData.fornecedor);
        formDataToSend.append('observacao', formData.observacao);
        formDataToSend.append('tipoControle', formData.tipoControle);
        if (parseInt(formData.totalParcelas) > 1) {
          formDataToSend.append('totalParcelas', formData.totalParcelas);
          formDataToSend.append('parcelMode', formData.parcelMode);
        }
      }

      await api.post('/contas', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

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
      await api.post(`/contas/${contaSelecionada._id}/pagar`, pagamentoData);
      fetchContas();
      handleClosePagamento();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao pagar conta');
    }
  };

  const handleCancelar = (id) => {
    setContaToCancel(id);
    setOpenConfirmCancel(true);
  };

  const confirmCancel = async () => {
    if (contaToCancel) {
      try {
        const response = await api.delete(`/contas/${contaToCancel}`);
        
        // Verificar se há parcelas restantes
        if (response.data.hasRemainingInstallments) {
          setParcelasInfo({
            count: response.data.remainingCount,
            contaId: contaToCancel
          });
          setOpenConfirmParcelas(true);
          setOpenConfirmCancel(false);
        } else {
          await fetchContas();
          setOpenConfirmCancel(false);
          setContaToCancel(null);
        }
      } catch (err) {
        console.error('Erro ao cancelar conta:', err);
        setError('Erro ao cancelar conta');
      }
    }
  };

  const handleHardDelete = (id) => {
    setContaToHardDelete(id);
    setOpenConfirmHardDelete(true);
  };

  const confirmHardDelete = async () => {
    if (!contaToHardDelete) return;
    try {
      // Primeiro, verificar se há parcelas restantes
      const response = await api.delete(`/contas/${contaToHardDelete}`);
      
      // Verificar se há parcelas restantes
      if (response.data.hasRemainingInstallments) {
        setParcelasInfo({
          count: response.data.remainingCount,
          contaId: contaToHardDelete
        });
        setOpenConfirmParcelas(true);
        setOpenConfirmHardDelete(false);
      } else {
        // Se não tiver parcelas restantes, exclui permanentemente mesmo
        await api.delete(`/contas/${contaToHardDelete}/hard`);
        await fetchContas();
        setOpenConfirmHardDelete(false);
        setContaToHardDelete(null);
      }
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      setError('Erro ao excluir conta');
    }
  };

  // Função para excluir apenas esta parcela permanentemente
  const cancelarApenasEsta = async () => {
    try {
      await api.delete(`/contas/${parcelasInfo.contaId}/hard`);
      await fetchContas();
      setOpenConfirmParcelas(false);
      setParcelasInfo({ count: 0, contaId: null });
      setContaToHardDelete(null);
    } catch (err) {
      setError('Erro ao excluir parcela permanentemente');
    }
  };

  // Função para excluir todas as parcelas permanentemente
  const cancelarTodasParcelas = async () => {
    try {
      await api.delete(`/contas/${parcelasInfo.contaId}/hard-all-remaining`);
      await fetchContas();
      setOpenConfirmParcelas(false);
      setParcelasInfo({ count: 0, contaId: null });
      setContaToHardDelete(null);
    } catch (err) {
      setError('Erro ao excluir todas as parcelas');
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
            Vencimento: {format(new Date(conta.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
          </Typography>
        </Box>
        
        <Typography variant="h6" color="primary" fontWeight="bold">
          R$ {conta.valor.toFixed(2).replace('.', ',')}
        </Typography>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        {(conta.status === 'Pendente' || conta.status === 'Vencida') && isActive(conta) && (
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenPagamento(conta)}
            title="Pagar"
          >
            <PaymentIcon />
          </IconButton>
        )}
        {isActive(conta) && conta.status !== 'Pago' && conta.status !== 'Cancelada' && (
          <>
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleCancelar(conta._id)}
              title="Inativar (Cancelar)"
            >
              <DeleteIcon />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleHardDelete(conta._id)}
              title="Excluir permanentemente"
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
            title="Excluir permanentemente"
          >
            <DeleteForeverIcon />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Contas a Pagar</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCadastro}
          size="small"
        >
          Cadastrar Conta
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Mês</InputLabel>
              <Select value={mes} label="Mês" size="small" onChange={(e) => { setMes(parseInt(e.target.value)); }}>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i+1} value={i+1}>{i+1}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Ano</InputLabel>
              <Select value={ano} label="Ano" size="small" onChange={(e) => { setAno(parseInt(e.target.value)); }}>
                {Array.from({length:6}).map((_, idx) => {
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
            <Button variant="contained" color="primary" size="small" onClick={fetchContas}>Aplicar</Button>
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
          {contas.filter(conta => conta && conta.valor != null).map((conta) => (
            <ContaCard key={conta._id} conta={conta} />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                {contas.filter(conta => conta && conta.valor != null).map((conta) => (
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
                    {format(new Date(conta.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
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
                  <TableCell>
                      {(conta.status === 'Pendente' || conta.status === 'Vencida') && isActive(conta) && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenPagamento(conta)}
                          title="Pagar"
                        >
                          <PaymentIcon />
                        </IconButton>
                      )}
                      {isActive(conta) && conta.status !== 'Pago' && conta.status !== 'Cancelada' && (
                        <>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleCancelar(conta._id)}
                            title="Inativar (Cancelar)"
                          >
                            <DeleteIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleHardDelete(conta._id)}
                            title="Excluir permanentemente"
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
                          title="Excluir permanentemente"
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
      )}

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
      <Dialog open={openCadastro} onClose={handleCloseCadastro} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Cadastrar Conta</DialogTitle>
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
            <TextField
              fullWidth
              label="Número de Parcelas"
              type="number"
              margin="normal"
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
              inputProps={{ min: 1 }}
            />
            {parseInt(formData.totalParcelas) > 1 && (
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
                onChange={(e) => setFormData({ ...formData, tipoControle: e.target.value })}
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
      <Dialog open={openFornecedor} onClose={handleCloseFornecedor} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitFornecedor}>
          <DialogTitle>Cadastrar Fornecedor</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome"
              margin="normal"
              required
              value={fornecedorData.nome}
              onChange={(e) => setFornecedorData({ ...fornecedorData, nome: e.target.value })}
            />
            <TextField
              fullWidth
              label="Tipo"
              margin="normal"
              required
              value={fornecedorData.tipo}
              onChange={(e) => setFornecedorData({ ...fornecedorData, tipo: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFornecedor}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Confirmar Cancelamento */}
      <Dialog open={openConfirmCancel} onClose={() => setOpenConfirmCancel(false)}>
        <DialogTitle>Confirmar Cancelamento</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja cancelar esta conta?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmCancel(false)}>Não</Button>
          <Button onClick={confirmCancel} variant="contained" color="error">
            Sim, Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Cancelamento de Parcelas */}
      <Dialog open={openConfirmParcelas} onClose={() => setOpenConfirmParcelas(false)}>
        <DialogTitle>Excluir Parcelas em Aberto</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, textAlign: 'left' }}>
            Existem <strong>{parcelasInfo.count}</strong> parcela(s) restante(s) deste grupo.
          </Typography>
          <Typography>
            Como você deseja proceder com a **exclusão permanente**?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={cancelarApenasEsta}
            variant="outlined"
            color="primary"
          >
            Apenas esta parcela
          </Button>
          <Button 
            onClick={cancelarTodasParcelas}
            variant="contained"
            color="error"
          >
            Excluir todas as parcelas
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
  );
};

export default ContasPagar;

