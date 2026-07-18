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
  Avatar,
  Tooltip,
  ThemeProvider,
  createTheme,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CreditCard as CreditCardIcon,
  ToggleOff as ToggleOffIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  CalendarMonth as CalendarIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import api from '../utils/api';

// Tema Premium Indigo/Emerald
const cartoesTheme = createTheme({
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
          textTransform: 'none' as const,
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
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
        body: { color: '#334155', borderBottom: '1px solid #f1f5f9' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
      },
    },
  },
});

// Types
interface ContaBancaria {
  _id: string;
  nome: string;
  banco: string;
  ativo: boolean;
}

interface Cartao {
  _id: string;
  nome: string;
  tipo: 'Crédito' | 'Débito';
  banco: string;
  limite?: number;
  diaFatura?: number;
  diaVencimento?: number;
  dataVencimento?: string;
  ativo: boolean;
}

interface FormData {
  nome: string;
  tipo: string;
  banco: string;
  limite: string;
  diaFatura: string;
  diaVencimento: string;
  dataVencimento: string;
}

const emptyForm: FormData = {
  nome: '',
  tipo: 'Crédito',
  banco: '',
  limite: '',
  diaFatura: '',
  diaVencimento: '',
  dataVencimento: '',
};

const Cartoes: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [bancos, setBancos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [cartaoEdit, setCartaoEdit] = useState<Cartao | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [search, setSearch] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cartaoToDelete, setCartaoToDelete] = useState<Cartao | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | '' }>({ text: '', type: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cartoesRes, contasRes] = await Promise.all([
        api.get('/cartoes'),
        api.get('/contas-bancarias'),
      ]);
      setCartoes(cartoesRes.data);
      const bancosUnicos = Array.from(new Set(contasRes.data.map((c: ContaBancaria) => c.banco).filter(Boolean))) as string[];
      setBancos(bancosUnicos);
    } catch {
      setMessage({ text: 'Erro ao carregar dados', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (cartao: Cartao | null = null) => {
    if (cartao) {
      setEditMode(true);
      setCartaoEdit(cartao);
      setFormData({
        nome: cartao.nome,
        tipo: cartao.tipo,
        banco: cartao.banco,
        limite: cartao.limite?.toString() || '',
        diaFatura: cartao.diaFatura?.toString() || '',
        diaVencimento: cartao.diaVencimento?.toString() || '',
        dataVencimento: cartao.dataVencimento ? cartao.dataVencimento.substring(0, 7) : '',
      });
    } else {
      setEditMode(false);
      setCartaoEdit(null);
      setFormData(emptyForm);
    }
    setOpenDialog(true);
    setMessage({ text: '', type: '' });
  };

  const handleCloseDialog = () => {
    if (!isSubmitting) {
      setOpenDialog(false);
      setEditMode(false);
      setCartaoEdit(null);
      setFormData(emptyForm);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dadosParaEnviar: Record<string, unknown> = {
        nome: formData.nome,
        tipo: formData.tipo,
        banco: formData.banco,
        ...(formData.tipo === 'Crédito' && {
          ...(formData.limite && { limite: parseFloat(formData.limite) }),
          ...(formData.diaFatura && { diaFatura: parseInt(formData.diaFatura) }),
          ...(formData.diaVencimento && { diaVencimento: parseInt(formData.diaVencimento) }),
        }),
        ...(formData.dataVencimento && { dataVencimento: formData.dataVencimento }),
      };

      if (editMode && cartaoEdit) {
        await api.put(`/cartoes/${cartaoEdit._id}`, dadosParaEnviar);
        setMessage({ text: 'Cartão atualizado com sucesso!', type: 'success' });
      } else {
        await api.post('/cartoes', dadosParaEnviar);
        setMessage({ text: 'Cartão cadastrado com sucesso!', type: 'success' });
      }
      fetchData();
      handleCloseDialog();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erro ao salvar cartão';
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInativar = async (cartao: Cartao) => {
    try {
      await api.put(`/cartoes/${cartao._id}/inativar`);
      setMessage({ text: `Cartão ${cartao.ativo ? 'inativado' : 'ativado'} com sucesso!`, type: 'success' });
      fetchData();
    } catch {
      setMessage({ text: 'Erro ao alterar status do cartão', type: 'error' });
    }
  };

  const handleOpenDelete = (cartao: Cartao) => {
    setCartaoToDelete(cartao);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!cartaoToDelete) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/cartoes/${cartaoToDelete._id}`);
      setMessage({ text: 'Cartão excluído com sucesso!', type: 'success' });
      fetchData();
      setDeleteDialogOpen(false);
      setCartaoToDelete(null);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || 'Erro ao excluir cartão', type: 'error' });
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredCartoes = cartoes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.banco.toLowerCase().includes(search.toLowerCase())
  );

  const getCardColor = (tipo: string) => tipo === 'Crédito' ? '#6366f1' : '#10b981';

  return (
    <ThemeProvider theme={cartoesTheme}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
          <Typography variant="h4">Meus Cartões</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} size="large">
            Novo Cartão
          </Button>
        </Box>

        {message.text && (
          <Alert severity={message.type as any} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setMessage({ text: '', type: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Buscar cartão por nome ou banco..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* Content */}
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, mb: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredCartoes.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CreditCardIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {search ? 'Nenhum cartão encontrado' : 'Nenhum cartão cadastrado'}
              </Typography>
              {!search && (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mt: 1 }}>
                  Cadastrar primeiro cartão
                </Button>
              )}
            </Box>
          ) : isMobile ? (
            // Mobile Cards
            <Box sx={{ p: 1 }}>
              {filteredCartoes.map((cartao) => (
                <Card key={cartao._id} sx={{
                  mb: 2,
                  borderRadius: 3,
                  borderLeft: `4px solid ${getCardColor(cartao.tipo)}`,
                  opacity: cartao.ativo ? 1 : 0.7,
                  transition: 'all 0.2s',
                }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ bgcolor: getCardColor(cartao.tipo), width: 40, height: 40 }}>
                          <CreditCardIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{
                            color: cartao.ativo ? 'text.primary' : 'text.secondary',
                            fontStyle: cartao.ativo ? 'normal' : 'italic',
                          }}>
                            {cartao.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cartao.banco}
                          </Typography>
                        </Box>
                      </Box>
                      <Box display="flex" gap={0.5}>
                        <Chip label={cartao.tipo} size="small" sx={{
                          bgcolor: `${getCardColor(cartao.tipo)}15`,
                          color: getCardColor(cartao.tipo),
                          fontWeight: 600,
                        }} />
                        <Chip
                          label={cartao.ativo ? 'Ativo' : 'Inativo'}
                          color={cartao.ativo ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 600, opacity: cartao.ativo ? 1 : 0.8 }}
                        />
                      </Box>
                    </Box>

                    {cartao.tipo === 'Crédito' && (
                      <Box sx={{ bgcolor: '#f8fafc', borderRadius: 2, p: 1.5, mb: 1 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Limite</Typography>
                            <Typography variant="body2" fontWeight="bold">{formatCurrency(cartao.limite)}</Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" color="text.secondary">Fechamento</Typography>
                            <Typography variant="body2" fontWeight="bold">{cartao.diaFatura || '-'}</Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="caption" color="text.secondary">Vencimento</Typography>
                            <Typography variant="body2" fontWeight="bold">{cartao.diaVencimento || '-'}</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}

                    {cartao.dataVencimento && (
                      <Typography variant="caption" color="text.secondary">
                        Validade: {new Date(cartao.dataVencimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, pt: 0 }}>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenDialog(cartao)}>Editar</Button>
                    <Button
                      size="small"
                      color={cartao.ativo ? 'warning' : 'success'}
                      startIcon={cartao.ativo ? <ToggleOffIcon /> : <CheckCircleIcon />}
                      onClick={() => handleInativar(cartao)}
                    >
                      {cartao.ativo ? 'Inativar' : 'Ativar'}
                    </Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleOpenDelete(cartao)}>
                      Excluir
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop Table
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cartão</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Limite</TableCell>
                    <TableCell>Fatura</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCartoes.map((cartao) => (
                    <TableRow key={cartao._id} hover sx={{ opacity: cartao.ativo ? 1 : 0.65 }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ bgcolor: getCardColor(cartao.tipo), width: 36, height: 36 }}>
                            <CreditCardIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold" sx={{
                              color: cartao.ativo ? 'text.primary' : 'text.secondary',
                              fontStyle: cartao.ativo ? 'normal' : 'italic',
                            }}>
                              {cartao.nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{cartao.banco}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={cartao.tipo} size="small" sx={{
                          bgcolor: `${getCardColor(cartao.tipo)}15`,
                          color: getCardColor(cartao.tipo),
                          fontWeight: 600,
                        }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {cartao.tipo === 'Crédito' ? formatCurrency(cartao.limite) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {cartao.tipo === 'Crédito' ? (
                          <Box>
                            <Typography variant="body2">
                              Fecha dia <strong>{cartao.diaFatura || '-'}</strong> · Vence dia <strong>{cartao.diaVencimento || '-'}</strong>
                            </Typography>
                            {cartao.dataVencimento && (
                              <Typography variant="caption" color="text.secondary">
                                Validade: {new Date(cartao.dataVencimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                              </Typography>
                            )}
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cartao.ativo ? 'Ativo' : 'Inativo'}
                          color={cartao.ativo ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 600, opacity: cartao.ativo ? 1 : 0.8 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog(cartao)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={cartao.ativo ? 'Inativar' : 'Ativar'}>
                          <IconButton
                            size="small"
                            color={cartao.ativo ? 'warning' : 'success'}
                            onClick={() => handleInativar(cartao)}
                          >
                            {cartao.ativo ? <ToggleOffIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" color="error" onClick={() => handleOpenDelete(cartao)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Dialog Cadastro/Edição */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ borderBottom: '1px solid #f1f5f9', pb: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <CreditCardIcon color="primary" />
                {editMode ? 'Editar Cartão' : 'Novo Cartão'}
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={2.5} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth required
                    label="Nome do Cartão"
                    placeholder="Ex: Nubank Gold, Inter Mastercard..."
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      label="Tipo"
                    >
                      <MenuItem value="Crédito">Crédito</MenuItem>
                      <MenuItem value="Débito">Débito</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={bancos}
                    value={formData.banco}
                    onInputChange={(e, newValue) => {
                      setFormData({ ...formData, banco: newValue });
                    }}
                    onChange={(e, newValue) => {
                      if (newValue) {
                        setFormData({ ...formData, banco: newValue });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Banco"
                        required
                        placeholder="Selecione ou digite novo..."
                      />
                    )}
                  />
                </Grid>

                {formData.tipo === 'Crédito' && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Limite"
                        type="number"
                        value={formData.limite}
                        onChange={(e) => setFormData({ ...formData, limite: e.target.value })}
                        helperText="Opcional — Informe o limite do cartão de crédito"
                        InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Dia de Fechamento"
                        type="number"
                        value={formData.diaFatura}
                        onChange={(e) => setFormData({ ...formData, diaFatura: e.target.value })}
                        helperText="Dia que a fatura fecha (1–31)"
                        inputProps={{ min: 1, max: 31 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Dia de Vencimento"
                        type="number"
                        value={formData.diaVencimento}
                        onChange={(e) => setFormData({ ...formData, diaVencimento: e.target.value })}
                        helperText="Dia que a fatura vence (1–31)"
                        inputProps={{ min: 1, max: 31 }}
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Validade do Cartão"
                    type="month"
                    value={formData.dataVencimento}
                    onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                    helperText="Opcional — Mês/Ano impresso no cartão"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={handleCloseDialog} color="inherit" disabled={isSubmitting}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {isSubmitting ? 'Salvando...' : editMode ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog Exclusão */}
        <Dialog open={deleteDialogOpen} onClose={() => !isSubmitting && setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir o cartão <strong>{cartaoToDelete?.nome}</strong>?
              {' '}Se houver faturas ou gastos vinculados, a exclusão será bloqueada automaticamente.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" disabled={isSubmitting}>Cancelar</Button>
            <Button
              onClick={confirmDelete}
              variant="contained"
              color="error"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default Cartoes;
