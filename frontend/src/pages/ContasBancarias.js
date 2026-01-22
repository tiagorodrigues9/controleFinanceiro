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
  CircularProgress,
  Alert,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../utils/api';

const ContasBancarias = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCadastro, setOpenCadastro] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    banco: '',
  });
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [idToInactivate, setIdToInactivate] = useState(null);

  const isActive = (item) => {
    const v = item?.ativo;
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

  useEffect(() => {
    fetchContas();
  }, []);

  const fetchContas = async () => {
    try {
      console.log('🔍 ContasBancarias - Buscando contas bancárias...');
      const response = await api.get('/contas-bancarias');
      console.log('📊 ContasBancarias - Dados recebidos:', response.data);
      console.log('📊 ContasBancarias - Quantidade:', response.data?.length || 0);
      setContas(response.data);
    } catch (err) {
      console.error('❌ ContasBancarias - Erro:', err);
      setError('Erro ao carregar contas bancárias');
    } finally {
      setLoading(false);
    }
  };

  // Calcular saldo total de todas as contas
  const calcularSaldoTotal = () => {
    return contas
      .filter(conta => isActive(conta)) // Apenas contas ativas
      .reduce((total, conta) => {
        const saldo = parseFloat(conta.saldo) || 0;
        return total + saldo;
      }, 0);
  };

  const cancelInactivate = () => {
    setOpenConfirm(false);
    setIdToInactivate(null);
  };

  const confirmInactivate = async () => {
    if (!idToInactivate) return;
    try {
      await api.delete(`/contas-bancarias/${idToInactivate}`);
      fetchContas();
    } catch (err) {
      setError('Erro ao inativar conta bancária');
    } finally {
      setOpenConfirm(false);
      setIdToInactivate(null);
    }
  };

  const handleOpenCadastro = () => {
    setFormData({ nome: '', banco: '' });
    setOpenCadastro(true);
  };

  const handleCloseCadastro = () => {
    setOpenCadastro(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contas-bancarias', formData);
      fetchContas();
      handleCloseCadastro();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar conta bancária');
    }
  };

  // Componente para renderizar cards no mobile
  const ContaBancariaCard = ({ conta }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {conta.nome}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {conta.banco}
          </Typography>
        </Box>
        
        <Box mb={1}>
          <Typography variant="h6" color="primary" fontWeight="bold">
            Saldo: R$ {(conta.saldo || 0).toFixed(2).replace('.', ',')}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <IconButton
          size="small"
          color="error"
          onClick={() => { setIdToInactivate(conta._id); setOpenConfirm(true); }}
          title="Inativar"
        >
          <DeleteIcon />
        </IconButton>
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
        <Typography variant="h4">Contas Bancárias</Typography>
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

      {/* Quadro de Saldo Total */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 2,
              backgroundColor: '#1976d2', // Azul Material-UI
              color: 'white',
              borderRadius: 2,
              boxShadow: 3
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
              Saldo Total
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              R$ {calcularSaldoTotal().toFixed(2).replace('.', ',')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {contas.filter(conta => isActive(conta)).length} conta(s) ativa(s)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Layout responsivo: Cards para mobile, Tabela para desktop */}
      {isMobile ? (
        <Box>
          {contas.map((conta) => (
            <ContaBancariaCard key={conta._id} conta={conta} />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Banco</TableCell>
                <TableCell>Saldo</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contas.map((conta) => (
                <TableRow key={conta._id}>
                  <TableCell>{conta.nome}</TableCell>
                  <TableCell>{conta.banco}</TableCell>
                  <TableCell>
                    R$ {conta.saldo?.toFixed(2).replace('.', ',') || '0,00'}
                  </TableCell>
                  <TableCell>
                    {isActive(conta) ? (
                      <IconButton size="small" color="error" onClick={() => { setIdToInactivate(conta._id); setOpenConfirm(true); }}>
                        <DeleteIcon />
                      </IconButton>
                    ) : (
                      <Typography variant="caption" color="textSecondary">Inativa</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openConfirm} onClose={cancelInactivate}>
        <DialogTitle>Confirmar Inativação</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja inativar esta conta bancária? Ela não poderá mais ser usada.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelInactivate}>Não</Button>
          <Button onClick={confirmInactivate} variant="contained" color="error">Sim, Inativar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCadastro} onClose={handleCloseCadastro} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Cadastrar Conta Bancária</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome da Conta"
              margin="normal"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            <TextField
              fullWidth
              label="Banco"
              margin="normal"
              required
              value={formData.banco}
              onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCadastro}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ContasBancarias;

