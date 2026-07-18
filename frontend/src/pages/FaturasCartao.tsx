import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  ThemeProvider,
  createTheme,
  Avatar,
  IconButton,
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Payment as PaymentIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  Fastfood as FastfoodIcon,
  Replay as ReplayIcon
} from '@mui/icons-material';
import api from '../utils/api';

// Tema Premium Indigo/Emerald
const faturasTheme = createTheme({
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
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 6px -1px rgba(99,102,241,0.2)',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
  },
});

interface Cartao {
  _id: string;
  nome: string;
  banco: string;
}

interface ContaBancaria {
  _id: string;
  nome: string;
  banco: string;
}

interface Despesa {
  _id: string;
  descricao: string;
  valor: number;
  data: string;
  isGastoDiario: boolean;
}

interface Fatura {
  _id: string;
  mesReferencia: string;
  status: 'Aberta' | 'Fechada' | 'Paga';
  valorTotal: number;
  dataVencimento: string;
  dataFechamento: string;
  dataPagamento?: string;
  cartao: Cartao;
  despesas: Despesa[];
}

const FaturasCartao: React.FC = () => {
  const isMobile = useMediaQuery(faturasTheme.breakpoints.down('sm'));

  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  
  const [selectedCartao, setSelectedCartao] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);
  const [contaBancariaPagamento, setContaBancariaPagamento] = useState('');
  const [loadingPagamento, setLoadingPagamento] = useState(false);
  
  const [openEstornoDialog, setOpenEstornoDialog] = useState(false);
  const [loadingEstorno, setLoadingEstorno] = useState(false);
  
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchDados = useCallback(async () => {
    try {
      const [cartoesRes, contasRes] = await Promise.all([
        api.get('/cartoes'),
        api.get('/contas-bancarias')
      ]);
      setCartoes(cartoesRes.data);
      setContasBancarias(contasRes.data);
      if (cartoesRes.data.length > 0) {
        setSelectedCartao(cartoesRes.data[0]._id);
      }
    } catch {
      setError('Erro ao carregar dados básicos');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFaturas = useCallback(async () => {
    if (!selectedCartao) return;
    try {
      setLoading(true);
      const response = await api.get('/fatura-cartao', {
        params: { cartao: selectedCartao }
      });
      setFaturas(response.data);
    } catch {
      setError('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }, [selectedCartao]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  useEffect(() => {
    if (selectedCartao) {
      fetchFaturas();
    }
  }, [selectedCartao, fetchFaturas]);

  const handlePagarFatura = (fatura: Fatura) => {
    setSelectedFatura(fatura);
    setContaBancariaPagamento('');
    setOpenDialog(true);
    setError('');
  };

  const confirmarPagamento = async () => {
    if (!selectedFatura || !contaBancariaPagamento) return;
    try {
      setLoadingPagamento(true);
      await api.post(`/fatura-cartao/${selectedFatura._id}/pagar`, {
        contaBancaria: contaBancariaPagamento
      });
      setSuccess('Fatura paga e saldo bancário debitado com sucesso!');
      await fetchFaturas();
      setOpenDialog(false);
      setSelectedFatura(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao pagar fatura');
    } finally {
      setLoadingPagamento(false);
    }
  };

  const handleEstornarFatura = (fatura: Fatura) => {
    setSelectedFatura(fatura);
    setOpenEstornoDialog(true);
    setError('');
  };

  const confirmarEstorno = async () => {
    if (!selectedFatura) return;
    try {
      setLoadingEstorno(true);
      await api.post(`/fatura-cartao/${selectedFatura._id}/estornar`);
      setSuccess('Fatura estornada e saldo devolvido com sucesso!');
      await fetchFaturas();
      setOpenEstornoDialog(false);
      setSelectedFatura(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao estornar fatura');
    } finally {
      setLoadingEstorno(false);
    }
  };

  const handleVerDetalhes = (fatura: Fatura) => {
    setSelectedFatura(fatura);
    setDetailsOpen(true);
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const getStatusProps = (status: string) => {
    switch (status) {
      case 'Aberta': return { color: 'primary' as const, label: 'Aberta' };
      case 'Fechada': return { color: 'warning' as const, label: 'Fechada' };
      case 'Paga': return { color: 'success' as const, label: 'Paga' };
      default: return { color: 'default' as const, label: status };
    }
  };

  if (loading && !faturas.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={faturasTheme}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
          <Typography variant="h4">Faturas do Cartão</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Filtro por Cartão */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
          <Box display="flex" alignItems="center" gap={1} justifyContent={{ xs: 'center', sm: 'flex-start' }}>
            <CreditCardIcon color="primary" />
            <Typography variant="body2" sx={{ display: { sm: 'none' }, fontWeight: 'bold' }}>Filtrar por Cartão</Typography>
          </Box>
          <FormControl sx={{ flex: 1 }} size="small">
            <InputLabel>Selecione o Cartão</InputLabel>
            <Select
              value={selectedCartao}
              onChange={(e) => setSelectedCartao(e.target.value as string)}
              label="Selecione o Cartão"
            >
              {cartoes.map((cartao) => (
                <MenuItem key={cartao._id} value={cartao._id}>
                  {cartao.nome} - {cartao.banco}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Lista de Faturas */}
        {!faturas || faturas.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
            <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Nenhuma fatura encontrada</Typography>
            <Typography variant="body2" color="text.secondary">As faturas deste cartão aparecerão aqui.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {faturas.map((fatura) => {
              const statusProp = getStatusProps(fatura.status);
              const hoje = new Date();
              const venceHojeOuAtrasada = fatura.status !== 'Paga' && new Date(fatura.dataVencimento) <= hoje;

              return (
                <Grid item xs={12} md={6} lg={4} key={fatura._id}>
                  <Card sx={{ 
                    borderRadius: 3, 
                    borderTop: `4px solid ${statusProp.color === 'default' ? '#94a3b8' : faturasTheme.palette[statusProp.color as 'primary' | 'warning' | 'success'].main}`,
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                  }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Typography variant="h6">{fatura.mesReferencia}</Typography>
                        <Chip label={statusProp.label} color={statusProp.color} size="small" sx={{ fontWeight: 'bold' }} />
                      </Box>
                      
                      <Box mb={2} sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                          Cartão: <strong>{fatura.cartao?.nome || '-'}</strong>
                        </Typography>
                        <Typography variant="body2" color={venceHojeOuAtrasada ? 'error.main' : 'text.secondary'} sx={{ fontWeight: venceHojeOuAtrasada ? 'bold' : 'normal' }}>
                          Vencimento: {formatarData(fatura.dataVencimento)} {venceHojeOuAtrasada && '(Venceu!)'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Fechamento: {formatarData(fatura.dataFechamento)}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="caption" color="text.secondary">Valor da Fatura</Typography>
                          <Typography variant="h5" color={statusProp.color === 'success' ? 'success.main' : 'primary.main'} fontWeight="bold">
                            {formatarValor(fatura.valorTotal)}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="caption" color="text.secondary">Transações</Typography>
                          <Typography variant="subtitle1" fontWeight="bold">{fatura.despesas?.length || 0}</Typography>
                        </Box>
                      </Box>

                      {fatura.status === 'Paga' ? (
                        <Box>
                          <Typography variant="caption" color="success.main" display="block" mb={1} textAlign="center">
                            Paga em {formatarData(fatura.dataPagamento)}
                          </Typography>
                          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1}>
                            <Button fullWidth variant="outlined" startIcon={<VisibilityIcon />} onClick={() => handleVerDetalhes(fatura)}>
                              Ver Fatura
                            </Button>
                            <Button fullWidth variant="outlined" color="error" startIcon={<ReplayIcon />} onClick={() => handleEstornarFatura(fatura)}>
                              Estornar
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1}>
                          <Button fullWidth variant="contained" color="primary" startIcon={<PaymentIcon />} onClick={() => handlePagarFatura(fatura)} disabled={fatura.valorTotal <= 0}>
                            Pagar
                          </Button>
                          <Button fullWidth variant="outlined" color="secondary" onClick={() => handleVerDetalhes(fatura)}>
                            Detalhes
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Modal Pagar Fatura */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', pb: 2 }}>
            Pagar Fatura {selectedFatura?.mesReferencia}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box mb={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">Valor a ser debitado da sua conta:</Typography>
              <Typography variant="h3" color="primary" fontWeight="bold">
                {formatarValor(selectedFatura?.valorTotal || 0)}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              Isso marcará a fatura como paga e descontará este exato valor do saldo da conta bancária escolhida abaixo.
            </Alert>

            <FormControl fullWidth required>
              <InputLabel>Conta para débito automático</InputLabel>
              <Select
                value={contaBancariaPagamento}
                onChange={(e) => setContaBancariaPagamento(e.target.value)}
                label="Conta para débito automático"
              >
                {contasBancarias.map((conta) => (
                  <MenuItem key={conta._id} value={conta._id}>
                    {conta.nome} - {conta.banco}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)} disabled={loadingPagamento} color="inherit">Cancelar</Button>
            <Button onClick={confirmarPagamento} variant="contained" disabled={!contaBancariaPagamento || loadingPagamento}>
              {loadingPagamento ? <CircularProgress size={24} /> : 'Confirmar Pagamento'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal Estornar Fatura */}
        <Dialog open={openEstornoDialog} onClose={() => setOpenEstornoDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', pb: 2, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReplayIcon /> Estornar Pagamento da Fatura
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Você está prestes a desfazer o pagamento da Fatura de <strong>{selectedFatura?.mesReferencia}</strong> no valor de <strong>{formatarValor(selectedFatura?.valorTotal || 0)}</strong>.
            </Alert>
            <Typography variant="body2" color="text.secondary" paragraph>
              Ao confirmar o estorno, o sistema irá:
            </Typography>
            <Box component="ul" sx={{ pl: 2, typography: 'body2', color: 'text.secondary' }}>
              <li>Devolver o valor integral pago de volta ao saldo da sua conta bancária.</li>
              <li>Excluir permanentemente o recibo de saída do seu Extrato.</li>
              <li>Reabrir esta fatura para que possa ser paga novamente no futuro.</li>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenEstornoDialog(false)} disabled={loadingEstorno} color="inherit">Cancelar</Button>
            <Button onClick={confirmarEstorno} variant="contained" color="error" disabled={loadingEstorno}>
              {loadingEstorno ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Estorno'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal Detalhes (O que tem na Fatura) */}
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>Detalhes da Fatura {selectedFatura?.mesReferencia}</Box>
            <IconButton onClick={() => setDetailsOpen(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {selectedFatura && (
              <>
                <Box p={3} bgcolor="#f8fafc" display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">Status da Fatura</Typography>
                    <Typography variant="h6" color={getStatusProps(selectedFatura.status).color === 'default' ? 'text.primary' : getStatusProps(selectedFatura.status).color + '.main'}>
                      {selectedFatura.status}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Total</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatarValor(selectedFatura.valorTotal)}</Typography>
                  </Box>
                </Box>
                
                <Box p={3}>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>Demonstrativo de Despesas</Typography>
                  {selectedFatura.despesas?.length > 0 ? (
                    isMobile ? (
                      <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #f1f5f9' }}>
                        {selectedFatura.despesas.map((despesa) => (
                          <ListItem key={despesa._id} divider sx={{ px: 2, py: 1.5 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {despesa.isGastoDiario ? <FastfoodIcon color="primary" /> : <ReceiptIcon color="secondary" />}
                            </ListItemIcon>
                            <ListItemText 
                              primary={despesa.descricao} 
                              secondary={formatarData(despesa.data)}
                              primaryTypographyProps={{ fontWeight: 500, variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Typography variant="subtitle2" fontWeight="bold" align="right">
                              {formatarValor(despesa.valor)}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Descrição</TableCell>
                              <TableCell>Data</TableCell>
                              <TableCell align="right">Valor</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedFatura.despesas.map((despesa) => (
                              <TableRow key={despesa._id} hover>
                                <TableCell>
                                  <Chip 
                                    icon={despesa.isGastoDiario ? <FastfoodIcon fontSize="small"/> : <ReceiptIcon fontSize="small" />} 
                                    label={despesa.isGastoDiario ? 'Gasto' : 'Conta Fixa'} 
                                    size="small" 
                                    color={despesa.isGastoDiario ? 'primary' : 'secondary'} 
                                    variant="outlined" 
                                  />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{despesa.descricao}</TableCell>
                                <TableCell>{formatarData(despesa.data)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatarValor(despesa.valor)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )
                  ) : (
                    <Typography color="text.secondary">Nenhuma despesa processada para esta fatura.</Typography>
                  )}
                </Box>
              </>
            )}
          </DialogContent>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
};

export default FaturasCartao;
