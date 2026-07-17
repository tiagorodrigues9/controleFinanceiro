import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  Avatar,
  InputAdornment,
  Grid,
  ThemeProvider,
  createTheme,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Restore as RestoreIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import api from '../utils/api';

// Tema premium similar ao da página de Perfil
const fornecedoresTheme = createTheme({
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
          textTransform: 'none',
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

interface Fornecedor {
  _id: string;
  nome: string;
  tipo?: string;
  documento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  ativo: boolean;
}

const Fornecedores = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    nome: '', 
    tipo: '', 
    documento: '', 
    telefone: '', 
    email: '', 
    endereco: '', 
    observacoes: '' 
  });
  
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [openConfirm, setOpenConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'inativar' | 'reativar'>('inativar');
  const [selectedFornecedor, setSelectedFornecedor] = useState<string | null>(null);

  const isActive = (item: Fornecedor) => {
    return item.ativo !== false; // Considera undefined como ativo para retrocompatibilidade
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    setLoading(true);
    try {
      const response = await api.get('/fornecedores');
      setFornecedores(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar lista de fornecedores.' });
    } finally {
      setLoading(false);
    }
  };

  // Filtragem
  const filteredFornecedores = useMemo(() => {
    if (!searchTerm) return fornecedores;
    const lower = searchTerm.toLowerCase();
    return fornecedores.filter(f => 
      f.nome.toLowerCase().includes(lower) || 
      (f.tipo && f.tipo.toLowerCase().includes(lower)) ||
      (f.documento && f.documento.includes(lower)) ||
      (f.email && f.email.toLowerCase().includes(lower))
    );
  }, [fornecedores, searchTerm]);

  const handleOpenCadastro = () => {
    setFormData({ nome: '', tipo: '', documento: '', telefone: '', email: '', endereco: '', observacoes: '' });
    setEditingId(null);
    setOpenDialog(true);
    setMessage({ type: '', text: '' });
  };

  const handleOpenEdit = (fornecedor: Fornecedor) => {
    setFormData({
      nome: fornecedor.nome || '',
      tipo: fornecedor.tipo || '',
      documento: fornecedor.documento || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      endereco: fornecedor.endereco || '',
      observacoes: fornecedor.observacoes || ''
    });
    setEditingId(fornecedor._id);
    setOpenDialog(true);
    setMessage({ type: '', text: '' });
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      if (editingId) {
        await api.put(`/fornecedores/${editingId}`, formData);
        setMessage({ type: 'success', text: 'Fornecedor atualizado com sucesso!' });
      } else {
        await api.post('/fornecedores', formData);
        setMessage({ type: 'success', text: 'Fornecedor cadastrado com sucesso!' });
      }
      fetchFornecedores();
      handleCloseDialog();
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erro ao processar fornecedor.' 
      });
    }
  };

  const handleActionClick = (id: string, action: 'inativar' | 'reativar') => {
    setSelectedFornecedor(id);
    setConfirmAction(action);
    setOpenConfirm(true);
  };

  const confirmActionExecution = async () => {
    if (!selectedFornecedor) return;
    try {
      if (confirmAction === 'inativar') {
        await api.put(`/fornecedores/${selectedFornecedor}/inativar`);
        setMessage({ type: 'success', text: 'Fornecedor inativado com sucesso!' });
      } else {
        await api.put(`/fornecedores/${selectedFornecedor}/ativar`);
        setMessage({ type: 'success', text: 'Fornecedor reativado com sucesso!' });
      }
      fetchFornecedores();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || `Erro ao ${confirmAction} fornecedor` });
    } finally {
      setOpenConfirm(false);
      setSelectedFornecedor(null);
    }
  };

  const cancelAction = () => {
    setOpenConfirm(false);
    setSelectedFornecedor(null);
  };

  // Obter as iniciais para o Avatar
  const getInitials = (name: string) => {
    if (!name) return 'F';
    return name.substring(0, 2).toUpperCase();
  };

  // Componente para renderizar cards no mobile
  const FornecedorCard = ({ fornecedor }: { fornecedor: Fornecedor }) => (
    <Card sx={{ mb: 2, borderRadius: 3, borderLeft: `4px solid ${isActive(fornecedor) ? '#10b981' : '#cbd5e1'}` }}>
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ bgcolor: isActive(fornecedor) ? 'primary.main' : 'text.disabled', width: 40, height: 40 }}>
              {getInitials(fornecedor.nome)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                {fornecedor.nome}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fornecedor.tipo || 'Geral'}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={isActive(fornecedor) ? 'Ativo' : 'Inativo'}
            color={isActive(fornecedor) ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>
        
        {fornecedor.documento && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> {fornecedor.documento}
          </Typography>
        )}
        {fornecedor.email && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> {fornecedor.email}
          </Typography>
        )}
        {fornecedor.telefone && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
            <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> {fornecedor.telefone}
          </Typography>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, pt: 0 }}>
        <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenEdit(fornecedor)}>
          Editar
        </Button>
        {isActive(fornecedor) ? (
          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleActionClick(fornecedor._id, 'inativar')}>
            Inativar
          </Button>
        ) : (
          <Button size="small" color="success" startIcon={<RestoreIcon />} onClick={() => handleActionClick(fornecedor._id, 'reativar')}>
            Reativar
          </Button>
        )}
      </CardActions>
    </Card>
  );

  return (
    <ThemeProvider theme={fornecedoresTheme}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 4, gap: 2 }}>
          <Typography variant="h4" sx={{ mb: { xs: 1, sm: 0 } }}>
            Meus Fornecedores
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCadastro}
            size="large"
            sx={{ flexShrink: 0 }}
          >
            Novo Fornecedor
          </Button>
        </Box>

        {message.text && (
          <Alert severity={message.type as 'success' | 'error'} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Barra de Pesquisa */}
        <Paper sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Buscar por nome, tipo, documento ou email..."
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
        ) : filteredFornecedores.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: '#f8fafc' }}>
            <BusinessIcon sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nenhum fornecedor encontrado
            </Typography>
            {searchTerm && (
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                Tente limpar sua busca.
              </Typography>
            )}
          </Paper>
        ) : isMobile ? (
          <Box>
            {filteredFornecedores.map((fornecedor) => (
              <FornecedorCard key={fornecedor._id} fornecedor={fornecedor} />
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fornecedor</TableCell>
                  <TableCell>Contato</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFornecedores.map((fornecedor) => (
                  <TableRow 
                    key={fornecedor._id} 
                    hover
                    sx={{ 
                      opacity: isActive(fornecedor) ? 1 : 0.6,
                      backgroundColor: isActive(fornecedor) ? 'inherit' : '#f8fafc' 
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: isActive(fornecedor) ? 'primary.main' : 'text.disabled', width: 36, height: 36 }}>
                          {getInitials(fornecedor.nome)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">{fornecedor.nome}</Typography>
                          <Typography variant="caption" color="text.secondary">{fornecedor.tipo || 'Geral'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column">
                        {fornecedor.email ? <Typography variant="body2">{fornecedor.email}</Typography> : null}
                        {fornecedor.telefone ? <Typography variant="caption" color="text.secondary">{fornecedor.telefone}</Typography> : null}
                        {!fornecedor.email && !fornecedor.telefone ? <Typography variant="caption" color="text.disabled">-</Typography> : null}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {fornecedor.documento || '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={isActive(fornecedor) ? 'Ativo' : 'Inativo'}
                        color={isActive(fornecedor) ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => handleOpenEdit(fornecedor)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isActive(fornecedor) ? (
                        <Tooltip title="Inativar">
                          <IconButton size="small" color="error" onClick={() => handleActionClick(fornecedor._id, 'inativar')}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reativar">
                          <IconButton size="small" color="success" onClick={() => handleActionClick(fornecedor._id, 'reativar')}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog de confirmação de ação (Inativar/Reativar) */}
        <Dialog open={openConfirm} onClose={cancelAction} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
          <DialogTitle sx={{ pb: 1 }}>
            Confirmar {confirmAction === 'inativar' ? 'Inativação' : 'Reativação'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja {confirmAction} este fornecedor?
              {confirmAction === 'inativar' && " Ele não aparecerá mais nas opções de novas contas."}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ pt: 2 }}>
            <Button onClick={cancelAction} color="inherit">Cancelar</Button>
            <Button 
              onClick={confirmActionExecution} 
              variant="contained" 
              color={confirmAction === 'inativar' ? 'error' : 'success'}
            >
              Sim, {confirmAction}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Cadastro / Edição */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #f1f5f9', mb: 2 }}>
              {editingId ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
            </DialogTitle>
            
            {message.text && openDialog && (
              <Box px={3} mb={2}>
                <Alert severity="error">{message.text}</Alert>
              </Box>
            )}

            <DialogContent sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Razão Social / Nome Completo"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Categoria / Tipo"
                    placeholder="Ex: TI, Limpeza, Geral"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="CNPJ / CPF"
                    placeholder="00.000.000/0000-00"
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telefone / Celular"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={12}>
                  <TextField
                    fullWidth
                    label="E-mail de Contato"
                    type="email"
                    placeholder="contato@fornecedor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Endereço Completo"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observações Adicionais"
                    multiline
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={handleCloseDialog} color="inherit" size="large">Cancelar</Button>
              <Button type="submit" variant="contained" color="primary" size="large">
                {editingId ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default Fornecedores;
