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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import api from '../utils/api';

const Cartoes = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [cartoes, setCartoes] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [cartaoEdit, setCartaoEdit] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Crédito',
    banco: '',
    limite: '',
    diaFatura: '',
    dataVencimento: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cartaoToDelete, setCartaoToDelete] = useState(null);

  useEffect(() => {
    fetchCartoes();
    fetchContasBancarias();
  }, []);

  const fetchCartoes = async () => {
    try {
      const response = await api.get('/cartoes');
      setCartoes(response.data);
    } catch (err) {
      setError('Erro ao carregar cartões');
    } finally {
      setLoading(false);
    }
  };

  const fetchContasBancarias = async () => {
    try {
      const response = await api.get('/contas-bancarias');
      setContasBancarias(response.data);
      
      // Extrair bancos únicos das contas bancárias
      const bancosUnicos = [...new Set(response.data.map(conta => conta.banco).filter(banco => banco))];
      setBancos(bancosUnicos);
    } catch (err) {
      console.error('Erro ao carregar contas bancárias:', err);
    }
  };

  const handleOpenDialog = (cartao = null) => {
    if (cartao) {
      setEditMode(true);
      setCartaoEdit(cartao);
      setFormData({
        nome: cartao.nome,
        tipo: cartao.tipo,
        banco: cartao.banco,
        limite: cartao.limite || '',
        diaFatura: cartao.diaFatura || '',
        diaVencimento: cartao.diaVencimento || '',
      });
    } else {
      setEditMode(false);
      setCartaoEdit(null);
      setFormData({
        nome: '',
        tipo: 'Crédito',
        banco: '',
        limite: '',
        diaFatura: '',
        diaVencimento: '',
      });
    }
    setOpenDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCartaoEdit(null);
    setFormData({
      nome: '',
      tipo: 'Crédito',
      banco: '',
      limite: '',
      diaFatura: '',
      dataVencimento: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Enviando dados do cartão:', formData);
      
      const dadosParaEnviar = {
        nome: formData.nome,
        tipo: formData.tipo,
        banco: formData.banco,
        ...(formData.tipo === 'Crédito' && {
          ...(formData.limite && { limite: formData.limite }),
          ...(formData.diaFatura && { diaFatura: formData.diaFatura }),
          ...(formData.dataVencimento && { dataVencimento: formData.dataVencimento })
        })
      };
      
      console.log('Dados formatados para envio:', dadosParaEnviar);
      
      if (editMode) {
        await api.put(`/cartoes/${cartaoEdit._id}`, dadosParaEnviar);
      } else {
        await api.post('/cartoes', dadosParaEnviar);
      }
      fetchCartoes();
      handleCloseDialog();
      setError('');
    } catch (err) {
      console.error('Erro detalhado:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erro ao salvar cartão';
      setError(errorMessage);
    }
  };

  const handleInativar = async (id) => {
    try {
      await api.put(`/cartoes/${id}/inativar`);
      fetchCartoes();
    } catch (err) {
      setError('Erro ao alterar status do cartão');
    }
  };

  const handleExcluir = async (id) => {
    setCartaoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/cartoes/${cartaoToDelete}`);
      fetchCartoes();
      setDeleteDialogOpen(false);
      setCartaoToDelete(null);
    } catch (err) {
      setError('Erro ao excluir cartão');
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setCartaoToDelete(null);
  };

  const renderCartaoCard = (cartao) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              {cartao.nome}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {cartao.banco}
            </Typography>
          </Box>
          <Chip
            label={cartao.tipo}
            color={cartao.tipo === 'Crédito' ? 'primary' : 'secondary'}
            size="small"
          />
        </Box>
        
        {(cartao.tipo === 'Crédito' || cartao.tipo === 'Débito') && (
          <Box mb={1}>
            {cartao.tipo === 'Crédito' && (
              <Typography variant="body2" color="text.secondary">
                Limite: R$ {cartao.limite?.toFixed(2).replace('.', ',') || '0,00'}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {cartao.tipo === 'Crédito' ? 'Dia da Fatura: ' : ''}{cartao.diaFatura || 'Não definido'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vencimento: {cartao.dataVencimento ? new Date(cartao.dataVencimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Não definido'}
            </Typography>
          </Box>
        )}
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Chip
            label={cartao.ativo ? 'Ativo' : 'Inativo'}
            color={cartao.ativo ? 'success' : 'default'}
            size="small"
          />
          <Box>
            <IconButton size="small" onClick={() => handleOpenDialog(cartao)}>
              <EditIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleInativar(cartao._id)}
              color={cartao.ativo ? 'warning' : 'success'}
            >
              {cartao.ativo ? <DeleteIcon /> : <AddIcon />}
            </IconButton>
            <IconButton size="small" color="error" onClick={() => handleExcluir(cartao._id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
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
        <Typography variant="h4">Meus Cartões</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Novo Cartão
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isMobile ? (
        <Box>
          {cartoes.map((cartao) => (
            <Box key={cartao._id}>
              {renderCartaoCard(cartao)}
            </Box>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Banco</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Limite</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cartoes.map((cartao) => (
                <TableRow key={cartao._id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{cartao.nome}</TableCell>
                  <TableCell>{cartao.banco}</TableCell>
                  <TableCell>
                    <Chip
                      label={cartao.tipo}
                      color={cartao.tipo === 'Crédito' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {cartao.tipo === 'Crédito' 
                      ? `R$ ${cartao.limite?.toFixed(2).replace('.', ',') || '0,00'}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {(cartao.tipo === 'Crédito' || cartao.tipo === 'Débito') 
                      ? `Dia Fatura: ${cartao.diaFatura || 'Não definido'} | Vencimento: ${cartao.dataVencimento ? new Date(cartao.dataVencimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Não definido'}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cartao.ativo ? 'Ativo' : 'Inativo'}
                      color={cartao.ativo ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenDialog(cartao)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleInativar(cartao._id)}
                      color={cartao.ativo ? 'warning' : 'success'}
                    >
                      {cartao.ativo ? <DeleteIcon /> : <AddIcon />}
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleExcluir(cartao._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog Cadastro/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <CreditCardIcon />
              {editMode ? 'Editar Cartão' : 'Novo Cartão'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome do Cartão"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    variant="outlined"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required variant="outlined">
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
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Banco</InputLabel>
                    <Select
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      label="Banco"
                    >
                      {bancos.map((banco, index) => (
                        <MenuItem key={index} value={banco}>
                          {banco}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {(formData.tipo === 'Crédito' || formData.tipo === 'Débito') && (
                  <>
                    {formData.tipo === 'Crédito' && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Limite"
                          type="number"
                          value={formData.limite}
                          onChange={(e) => setFormData({ ...formData, limite: e.target.value })}
                          variant="outlined"
                          helperText="Opcional - Informe apenas para cartões de crédito"
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                    )}
                    {formData.tipo === 'Crédito' && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Dia da Fatura"
                          type="number"
                          value={formData.diaFatura}
                          onChange={(e) => setFormData({ ...formData, diaFatura: e.target.value })}
                          variant="outlined"
                          helperText="Opcional - Dia de fechamento da fatura (1-31)"
                          inputProps={{ min: 1, max: 31 }}
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} sm={formData.tipo === 'Crédito' ? 6 : 12}>
                      <TextField
                        fullWidth
                        label="Data de Vencimento"
                        type="month"
                        value={formData.dataVencimento}
                        onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                        variant="outlined"
                        helperText={formData.tipo === 'Crédito' ? "Opcional - Mês/Ano de vencimento da fatura" : "Opcional - Mês/Ano de vencimento"}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {editMode ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            Confirmar Exclusão
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este cartão? Esta ação não poderá ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Cartoes;
