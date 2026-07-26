import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Grid,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  TablePagination,
  ThemeProvider,
  createTheme,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import api from '../utils/api';
import { useAbortController } from '../hooks/useAbortController';
import { isRequestCancelled, getRequestErrorMessage } from '../utils/requestUtils';

// Tema Premium Indigo/Emerald
const extratoTheme = createTheme({
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

interface ExtratoItem {
  _id: string;
  data: string;
  contaBancaria?: { _id: string; nome: string; banco: string };
  cartao?: { _id: string; nome: string; banco: string; tipo: string };
  tipo: 'Entrada' | 'Saída' | 'Saldo Inicial';
  motivo: string;
  valor: number;
  estornado: boolean;
  referencia?: {
    tipo: 'Conta' | 'Gasto' | 'Lancamento' | 'Saldo Inicial' | 'Transferencia' | 'Estorno' | 'FaturaCartao';
    id?: string;
  };
}

interface Filtros {
  contaBancaria: string;
  tipoDespesa: string;
  cartao: string;
  dataInicio: string;
  dataFim: string;
}

const ROWS_PER_PAGE = 50;

const getHojeUTCStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Extrato: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const [extratos, setExtratos] = useState<ExtratoItem[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openLancamento, setOpenLancamento] = useState(false);
  const [openSaldoInicial, setOpenSaldoInicial] = useState(false);
  
  const [filtros, setFiltros] = useState<Filtros>({
    contaBancaria: '',
    tipoDespesa: '',
    cartao: '',
    dataInicio: '',
    dataFim: '',
  });

  const [formData, setFormData] = useState({
    contaBancaria: '',
    tipo: 'Saída',
    valor: '',
    data: getHojeUTCStr(),
    motivo: '',
  });

  const [openConfirmEstorno, setOpenConfirmEstorno] = useState(false);
  const [estornoId, setEstornoId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros | null>(null);
  const { getSignal: getExtratoSignal } = useAbortController();
  const { getSignal: getAuxSignal } = useAbortController();
  const filtrosReady = useRef(false);

  useEffect(() => {
    const hoje = new Date();
    const params = new URLSearchParams(location.search);
    const contaParam = params.get('conta') || '';

    const diasAtras = contaParam ? 30 : 5;
    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - diasAtras);

    const inicialFiltros: Filtros = {
      contaBancaria: contaParam,
      tipoDespesa: '',
      cartao: '',
      dataInicio: `${dataInicio.getFullYear()}-${String(dataInicio.getMonth() + 1).padStart(2, '0')}-${String(dataInicio.getDate()).padStart(2, '0')}`,
      dataFim: getHojeUTCStr(),
    };
    setFiltros(inicialFiltros);
    setFiltrosAplicados(inicialFiltros);
    filtrosReady.current = true;
  }, [location.search]);

  useEffect(() => {
    const signal = getAuxSignal();
    const loadAux = async () => {
      try {
        const [contasRes, gruposRes, cartoesRes] = await Promise.all([
          api.get('/contas-bancarias', { signal }),
          api.get('/grupos', { signal }),
          api.get('/cartoes', { signal }),
        ]);
        setContasBancarias(contasRes.data);
        setGrupos(gruposRes.data);
        setCartoes(cartoesRes.data.filter((cartao: any) => cartao.ativo));
      } catch (err: any) {
        if (!isRequestCancelled(err)) {
          console.error('Erro ao carregar dados auxiliares do extrato:', err);
        }
      }
    };
    loadAux();
  }, [getAuxSignal]);

  const fetchExtratosComFiltros = useCallback(async (filtrosParaUsar: Filtros, pageIndex: number = 0) => {
    if (!filtrosParaUsar.dataInicio || !filtrosParaUsar.dataFim) return;

    const signal = getExtratoSignal();
    try {
      setLoading(true);
      setError('');

      const params: any = {
        page: pageIndex + 1,
        limit: ROWS_PER_PAGE,
      };
      if (filtrosParaUsar.contaBancaria) params.contaBancaria = filtrosParaUsar.contaBancaria;
      if (filtrosParaUsar.tipoDespesa) params.tipoDespesa = filtrosParaUsar.tipoDespesa;
      if (filtrosParaUsar.cartao) params.cartao = filtrosParaUsar.cartao;
      if (filtrosParaUsar.dataInicio) params.dataInicio = filtrosParaUsar.dataInicio;
      if (filtrosParaUsar.dataFim) params.dataFim = filtrosParaUsar.dataFim;

      const response = await api.get('/extrato', { params, signal });
      setExtratos(response.data.extratos || []);
      setTotalCount(response.data.total ?? 0);
      setTotalSaldo(response.data.totalSaldo || 0);
      setTotalEntradas(response.data.totalEntradas || 0);
      setTotalSaidas(response.data.totalSaidas || 0);
    } catch (err: any) {
      if (!isRequestCancelled(err)) {
        setError(getRequestErrorMessage(err, 'Erro ao carregar extrato'));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [getExtratoSignal]);

  useEffect(() => {
    if (!filtrosReady.current || !filtrosAplicados || !filtrosAplicados.dataInicio) return;
    fetchExtratosComFiltros(filtrosAplicados, page);
  }, [filtrosAplicados, page, fetchExtratosComFiltros]);

  const aplicarFiltros = () => {
    setPage(0);
    setFiltrosAplicados({ ...filtros });
  };

  const handleOpenLancamento = () => {
    setFormData({
      contaBancaria: '',
      tipo: 'Saída',
      valor: '',
      data: getHojeUTCStr(),
      motivo: '',
    });
    setOpenLancamento(true);
  };

  const handleSubmitLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/extrato', formData);
      const novoExtrato = response.data;
      
      setExtratos(prevExtratos => {
        const atualizados = [novoExtrato, ...prevExtratos];
        return atualizados.filter(extrato => {
          if (filtros.contaBancaria && extrato.contaBancaria?._id !== filtros.contaBancaria) return false;
          if (filtros.cartao && extrato.cartao?._id !== filtros.cartao) return false;
          return true;
        });
      });
      
      if (novoExtrato.tipo === 'Entrada' || novoExtrato.tipo === 'Saldo Inicial') {
        setTotalEntradas(prev => prev + novoExtrato.valor);
      } else {
        setTotalSaidas(prev => prev + novoExtrato.valor);
      }
      
      setOpenLancamento(false);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar lançamento');
    }
  };

  const isFaturaCartao = (extrato: ExtratoItem) => extrato.referencia?.tipo === 'FaturaCartao';

  const handleEstornar = (extrato: ExtratoItem) => {
    if (isFaturaCartao(extrato)) {
      setError('Estorno Bloqueado: Este lançamento provém do fechamento de uma Fatura. Acesse a tela de Cartões para realizar o estorno seguro.');
      return;
    }
    setEstornoId(extrato._id);
    setOpenConfirmEstorno(true);
  };

  const limparFiltros = () => {
    const empty: Filtros = {
      contaBancaria: '',
      tipoDespesa: '',
      cartao: '',
      dataInicio: '',
      dataFim: '',
    };
    setFiltros(empty);
    setFiltrosAplicados(null);
    setPage(0);
    setExtratos([]);
    setTotalCount(0);
    setTotalEntradas(0);
    setTotalSaidas(0);
  };

  const confirmEstorno = async () => {
    if (!estornoId) return;
    try {
      await api.post(`/extrato/${estornoId}/estornar`);
      
      setExtratos(prevExtratos => prevExtratos.filter(extrato => extrato._id !== estornoId));
      
      const extratoEstornado = extratos.find(extrato => extrato._id === estornoId);
      if (extratoEstornado) {
        if (extratoEstornado.tipo === 'Entrada' || extratoEstornado.tipo === 'Saldo Inicial') {
          setTotalEntradas(prev => prev - extratoEstornado.valor);
        } else {
          setTotalSaidas(prev => prev - extratoEstornado.valor);
        }
      }
      
      setOpenConfirmEstorno(false);
      setEstornoId(null);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao estornar lançamento');
    }
  };

  const handleExportar = async (formato: string) => {
    try {
      const params: any = { formato };
      if (filtros.contaBancaria) params.contaBancaria = filtros.contaBancaria;
      
      if (filtros.dataInicio && filtros.dataFim) {
        const date = new Date(filtros.dataFim);
        params.mes = date.getMonth() + 1;
        params.ano = date.getFullYear();
      }
      
      const response = await api.get('/exportar/extrato', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `extrato.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar arquivo');
    }
  };

  // Funções Utilitárias de UI
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDateUTC = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const ReferenceChip = ({ extrato }: { extrato: ExtratoItem }) => {
    const tipoRef = extrato.referencia?.tipo || 'Lancamento';
    
    if (tipoRef === 'FaturaCartao') {
      return <Chip label="Fatura" size="small" sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText', fontWeight: 'bold' }} />;
    } else if (tipoRef === 'Conta' || tipoRef === 'Gasto') {
      return <Chip label="Automático" size="small" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }} />;
    } else {
      return <Chip label="Manual" size="small" variant="outlined" />;
    }
  };

  return (
    <ThemeProvider theme={extratoTheme}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={3} gap={2}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceWalletIcon color="primary" fontSize="large" /> Extrato Financeiro
          </Typography>
          
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1}>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => handleExportar('pdf')} size="small" color="error">
              PDF
            </Button>
            <Button variant="outlined" startIcon={<GridOnIcon />} onClick={() => handleExportar('excel')} size="small" color="success">
              Excel
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenLancamento} size="small">
              Lançamento
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, bgcolor: '#f8fafc' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Conta Bancária</InputLabel>
                <Select
                  value={filtros.contaBancaria}
                  onChange={(e) => setFiltros({ ...filtros, contaBancaria: e.target.value })}
                  label="Conta Bancária"
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {contasBancarias.map((conta) => (
                    <MenuItem key={conta._id} value={conta._id}>{conta.nome} - {conta.banco}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Tipo de Despesa</InputLabel>
                <Select
                  value={filtros.tipoDespesa}
                  onChange={(e) => setFiltros({ ...filtros, tipoDespesa: e.target.value })}
                  label="Tipo de Despesa"
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {grupos.map((grupo) => (
                    <MenuItem key={grupo._id} value={grupo._id}>{grupo.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Cartão</InputLabel>
                <Select
                  value={filtros.cartao}
                  onChange={(e) => setFiltros({ ...filtros, cartao: e.target.value })}
                  label="Cartão"
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {cartoes.map((cartao) => (
                    <MenuItem key={cartao._id} value={cartao._id}>{cartao.nome} - {cartao.banco}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth label="Início" type="date"
                value={filtros.dataInicio} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                variant="outlined" size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth label="Fim" type="date"
                value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                variant="outlined" size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" color="primary" size="small" onClick={aplicarFiltros}>Aplicar</Button>
              <Button variant="contained" color="primary" size="small" sx={{ ml: 1 }} onClick={limparFiltros}>Limpar</Button>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>
        ) : isMobile ? (
          <Box>
            {extratos.map((extrato) => (
              <Card key={extrato._id} sx={{ mb: 2, borderRadius: 3 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ flexGrow: 1 }}>{extrato.motivo || 'Sem motivo'}</Typography>
                    <ReferenceChip extrato={extrato} />
                  </Box>
                  <Box mb={1}>
                    <Typography variant="body2" color="text.secondary">Data: {formatDateUTC(extrato.data)}</Typography>
                    <Typography variant="body2" color="text.secondary">Conta: {extrato.contaBancaria?.nome || 'N/A'}</Typography>
                  </Box>
                  <Typography variant="h6" color={extrato.tipo === 'Saída' ? 'error.main' : 'success.main'} fontWeight="bold">
                    {extrato.tipo === 'Saída' ? '-' : '+'} {formatCurrency(extrato.valor)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  {extrato.tipo !== 'Saldo Inicial' && !extrato.estornado && (
                    <IconButton size="small" disabled={isFaturaCartao(extrato)} color={isFaturaCartao(extrato) ? 'default' : 'warning'} onClick={() => handleEstornar(extrato)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Conta Bancária</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Origem</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Motivo</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {extratos.map((extrato) => (
                    <TableRow key={extrato._id} hover>
                      <TableCell>{formatDateUTC(extrato.data)}</TableCell>
                      <TableCell>{extrato.contaBancaria?.nome || 'N/A'}</TableCell>
                      <TableCell><ReferenceChip extrato={extrato} /></TableCell>
                      <TableCell>{extrato.motivo || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography color={extrato.tipo === 'Saída' ? 'error.main' : 'success.main'} fontWeight="bold">
                          {extrato.tipo === 'Saída' ? '-' : '+'} {formatCurrency(extrato.valor)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {extrato.tipo !== 'Saldo Inicial' && !extrato.estornado && (
                          <Tooltip title={isFaturaCartao(extrato) ? "Faturas devem ser estornadas na aba Cartões" : "Estornar lançamento"}>
                            <span>
                              <IconButton size="small" disabled={isFaturaCartao(extrato)} color={isFaturaCartao(extrato) ? 'default' : 'warning'} onClick={() => handleEstornar(extrato)}>
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {extratos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Nenhum lançamento encontrado neste período.</Typography></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={ROWS_PER_PAGE}
              rowsPerPageOptions={[ROWS_PER_PAGE]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
            />
          </Paper>
        )}

        <Grid container spacing={2} mt={1} mb={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Entradas</Typography>
                <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, fontWeight: 'bold' }}>{formatCurrency(totalEntradas)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Saídas</Typography>
                <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, fontWeight: 'bold' }}>{formatCurrency(totalSaidas)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Saldo do Período</Typography>
                <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, fontWeight: 'bold' }}>{formatCurrency(totalEntradas - totalSaidas)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Dialog Lançamento */}
        <Dialog open={openLancamento} onClose={() => setOpenLancamento(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <form onSubmit={handleSubmitLancamento}>
            <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>Novo Lançamento</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Conta Bancária</InputLabel>
                    <Select value={formData.contaBancaria} onChange={(e) => setFormData({ ...formData, contaBancaria: e.target.value })} label="Conta Bancária">
                      {contasBancarias.map((conta) => (
                        <MenuItem key={conta._id} value={conta._id}>{conta.nome} - {conta.banco}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Tipo</InputLabel>
                    <Select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} label="Tipo">
                      <MenuItem value="Entrada">Entrada</MenuItem>
                      <MenuItem value="Saída">Saída</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Valor (R$)" type="number" inputProps={{ step: "0.01" }} value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Data" type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} required InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Motivo" value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} required />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={() => setOpenLancamento(false)} color="inherit">Cancelar</Button>
              <Button type="submit" variant="contained">Lançar</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog Confirmar Estorno */}
        <Dialog open={openConfirmEstorno} onClose={() => setOpenConfirmEstorno(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle>Confirmar Estorno</DialogTitle>
          <DialogContent>
            <Typography>Tem certeza que deseja estornar este lançamento? A ação reverterá o valor da conta.</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setOpenConfirmEstorno(false)} color="inherit">Cancelar</Button>
            <Button onClick={confirmEstorno} color="error" variant="contained">Confirmar Estorno</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
};

export default Extrato;
