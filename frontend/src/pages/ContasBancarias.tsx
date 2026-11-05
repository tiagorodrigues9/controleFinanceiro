import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  ThemeProvider,
  createTheme,
  MenuItem,
  Divider,
  Tooltip,
  Chip,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Restore as RestoreIcon,
  AccountBalance as AccountBalanceIcon,
  AccountBalanceWallet as WalletIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import api from '../utils/api';

// Tema premium padronizado
const contasTheme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
      dark: '#4f46e5',
      light: '#818cf8',
    },
    error: {
      main: '#ef4444',
    },
    success: {
      main: '#10b981',
    },
    background: {
      paper: '#ffffff',
      default: '#f8fafc',
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
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
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
            }
          }
        }
      }
    }
  }
});

const BANCOS = [
  { nome: 'Nubank', cor: '#8b5cf6' },
  { nome: 'Itaú', cor: '#f97316' },
  { nome: 'Bradesco', cor: '#ef4444' },
  { nome: 'Banco do Brasil', cor: '#eab308' },
  { nome: 'Caixa Econômica', cor: '#0ea5e9' },
  { nome: 'Santander', cor: '#ef4444' },
  { nome: 'Inter', cor: '#f97316' },
  { nome: 'C6 Bank', cor: '#1e293b' },
  { nome: 'XP', cor: '#1e293b' },
  { nome: 'BTG Pactual', cor: '#3b82f6' },
  { nome: 'Mercado Pago', cor: '#0ea5e9' },
  { nome: 'Outro', cor: '#64748b' }
];

interface ContaBancaria {
  _id: string;
  nome: string;
  banco: string;
  agencia?: string;
  numeroConta?: string;
  saldo: number;
  ativo: boolean;
}

const ContasBancarias: React.FC = () => {
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Controle do Modal de Cadastro/Edição
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    banco: '',
    agencia: '',
    numeroConta: '',
    saldoInicial: ''
  });

  // Controle de Inativação/Reativação
  const [openConfirm, setOpenConfirm] = useState(false);
  const [targetConta, setTargetConta] = useState<ContaBancaria | null>(null);
  const [confirmAction, setConfirmAction] = useState<'inativar' | 'reativar'>('inativar');

  useEffect(() => {
    fetchContas();
  }, []);

  const fetchContas = async () => {
    setLoading(true);
    try {
      // Usando ?all=true para trazer contas ativas e inativas (se suportado pelo backend)
      const response = await api.get('/contas-bancarias?all=true');
      setContas(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar contas bancárias' });
    } finally {
      setLoading(false);
    }
  };

  const calcularSaldoTotal = () => {
    return contas
      .filter(conta => conta.ativo !== false)
      .reduce((total, conta) => total + (conta.saldo || 0), 0);
  };

  const handleOpenModal = (conta?: ContaBancaria) => {
    setMessage({ type: '', text: '' });
    if (conta) {
      setFormData({
        id: conta._id,
        nome: conta.nome,
        banco: conta.banco,
        agencia: conta.agencia || '',
        numeroConta: conta.numeroConta || '',
        saldoInicial: '' // não permite alterar saldo inicial na edição
      });
    } else {
      setFormData({
        id: '',
        nome: '',
        banco: '',
        agencia: '',
        numeroConta: '',
        saldoInicial: ''
      });
    }
    setOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    // Preparar payload limpando campos vazios
    const payload: any = {
      nome: formData.nome,
      banco: formData.banco
    };
    if (formData.agencia) payload.agencia = formData.agencia;
    if (formData.numeroConta) payload.numeroConta = formData.numeroConta;

    try {
      if (formData.id) {
        await api.put(`/contas-bancarias/${formData.id}`, payload);
        setMessage({ type: 'success', text: 'Conta atualizada com sucesso!' });
      } else {
        if (formData.saldoInicial) payload.saldoInicial = formData.saldoInicial;
        await api.post('/contas-bancarias', payload);
        setMessage({ type: 'success', text: 'Conta criada com sucesso!' });
      }
      fetchContas();
      setOpenModal(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao salvar conta.' });
    }
  };

  const handleConfirmAction = (conta: ContaBancaria, action: 'inativar' | 'reativar') => {
    setTargetConta(conta);
    setConfirmAction(action);
    setOpenConfirm(true);
    setMessage({ type: '', text: '' });
  };

  const executeAction = async () => {
    if (!targetConta) return;
    try {
      if (confirmAction === 'inativar') {
        await api.delete(`/contas-bancarias/${targetConta._id}`);
        setMessage({ type: 'success', text: 'Conta inativada com sucesso.' });
      } else {
        await api.put(`/contas-bancarias/${targetConta._id}`, {
          nome: targetConta.nome,
          banco: targetConta.banco,
          ativo: true
        });
        setMessage({ type: 'success', text: 'Conta reativada com sucesso.' });
      }
      fetchContas();
      setOpenConfirm(false);
    } catch (err: any) {
      setOpenConfirm(false);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao processar ação.' });
    }
  };

  const getCorBanco = (nomeBanco: string) => {
    const banco = BANCOS.find(b => b.nome === nomeBanco);
    return banco ? banco.cor : '#64748b';
  };

  const contasAtivas = contas.filter(c => c.ativo !== false);
  const contasInativas = contas.filter(c => c.ativo === false);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={contasTheme}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 4, gap: 2 }}>
          <Typography variant="h4" sx={{ mb: { xs: 1, sm: 0 }, display: 'flex', alignItems: 'center' }}>
            <WalletIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} /> Contas Bancárias
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
            size="large"
            sx={{ flexShrink: 0 }}
          >
            Cadastrar Conta
          </Button>
        </Box>

        {message.text && !openModal && (
          <Alert severity={message.type as 'success' | 'error'} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Quadro de Saldo Total (Dashboard-like) */}
        <Paper
          sx={{
            p: 3,
            mb: 4,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
              <AccountBalanceIcon sx={{ fontSize: 36, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
                Saldo Total das Contas Ativas
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  mt: 0.5,
                  fontSize: { xs: '2rem', sm: '3rem' } // Menor no mobile, tamanho padrão (h3) no desktop
                }}
              >
                R$ {calcularSaldoTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={`${contasAtivas.length} conta(s) ativa(s)`} 
            sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }} 
          />
        </Paper>

        <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>Minhas Contas</Typography>

        {contasAtivas.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 3, mb: 4 }}>
            <WalletIcon sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Nenhuma conta ativa encontrada</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {contasAtivas.map(conta => {
              const corBanco = getCorBanco(conta.banco);
              return (
                <Grid item xs={12} sm={6} md={4} key={conta._id}>
                  <Paper 
                    sx={{ 
                      p: 0, 
                      borderRadius: 3, 
                      overflow: 'hidden',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
                    }}
                  >
                    <Box sx={{ backgroundColor: corBanco, height: 8 }} />
                    <Box sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box>
                          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{conta.nome}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                            {conta.banco}
                          </Typography>
                        </Box>
                        <Box>
                          <Tooltip title="Ver Extrato">
                            <IconButton size="small" onClick={() => navigate(`/extrato?conta=${conta._id}`)} sx={{ color: '#94a3b8', '&:hover': { color: 'primary.main' } }}>
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenModal(conta)} sx={{ color: '#94a3b8', '&:hover': { color: 'primary.main' } }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Inativar">
                            <IconButton size="small" onClick={() => handleConfirmAction(conta, 'inativar')} sx={{ color: '#94a3b8', '&:hover': { color: 'error.main' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      <Box display="flex" gap={2} mb={3}>
                        {conta.agencia && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Agência</Typography>
                            <Typography variant="body2" fontWeight={500}>{conta.agencia}</Typography>
                          </Box>
                        )}
                        {conta.numeroConta && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Conta</Typography>
                            <Typography variant="body2" fontWeight={500}>{conta.numeroConta}</Typography>
                          </Box>
                        )}
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        Saldo Atual
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 700, 
                          color: conta.saldo < 0 ? 'error.main' : 'text.primary',
                          mt: 0.5
                        }}
                      >
                        R$ {conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}

        {contasInativas.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', mt: 4 }}>Contas Inativas</Typography>
            <Grid container spacing={3}>
              {contasInativas.map(conta => (
                <Grid item xs={12} sm={6} md={4} key={conta._id}>
                  <Paper sx={{ p: 3, borderRadius: 3, backgroundColor: '#f1f5f9', opacity: 0.7 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6" sx={{ color: 'text.secondary', textDecoration: 'line-through' }}>{conta.nome}</Typography>
                        <Typography variant="body2" color="text.secondary">{conta.banco}</Typography>
                      </Box>
                      <Tooltip title="Reativar Conta">
                        <IconButton size="small" onClick={() => handleConfirmAction(conta, 'reativar')} sx={{ color: 'primary.main' }}>
                          <RestoreIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Modal de Cadastro/Edição */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #f1f5f9', mb: 2 }}>
              {formData.id ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </DialogTitle>
            {message.text && openModal && (
              <Box px={3} mb={2}>
                <Alert severity="error">{message.text}</Alert>
              </Box>
            )}
            <DialogContent sx={{ pt: 2, pb: 2 }}>
              <TextField
                fullWidth
                margin="dense"
                label="Nome da Conta (Apelido)"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Nubank Principal, Minha Poupança"
              />
              
              <Autocomplete
                freeSolo
                options={BANCOS.map(b => b.nome)}
                value={formData.banco}
                onChange={(e, newValue) => setFormData({ ...formData, banco: newValue || '' })}
                onInputChange={(e, newInputValue) => setFormData({ ...formData, banco: newInputValue })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="dense"
                    label="Instituição Financeira (Banco)"
                    required
                    sx={{ mt: 2 }}
                    placeholder="Selecione ou digite o nome do banco"
                  />
                )}
                renderOption={(props, option) => {
                  const bancoObj = BANCOS.find(b => b.nome === option);
                  const cor = bancoObj ? bancoObj.cor : '#64748b';
                  return (
                    <li {...props} key={option}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: cor }} />
                        {option}
                      </Box>
                    </li>
                  );
                }}
              />

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Agência"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="Ex: 0001"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Número da Conta"
                    value={formData.numeroConta}
                    onChange={(e) => setFormData({ ...formData, numeroConta: e.target.value })}
                    placeholder="Ex: 12345-6"
                  />
                </Grid>
              </Grid>

              {!formData.id && (
                <TextField
                  fullWidth
                  margin="dense"
                  label="Saldo Inicial (R$)"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={formData.saldoInicial}
                  onChange={(e) => setFormData({ ...formData, saldoInicial: e.target.value })}
                  placeholder="0.00"
                  sx={{ mt: 2 }}
                  helperText="Opcional. Você pode definir se a conta já possui dinheiro."
                />
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={() => setOpenModal(false)} color="inherit">Cancelar</Button>
              <Button type="submit" variant="contained" color="primary">Salvar Conta</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog de Confirmação Inativar/Reativar */}
        <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle>
            Confirmar {confirmAction === 'inativar' ? 'Inativação' : 'Reativação'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja {confirmAction} a conta <strong>{targetConta?.nome}</strong>?
            </Typography>
            {confirmAction === 'inativar' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                A conta ficará invisível nos relatórios, mas você poderá reativá-la depois na seção de Contas Inativas.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenConfirm(false)} color="inherit">Cancelar</Button>
            <Button 
              onClick={executeAction} 
              variant="contained" 
              color={confirmAction === 'inativar' ? 'error' : 'primary'}
            >
              Sim, {confirmAction}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
};

export default ContasBancarias;
