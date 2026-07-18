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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  Avatar,
  InputAdornment,
  Chip,
  ThemeProvider,
  createTheme,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Search as SearchIcon,
  Payment as PaymentIcon,
  AccountBalanceWallet as WalletIcon,
  CreditCard as CreditCardIcon,
  Money as MoneyIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { isRequestCancelled } from '../utils/requestUtils';

// Tema premium padronizado (consistente com Fornecedores, ContasBancárias, Categorias)
const formasPagamentoTheme = createTheme({
  palette: {
    primary: {
      main: '#6366f1', // Indigo 500
      dark: '#4f46e5', // Indigo 600
      light: '#818cf8', // Indigo 400
    },
    secondary: {
      main: '#10b981', // Emerald 500
      dark: '#059669', // Emerald 600
      light: '#34d399', // Emerald 400
    },
    background: {
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#0f172a',
    },
    h6: {
      fontWeight: 600,
      color: '#1e293b',
    }
  },
  shape: {
    borderRadius: 12,
  },
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
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            transition: 'all 0.2s',
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.1)',
            }
          }
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
    }
  }
});

interface FormaPagamento {
  _id: string;
  nome: string;
  ativo: boolean;
  usuario: string;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Mapa de ícones para formas de pagamento conhecidas
const ICONE_FORMA: Record<string, React.ReactElement> = {
  'dinheiro': <MoneyIcon />,
  'boleto': <ReceiptIcon />,
  'cartão de crédito': <CreditCardIcon />,
  'cartão de débito': <CreditCardIcon />,
  'pix': <WalletIcon />,
  'transferência': <WalletIcon />,
};

const getIconeForma = (nome: string): React.ReactElement => {
  const key = (nome || '').toLowerCase().trim();
  return ICONE_FORMA[key] || <PaymentIcon />;
};

const getInitials = (name: string): string => {
  if (!name) return 'FP';
  return name.substring(0, 2).toUpperCase();
};

const FormasPagamento: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: '' });

  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | ''; text: string }>({ type: '', text: '' });

  const [openConfirm, setOpenConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'inativar' | 'reativar'>('inativar');
  const [selectedForma, setSelectedForma] = useState<FormaPagamento | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchFormas = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const response = await api.get('/formas-pagamento?all=true', { signal: controller.signal });
      setFormas(response.data);
    } catch (err) {
      if (!isRequestCancelled(err)) {
        setMessage({ type: 'error', text: 'Erro ao carregar formas de pagamento.' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormas();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFormas]);

  // Escutar evento global para recarregar quando outras telas atualizam
  useEffect(() => {
    const handler = () => fetchFormas();
    window.addEventListener('formasUpdated', handler);
    return () => window.removeEventListener('formasUpdated', handler);
  }, [fetchFormas]);

  const isActive = (item: FormaPagamento): boolean => {
    return item.ativo !== false;
  };

  // Filtragem
  const filteredFormas = useMemo(() => {
    if (!searchTerm) return formas;
    const lower = searchTerm.toLowerCase();
    return formas.filter(f =>
      f.nome.toLowerCase().includes(lower)
    );
  }, [formas, searchTerm]);

  const handleOpenCadastro = () => {
    setFormData({ nome: '' });
    setEditingId(null);
    setOpenDialog(true);
    setMessage({ type: '', text: '' });
  };

  const handleOpenEdit = (forma: FormaPagamento) => {
    setFormData({ nome: forma.nome });
    setEditingId(forma._id);
    setOpenDialog(true);
    setMessage({ type: '', text: '' });
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação no frontend
    const nomeTrimmed = formData.nome.trim();
    if (!nomeTrimmed) {
      setMessage({ type: 'error', text: 'Nome é obrigatório.' });
      return;
    }
    if (nomeTrimmed.length > 100) {
      setMessage({ type: 'error', text: 'Nome não pode ter mais de 100 caracteres.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingId) {
        await api.put(`/formas-pagamento/${editingId}`, { nome: nomeTrimmed });
        setMessage({ type: 'success', text: 'Forma de pagamento atualizada com sucesso!' });
      } else {
        await api.post('/formas-pagamento', { nome: nomeTrimmed });
        setMessage({ type: 'success', text: 'Forma de pagamento cadastrada com sucesso!' });
      }
      fetchFormas();
      window.dispatchEvent(new Event('formasUpdated'));
      handleCloseDialog();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erro ao processar forma de pagamento.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionClick = (forma: FormaPagamento, action: 'inativar' | 'reativar') => {
    setSelectedForma(forma);
    setConfirmAction(action);
    setOpenConfirm(true);
  };

  const confirmActionExecution = async () => {
    if (!selectedForma) return;
    setSubmitting(true);
    try {
      if (confirmAction === 'inativar') {
        const response = await api.delete(`/formas-pagamento/${selectedForma._id}`);
        setMessage({
          type: response.data?.referenciasAtivas > 0 ? 'warning' : 'success',
          text: response.data?.message || 'Forma de pagamento inativada com sucesso!'
        });
      } else {
        await api.patch(`/formas-pagamento/${selectedForma._id}/reativar`);
        setMessage({ type: 'success', text: 'Forma de pagamento reativada com sucesso!' });
      }
      fetchFormas();
      window.dispatchEvent(new Event('formasUpdated'));
      setOpenConfirm(false);
      setSelectedForma(null);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || `Erro ao ${confirmAction} forma de pagamento.`
      });
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAction = () => {
    setOpenConfirm(false);
    setSelectedForma(null);
  };

  // Componente para renderizar cards no mobile
  const FormaPagamentoCard = ({ forma }: { forma: FormaPagamento }) => (
    <Card sx={{
      mb: 2,
      borderRadius: 3,
      borderLeft: `4px solid ${isActive(forma) ? '#6366f1' : '#cbd5e1'}`,
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
      }
    }}>
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{
              bgcolor: isActive(forma) ? 'primary.main' : 'text.disabled',
              width: 40,
              height: 40,
              transition: 'all 0.2s',
            }}>
              {React.cloneElement(getIconeForma(forma.nome), { fontSize: 'small' })}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                lineHeight: 1.2, 
                color: isActive(forma) ? 'text.primary' : 'text.secondary',
                fontStyle: isActive(forma) ? 'normal' : 'italic'
              }}>
                {forma.nome} {forma.isSystem && <Chip label="Sistema" size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={isActive(forma) ? 'Ativa' : 'Inativa'}
            color={isActive(forma) ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 600, opacity: isActive(forma) ? 1 : 0.8 }}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, pt: 0 }}>
        {!forma.isSystem && (
          <>
            <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenEdit(forma)}>
              Editar
            </Button>
            {isActive(forma) ? (
              <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleActionClick(forma, 'inativar')}>
                Inativar
              </Button>
            ) : (
              <Button size="small" color="success" startIcon={<RestoreIcon />} onClick={() => handleActionClick(forma, 'reativar')}>
                Reativar
              </Button>
            )}
          </>
        )}
        {forma.isSystem && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pr: 1 }}>
            Padrão do sistema
          </Typography>
        )}
      </CardActions>
    </Card>
  );

  return (
    <ThemeProvider theme={formasPagamentoTheme}>
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
            Formas de Pagamento
          </Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCadastro}
            size="large"
            sx={{ flexShrink: 0 }}
          >
            Nova Forma
          </Button>
        </Box>

        {/* Mensagens de feedback */}
        {message.text && (
          <Alert
            severity={message.type as 'success' | 'error' | 'warning'}
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        )}

        {/* Barra de Pesquisa */}
        <Paper sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="small"
          />
        </Paper>

        {/* Conteúdo Principal */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : filteredFormas.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: '#f8fafc' }}>
            <PaymentIcon sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {searchTerm ? 'Nenhuma forma de pagamento encontrada' : 'Nenhuma forma de pagamento cadastrada'}
            </Typography>
            {searchTerm && (
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                Tente limpar sua busca.
              </Typography>
            )}
            {!searchTerm && (
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                Clique em "Nova Forma" para adicionar sua primeira forma de pagamento.
              </Typography>
            )}
          </Paper>
        ) : isMobile ? (
          <Box>
            {filteredFormas.map((forma) => (
              <FormaPagamentoCard key={forma._id} forma={forma} />
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Forma de Pagamento</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFormas.map((forma) => (
                  <TableRow
                    key={forma._id}
                    hover
                    sx={{
                      opacity: isActive(forma) ? 1 : 0.6,
                      backgroundColor: isActive(forma) ? 'inherit' : '#f8fafc',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{
                          bgcolor: isActive(forma) ? 'primary.main' : 'text.disabled',
                          width: 36,
                          height: 36,
                          opacity: isActive(forma) ? 1 : 0.7
                        }}>
                          {React.cloneElement(getIconeForma(forma.nome), { fontSize: 'small' })}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ 
                          color: isActive(forma) ? 'text.primary' : 'text.secondary',
                          fontStyle: isActive(forma) ? 'normal' : 'italic'
                        }}>
                          {forma.nome} {forma.isSystem && <Chip label="Sistema" size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={isActive(forma) ? 'Ativa' : 'Inativa'}
                        color={isActive(forma) ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600, opacity: isActive(forma) ? 1 : 0.8 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {!forma.isSystem ? (
                        <>
                          <Tooltip title="Editar">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(forma)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isActive(forma) ? (
                            <Tooltip title="Inativar">
                              <IconButton size="small" color="error" onClick={() => handleActionClick(forma, 'inativar')}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Reativar">
                              <IconButton size="small" color="success" onClick={() => handleActionClick(forma, 'reativar')}>
                                <RestoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <Tooltip title="Não pode ser alterado">
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pr: 1 }}>
                            Padrão do sistema
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog de Confirmação (Inativar/Reativar) */}
        <Dialog open={openConfirm} onClose={cancelAction} fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, p: 1 } }}>
          <DialogTitle sx={{ pb: 1 }}>
            Confirmar {confirmAction === 'inativar' ? 'Inativação' : 'Reativação'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja {confirmAction} a forma de pagamento <strong>"{selectedForma?.nome}"</strong>?
              {confirmAction === 'inativar' && ' Ela não aparecerá mais nas opções de novas contas e gastos.'}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ pt: 2 }}>
            <Button onClick={cancelAction} color="inherit" disabled={submitting}>Cancelar</Button>
            <Button
              onClick={confirmActionExecution}
              variant="contained"
              color={confirmAction === 'inativar' ? 'error' : 'success'}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting ? 'Processando...' : `Sim, ${confirmAction}`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Cadastro / Edição */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}>
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #f1f5f9', mb: 2 }}>
              {editingId ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </DialogTitle>

            {message.text && openDialog && (
              <Box px={3} mb={2}>
                <Alert severity={message.type as 'success' | 'error'}>{message.text}</Alert>
              </Box>
            )}

            <DialogContent sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome da Forma de Pagamento"
                    placeholder="Ex: Pix, Cheque, Vale Alimentação..."
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    variant="outlined"
                    required
                    inputProps={{ maxLength: 100 }}
                    helperText={`${formData.nome.length}/100 caracteres`}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={handleCloseDialog} color="inherit" size="large" disabled={submitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {submitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Cadastrar')}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default FormasPagamento;
