import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  List,
  Divider,
  ThemeProvider,
  createTheme,
  InputAdornment,
} from '@mui/material';
import {
  SwapHoriz as SwapHorizIcon,
  Delete as DeleteIcon,
  AccountBalance as AccountBalanceIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import api from '../utils/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tema Premium Indigo/Emerald
const transferenciasTheme = createTheme({
  palette: {
    primary: { main: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
    secondary: { main: '#10b981', dark: '#059669', light: '#34d399' },
    background: { paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, color: '#0f172a' },
    h6: { fontWeight: 600, color: '#1e293b' }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          border: '1px solid #f1f5f9',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none' as const,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2), 0 2px 4px -2px rgba(99, 102, 241, 0.1)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#64748b',
          backgroundColor: '#f8fafc',
          borderBottom: '2px solid #e2e8f0',
        },
        body: {
          color: '#334155',
          borderBottom: '1px solid #f1f5f9',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          }
        }
      }
    }
  }
});

// Tipagem
interface ContaBancaria {
  _id: string;
  nome: string;
  banco: string;
  ativo: boolean;
}

interface Transferencia {
  _id: string;
  valor: number;
  data: string;
  motivo?: string;
  contaBancaria: ContaBancaria; // Origem
  contaDestino: ContaBancaria | null;
}

interface FormData {
  contaOrigem: string;
  contaDestino: string;
  valor: string;
  motivo: string;
  data: string;
}

const Transferencias: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransfer, setLoadingTransfer] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [transferenciaToDelete, setTransferenciaToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' | '' }>({ text: '', type: '' });
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState<FormData>({
    contaOrigem: '',
    contaDestino: '',
    valor: '',
    motivo: '',
    data: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchContas = useCallback(async () => {
    try {
      const response = await api.get('/contas-bancarias');
      setContas(response.data.filter((conta: ContaBancaria) => conta.ativo !== false));
    } catch (err) {
      setMessage({ text: 'Erro ao carregar contas bancárias', type: 'error' });
    }
  }, []);

  const fetchTransferencias = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/transferencias?page=${page}&limit=15`);
      setTransferencias(response.data.transferencias);
      setTotalPages(response.data.pagination.pages);
    } catch (err) {
      setMessage({ text: 'Erro ao carregar histórico de transferências', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchContas();
    fetchTransferencias();
  }, [fetchContas, fetchTransferencias]);

  const handleOpenTransfer = () => {
    setFormData({
      contaOrigem: '',
      contaDestino: '',
      valor: '',
      motivo: '',
      data: format(new Date(), 'yyyy-MM-dd')
    });
    setOpenTransfer(true);
    setMessage({ text: '', type: '' });
  };

  const handleCloseTransfer = () => {
    setOpenTransfer(false);
  };

  const handleOpenDelete = (id: string) => {
    setTransferenciaToDelete(id);
    setOpenConfirmDelete(true);
  };

  const handleCloseDelete = () => {
    if (!isDeleting) {
      setOpenConfirmDelete(false);
      setTransferenciaToDelete(null);
    }
  };

  const handleDelete = async () => {
    if (!transferenciaToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/transferencias/${transferenciaToDelete}`);
      setMessage({ text: 'Transferência excluída com sucesso!', type: 'success' });
      setOpenConfirmDelete(false);
      setTransferenciaToDelete(null);
      fetchTransferencias();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Erro ao excluir transferência', type: 'error' });
      setOpenConfirmDelete(false); // fechar caso dê erro visual muito feio, o ideal é mostrar alerta
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTransfer = async () => {
    if (!formData.contaOrigem || !formData.contaDestino || !formData.valor || !formData.data) {
      setMessage({ text: 'Preencha todos os campos obrigatórios', type: 'error' });
      return;
    }

    if (formData.contaOrigem === formData.contaDestino) {
      setMessage({ text: 'Selecione contas diferentes', type: 'error' });
      return;
    }

    // Remove pontos de milhar e troca a vírgula decimal por ponto
    const valorLimpo = formData.valor.replace(/\./g, '').replace(',', '.');
    const valorFloat = parseFloat(valorLimpo);
    
    if (isNaN(valorFloat) || valorFloat <= 0) {
      setMessage({ text: 'Valor inválido', type: 'error' });
      return;
    }

    try {
      setLoadingTransfer(true);
      
      const payload = {
        ...formData,
        valor: valorFloat,
        // Ao enviar a data, precisamos garantir que o UTC não defase o dia dependendo do Timezone do usuário.
        // Convertendo "YYYY-MM-DD" local para Data:
        data: new Date(formData.data + 'T12:00:00').toISOString()
      };

      await api.post('/transferencias', payload);
      
      setMessage({ text: 'Transferência realizada com sucesso!', type: 'success' });
      setOpenTransfer(false);
      fetchTransferencias();
      
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Erro ao realizar transferência', type: 'error' });
    } finally {
      setLoadingTransfer(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Limite visual de 1 ano atrás para o Input type Date
  const maxDate = format(new Date(), 'yyyy-MM-dd');
  const minDate = format(new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 'yyyy-MM-dd');

  return (
    <ThemeProvider theme={transferenciasTheme}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 4,
          gap: 2,
        }}>
          <Typography variant="h4" sx={{ mb: { xs: 1, sm: 0 } }}>
            Transferências
          </Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={<SwapHorizIcon />}
            onClick={handleOpenTransfer}
            size="large"
            sx={{ flexShrink: 0 }}
          >
            Nova Transferência
          </Button>
        </Box>

        {message.text && (
          <Alert severity={message.type as any} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setMessage({ text: '', type: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Listagem */}
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, mb: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          ) : isMobile ? (
            // Mobile Card View
            <List sx={{ p: 0, bgcolor: 'background.paper' }}>
              {transferencias.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <SwapHorizIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">Nenhuma transferência encontrada</Typography>
                </Box>
              ) : (
                transferencias.map((transferencia, index) => (
                  <React.Fragment key={transferencia._id}>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                          {formatCurrency(transferencia.valor)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ bgcolor: '#f1f5f9', px: 1, py: 0.5, borderRadius: 1 }}>
                          {format(parseISO(transferencia.data), 'dd MMM yyyy', { locale: ptBR })}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ flex: 1, p: 1, bgcolor: '#f8fafc', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Origem</Typography>
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {transferencia.contaBancaria?.nome}
                          </Typography>
                        </Box>
                        <ArrowForwardIcon sx={{ color: 'text.disabled', mx: 1, fontSize: 20 }} />
                        <Box sx={{ flex: 1, p: 1, bgcolor: '#f8fafc', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Destino</Typography>
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {transferencia.contaDestino?.nome || 'Excluída'}
                          </Typography>
                        </Box>
                      </Box>

                      {transferencia.motivo && !transferencia.motivo.startsWith('Transferência') && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                          "{transferencia.motivo}"
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          size="small" 
                          color="error" 
                          startIcon={<DeleteIcon />} 
                          onClick={() => handleOpenDelete(transferencia._id)}
                        >
                          Excluir
                        </Button>
                      </Box>
                    </Box>
                    {index < transferencias.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          ) : (
            // Desktop Table View
            <TableContainer>
              <Table size={isTablet ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell width="120">Data</TableCell>
                    <TableCell>Origem</TableCell>
                    <TableCell width="40" align="center"></TableCell>
                    <TableCell>Destino</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Motivo</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transferencias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <SwapHorizIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">Nenhuma transferência encontrada</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transferencias.map((transferencia) => (
                      <TableRow key={transferencia._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {format(parseISO(transferencia.data), 'dd/MM/yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AccountBalanceIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{transferencia.contaBancaria?.nome}</Typography>
                              <Typography variant="caption" color="text.secondary">{transferencia.contaBancaria?.banco}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <ArrowForwardIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                        </TableCell>
                        <TableCell>
                           <Box display="flex" alignItems="center" gap={1}>
                            <AccountBalanceIcon sx={{ color: 'primary.light', fontSize: 18 }} />
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{transferencia.contaDestino?.nome || 'Excluída'}</Typography>
                              {transferencia.contaDestino && <Typography variant="caption" color="text.secondary">{transferencia.contaDestino?.banco}</Typography>}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="primary.dark">
                            {formatCurrency(transferencia.valor)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>
                             {transferencia.motivo && !transferencia.motivo.startsWith('Transferência') ? transferencia.motivo : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Excluir">
                            <IconButton size="small" color="error" onClick={() => handleOpenDelete(transferencia._id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Paginação */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 4 }}>
            <Button variant="outlined" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Typography variant="body2" fontWeight="500">Página {page} de {totalPages}</Typography>
            <Button variant="outlined" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
          </Box>
        )}

        {/* Dialog de Nova Transferência */}
        <Dialog 
          open={openTransfer} 
          onClose={handleCloseTransfer} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <form onSubmit={(e) => { e.preventDefault(); handleTransfer(); }}>
            <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', pb: 2, mb: 2 }}>
              Nova Transferência
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Conta de Origem</InputLabel>
                    <Select
                      value={formData.contaOrigem}
                      onChange={(e) => setFormData({ ...formData, contaOrigem: e.target.value })}
                      label="Conta de Origem"
                    >
                      {contas.map((conta) => (
                        <MenuItem key={conta._id} value={conta._id}>
                          {conta.nome} ({conta.banco})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Conta de Destino</InputLabel>
                    <Select
                      value={formData.contaDestino}
                      onChange={(e) => setFormData({ ...formData, contaDestino: e.target.value })}
                      label="Conta de Destino"
                    >
                      {contas.map((conta) => (
                        <MenuItem key={conta._id} value={conta._id}>
                          {conta.nome} ({conta.banco})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Valor (R$)"
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={(e) => {
                      // Remove tudo exceto dígitos numéricos
                      let digits = e.target.value.replace(/\D/g, '');
                      if (!digits) {
                        setFormData({ ...formData, valor: '' });
                        return;
                      }
                      
                      // Transforma em numérico base centavos
                      const num = parseInt(digits, 10) / 100;
                      
                      // Formata automaticamente estilo "1.000,50"
                      const formatted = new Intl.NumberFormat('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(num);
                      
                      setFormData({ ...formData, valor: formatted });
                    }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                    inputProps={{ inputMode: 'numeric' }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Data da Transferência"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: minDate, max: maxDate }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Motivo (opcional)"
                    multiline
                    rows={2}
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    placeholder="Ex: Transferência de poupança..."
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={handleCloseTransfer} color="inherit" disabled={loadingTransfer}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loadingTransfer}
                startIcon={loadingTransfer ? <CircularProgress size={20} color="inherit" /> : <SwapHorizIcon />}
              >
                {loadingTransfer ? 'Transferindo...' : 'Transferir'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
        
        {/* Dialog de Confirmação de Exclusão */}
        <Dialog 
          open={openConfirmDelete} 
          onClose={handleCloseDelete}
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir esta transferência? Os saldos/extratos das contas de origem e destino serão revertidos simultaneamente. Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDelete} color="inherit" disabled={isDeleting}>Cancelar</Button>
            <Button 
              onClick={handleDelete} 
              variant="contained" 
              color="error" 
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
};

export default Transferencias;
