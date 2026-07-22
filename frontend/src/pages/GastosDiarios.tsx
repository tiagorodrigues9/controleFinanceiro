import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  TablePagination,
  ThemeProvider,
  createTheme,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import api from '../utils/api';
import { useAbortController } from '../hooks/useAbortController';
import { isRequestCancelled, getRequestErrorMessage } from '../utils/requestUtils';

// Tema Premium Indigo/Emerald
const gastosTheme = createTheme({
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

interface GastoItem {
  _id: string;
  data: string;
  contaBancaria?: { _id: string; nome: string };
  cartao?: { _id: string; nome: string; banco: string };
  formaPagamento: string;
  tipoDespesa: {
    grupo: { _id: string; nome: string };
    subgrupo: string;
  };
  local: string;
  observacao: string;
  valor: number;
}

interface Filtros {
  tipoDespesa: string;
  subgrupo: string;
  formaPagamento: string;
  dataInicio: string;
  dataFim: string;
}

const ROWS_PER_PAGE = 50;

const getHojeUTCStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const GastosDiarios: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCadastro, setOpenCadastro] = useState(false);
  
  const [filtros, setFiltros] = useState<Filtros>({
    tipoDespesa: '',
    subgrupo: '',
    formaPagamento: '',
    dataInicio: '',
    dataFim: '',
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros | null>(null);

  const [formData, setFormData] = useState({
    _id: '',
    tipoDespesa: { grupo: '', subgrupo: '' },
    valor: '',
    data: getHojeUTCStr(),
    local: '',
    observacao: '',
    formaPagamento: '',
    contaBancaria: '',
    cartao: '',
    parcelas: '1',
  });
  
  const [error, setError] = useState('');
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [gastoToDelete, setGastoToDelete] = useState<GastoItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalHoje, setTotalHoje] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { getSignal: getGastosSignal } = useAbortController();
  const { getSignal: getAuxSignal } = useAbortController();
  const filtrosReady = useRef(false);

  useEffect(() => {
    const hoje = new Date();
    const cincoDiasAtras = new Date(hoje);
    cincoDiasAtras.setDate(hoje.getDate() - 5);

    const dataFimStr = getHojeUTCStr();
    const dataInicioStr = `${cincoDiasAtras.getFullYear()}-${String(cincoDiasAtras.getMonth() + 1).padStart(2, '0')}-${String(cincoDiasAtras.getDate()).padStart(2, '0')}`;

    const inicialFiltros = {
      tipoDespesa: '',
      subgrupo: '',
      formaPagamento: '',
      dataInicio: dataInicioStr,
      dataFim: dataFimStr,
    };
    
    setFiltros(inicialFiltros);
    setFiltrosAplicados(inicialFiltros);
    filtrosReady.current = true;
  }, []);

  useEffect(() => {
    const signal = getAuxSignal();
    const loadAux = async () => {
      try {
        const [gruposRes, contasRes, formasRes, cartoesRes] = await Promise.all([
          api.get('/grupos', { signal }),
          api.get('/contas-bancarias', { signal }),
          api.get('/formas-pagamento', { signal }),
          api.get('/cartoes', { signal }),
        ]);
        setGrupos(gruposRes.data);
        setContasBancarias(contasRes.data.filter((c: any) => c.ativo !== false));
        setFormasPagamento(formasRes.data);
        setCartoes(cartoesRes.data.filter((c: any) => c.ativo !== false));
      } catch (err: any) {
        if (!isRequestCancelled(err)) {
          console.error('Erro ao carregar dados auxiliares:', err);
        }
      }
    };
    loadAux();
  }, [getAuxSignal]);

  const fetchGastosComFiltros = useCallback(async (filtrosParaUsar: Filtros, pageIndex = 0) => {
    if (!filtrosParaUsar.dataInicio || !filtrosParaUsar.dataFim) return;

    const signal = getGastosSignal();
    try {
      setLoading(true);
      setError('');

      const params: any = {
        page: pageIndex + 1,
        limit: ROWS_PER_PAGE,
      };
      if (filtrosParaUsar.tipoDespesa) params.tipoDespesa = filtrosParaUsar.tipoDespesa;
      if (filtrosParaUsar.subgrupo) params.subgrupo = filtrosParaUsar.subgrupo;
      if (filtrosParaUsar.formaPagamento) params.formaPagamento = filtrosParaUsar.formaPagamento;
      if (filtrosParaUsar.dataInicio) params.dataInicio = filtrosParaUsar.dataInicio;
      if (filtrosParaUsar.dataFim) params.dataFim = filtrosParaUsar.dataFim;

      const response = await api.get('/gastos', { params, signal });
      setGastos(response.data.items || []);
      setTotalCount(response.data.total ?? 0);
    } catch (err: any) {
      if (!isRequestCancelled(err)) {
        setError(getRequestErrorMessage(err, 'Erro ao carregar gastos'));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [getGastosSignal]);

  useEffect(() => {
    if (!filtrosReady.current || !filtrosAplicados || !filtrosAplicados.dataInicio) return;
    fetchGastosComFiltros(filtrosAplicados, page);
  }, [filtrosAplicados, page, fetchGastosComFiltros]);

  const fetchTotalHoje = useCallback(async () => {
    try {
      const hojeStr = getHojeUTCStr();
      const params = { dataInicio: hojeStr, dataFim: hojeStr, limit: 1000 };
      const response = await api.get('/gastos', { params });
      const soma = response.data.items.reduce((acc: any, g: any) => acc + g.valor, 0);
      setTotalHoje(soma);
    } catch (err) {
      console.error('Erro ao carregar total de hoje', err);
    }
  }, []);

  useEffect(() => {
    fetchTotalHoje();
  }, [fetchTotalHoje]);

  const aplicarFiltros = () => {
    setPage(0);
    setFiltrosAplicados({ ...filtros });
  };

  const limparFiltros = () => {
    const empty: Filtros = {
      tipoDespesa: '',
      subgrupo: '',
      formaPagamento: '',
      dataInicio: '',
      dataFim: '',
    };
    setFiltros(empty);
    setFiltrosAplicados(null);
    setPage(0);
    setGastos([]);
    setTotalCount(0);
  };

  const handleOpenCadastro = () => {
    setFormData({
      _id: '',
      tipoDespesa: { grupo: '', subgrupo: '' },
      valor: '',
      data: getHojeUTCStr(),
      local: '',
      observacao: '',
      formaPagamento: '',
      contaBancaria: '',
      cartao: '',
      parcelas: '1',
    });
    setOpenCadastro(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (formData._id) {
        await api.put(`/gastos/${formData._id}`, formData);
      } else {
        await api.post('/gastos', formData);
      }
      setOpenCadastro(false);
      fetchTotalHoje(); // Atualiza total do dia
      if (filtrosAplicados) {
        fetchGastosComFiltros(filtrosAplicados, page);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erro ao salvar gasto';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!gastoToDelete) return;
    try {
      await api.delete(`/gastos/${gastoToDelete._id}`);
      setOpenDeleteConfirm(false);
      setGastoToDelete(null);
      fetchTotalHoje(); // Atualiza total do dia
      if (filtrosAplicados) {
        fetchGastosComFiltros(filtrosAplicados, page);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir gasto');
    }
  };

  const handleEditar = (gasto: GastoItem) => {
    setFormData({
      _id: gasto._id,
      tipoDespesa: { 
        grupo: gasto.tipoDespesa.grupo._id, 
        subgrupo: gasto.tipoDespesa.subgrupo || '' 
      },
      valor: gasto.valor.toString(),
      data: gasto.data.split('T')[0],
      local: gasto.local || '',
      observacao: gasto.observacao || '',
      formaPagamento: gasto.formaPagamento,
      contaBancaria: gasto.contaBancaria?._id || '',
      cartao: gasto.cartao?._id || '',
      parcelas: '1', // Edição não permite alterar parcelas
    });
    setOpenCadastro(true);
  };

  // Funções UI
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDateUTC = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const getSubgruposOptions = (grupoId: string) => {
    const grupo = grupos.find(g => g._id === grupoId);
    return grupo ? grupo.subgrupos : [];
  };

  return (
    <ThemeProvider theme={gastosTheme}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={3} gap={2}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalAtmIcon color="primary" fontSize="large" /> Gastos Diários
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCadastro}>
            Novo Lançamento
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, bgcolor: '#f8fafc' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Grupo</InputLabel>
                <Select
                  value={filtros.tipoDespesa}
                  onChange={(e) => setFiltros({ ...filtros, tipoDespesa: e.target.value, subgrupo: '' })}
                  label="Grupo"
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
              <FormControl fullWidth variant="outlined" size="small" disabled={!filtros.tipoDespesa}>
                <InputLabel>Subgrupo</InputLabel>
                <Select
                  value={filtros.subgrupo}
                  onChange={(e) => setFiltros({ ...filtros, subgrupo: e.target.value })}
                  label="Subgrupo"
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {getSubgruposOptions(filtros.tipoDespesa).map((sub: any, i: number) => (
                    <MenuItem key={i} value={sub.nome}>{sub.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Forma Pagamento</InputLabel>
                <Select
                  value={filtros.formaPagamento}
                  onChange={(e) => setFiltros({ ...filtros, formaPagamento: e.target.value })}
                  label="Forma Pagamento"
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {formasPagamento.map((fp) => (
                    <MenuItem key={fp._id} value={fp.nome}>{fp.nome}</MenuItem>
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
            <Grid item xs={12} md="auto">
              <Box display="flex" gap={1} alignItems="center">
                <Button variant="contained" startIcon={<SearchIcon />} onClick={aplicarFiltros} size="small" sx={{ height: '40px' }}>
                  Aplicar
                </Button>
                <Button variant="outlined" onClick={limparFiltros} size="small" color="inherit" sx={{ minWidth: '40px', width: '40px', height: '40px', p: 0 }} title="Limpar Filtros">
                  <ClearIcon fontSize="small" />
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>
        ) : isMobile ? (
          <Box>
            {gastos.map((gasto) => (
              <Card key={gasto._id} sx={{ mb: 2, borderRadius: 3 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ flexGrow: 1 }}>{gasto.local || gasto.tipoDespesa.grupo.nome}</Typography>
                    <Box display="flex" flexDirection="column" alignItems="flex-end">
                      <Chip label={gasto.formaPagamento} size="small" sx={{ bgcolor: gasto.formaPagamento === 'Cartão de Crédito' ? 'secondary.light' : 'primary.light', color: gasto.formaPagamento === 'Cartão de Crédito' ? 'secondary.contrastText' : 'primary.contrastText', fontWeight: 'bold' }} />
                      {gasto.cartao && <Typography variant="caption" color="text.secondary">{gasto.cartao.nome}</Typography>}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">Data: {formatDateUTC(gasto.data)}</Typography>
                  <Typography variant="body2" color="text.secondary">Sub: {gasto.tipoDespesa.subgrupo}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>Obs: {gasto.observacao || '-'}</Typography>
                  <Typography variant="h6" color="error.main" fontWeight="bold" mt={1}>
                    - {formatCurrency(gasto.valor)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <IconButton size="small" color="primary" onClick={() => handleEditar(gasto)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => { setGastoToDelete(gasto); setOpenDeleteConfirm(true); }}>
                    <DeleteIcon />
                  </IconButton>
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
                    <TableCell sx={{ fontWeight: 'bold' }}>Grupo</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Local/Origem</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Forma Pagamento</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Observação</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gastos.map((gasto) => (
                    <TableRow key={gasto._id} hover>
                      <TableCell>{formatDateUTC(gasto.data)}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{gasto.tipoDespesa.grupo?.nome}</Typography>
                          <Typography variant="caption" color="text.secondary">{gasto.tipoDespesa.subgrupo}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{gasto.local}</TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
                          <Chip label={gasto.formaPagamento} size="small" sx={{ bgcolor: gasto.formaPagamento === 'Cartão de Crédito' ? 'secondary.light' : 'primary.light', color: gasto.formaPagamento === 'Cartão de Crédito' ? 'secondary.contrastText' : 'primary.contrastText' }} />
                          {gasto.cartao && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{gasto.cartao.nome}</Typography>}
                        </Box>
                      </TableCell>
                      <TableCell>{gasto.observacao || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography color="error.main" fontWeight="bold">
                          - {formatCurrency(gasto.valor)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleEditar(gasto)} title="Editar Lançamento">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => { setGastoToDelete(gasto); setOpenDeleteConfirm(true); }} title="Excluir Lançamento">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {gastos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Nenhum gasto encontrado.</Typography></TableCell>
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

        {/* Dialog Novo Gasto */}
        <Dialog open={openCadastro} onClose={() => setOpenCadastro(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>{formData._id ? 'Editar Lançamento' : 'Novo Gasto'}</DialogTitle>
            <DialogContent>
              {formData._id && formData.observacao.match(/\(\d+\/\d+\)/) && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Atenção: Este lançamento parece ser parte de um parcelamento. A edição deste registro não alterará automaticamente as outras parcelas.
                </Alert>
              )}
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Grupo</InputLabel>
                    <Select value={formData.tipoDespesa.grupo} onChange={(e) => setFormData({ ...formData, tipoDespesa: { grupo: e.target.value, subgrupo: '' } })} label="Grupo">
                      {grupos.map((grupo) => (
                        <MenuItem key={grupo._id} value={grupo._id}>{grupo.nome}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required variant="outlined" disabled={!formData.tipoDespesa.grupo}>
                    <InputLabel>Subgrupo</InputLabel>
                    <Select value={formData.tipoDespesa.subgrupo} onChange={(e) => setFormData({ ...formData, tipoDespesa: { ...formData.tipoDespesa, subgrupo: e.target.value } })} label="Subgrupo">
                      {getSubgruposOptions(formData.tipoDespesa.grupo).map((sub: any, i: number) => (
                        <MenuItem key={i} value={sub.nome}>{sub.nome}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Forma de Pagamento</InputLabel>
                    <Select value={formData.formaPagamento} onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value, cartao: '', contaBancaria: '', parcelas: '1' })} label="Forma de Pagamento">
                      {formasPagamento.map((fp) => (
                        <MenuItem key={fp._id} value={fp.nome}>{fp.nome}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {(formData.formaPagamento === 'Cartão de Crédito' || formData.formaPagamento === 'Cartão de Débito') && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required variant="outlined">
                      <InputLabel>Cartão</InputLabel>
                      <Select value={formData.cartao} onChange={(e) => setFormData({ ...formData, cartao: e.target.value })} label="Cartão">
                        {cartoes.filter(c => c.tipo === (formData.formaPagamento === 'Cartão de Crédito' ? 'Crédito' : 'Débito') || c.tipo === 'Múltiplo').map((cartao) => (
                          <MenuItem key={cartao._id} value={cartao._id}>{cartao.nome} - {cartao.banco}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {formData.formaPagamento !== 'Cartão de Crédito' && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required variant="outlined">
                      <InputLabel>Conta Bancária (Origem)</InputLabel>
                      <Select value={formData.contaBancaria} onChange={(e) => setFormData({ ...formData, contaBancaria: e.target.value })} label="Conta Bancária (Origem)">
                        {contasBancarias.map((conta) => (
                          <MenuItem key={conta._id} value={conta._id}>{conta.nome} - {conta.banco}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Valor Total (R$)" type="number" inputProps={{ step: "0.01" }} value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} required />
                </Grid>

                {formData.formaPagamento === 'Cartão de Crédito' && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required variant="outlined">
                      <InputLabel>Parcelas</InputLabel>
                      <Select value={formData.parcelas} disabled={!!formData._id} onChange={(e) => setFormData({ ...formData, parcelas: e.target.value })} label="Parcelas">
                        <MenuItem value="1">À vista (1x)</MenuItem>
                        {[2,3,4,5,6,7,8,9,10,11,12,18,24].map(num => (
                          <MenuItem key={num} value={num.toString()}>{num}x Parcelado</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} sm={formData.formaPagamento === 'Cartão de Crédito' ? 12 : 6}>
                  <TextField fullWidth label="Data da Compra" type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} required InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Local / Estabelecimento" value={formData.local} onChange={(e) => setFormData({ ...formData, local: e.target.value })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Observação (Opcional)" value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={() => setOpenCadastro(false)} color="inherit" disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Gasto'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog Confirmar Exclusão */}
        <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja apagar este gasto?
              {gastoToDelete?.formaPagamento === 'Cartão de Crédito' && " Se for parte de um parcelamento, apenas esta parcela será apagada da fatura."}
              {gastoToDelete?.formaPagamento !== 'Cartão de Crédito' && " O valor será devolvido à conta bancária associada via estorno."}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setOpenDeleteConfirm(false)} color="inherit">Cancelar</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">Excluir Gasto</Button>
          </DialogActions>
        </Dialog>

        {/* Card do Total Gasto Hoje */}
        {totalHoje !== null && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'error.50', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 3, border: '1px solid #fee2e2' }}>
            <Typography variant="h6" color="error.main" fontWeight="bold">
              Total Gasto Hoje: {formatCurrency(totalHoje)}
            </Typography>
          </Box>
        )}

      </Box>
    </ThemeProvider>
  );
};

export default GastosDiarios;
