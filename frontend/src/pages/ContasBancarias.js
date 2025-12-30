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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../utils/api';

const ContasBancarias = () => {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCadastro, setOpenCadastro] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    banco: '',
    numeroConta: '',
    agencia: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContas();
  }, []);

  const fetchContas = async () => {
    try {
      const response = await api.get('/contas-bancarias');
      setContas(response.data);
    } catch (err) {
      setError('Erro ao carregar contas bancárias');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCadastro = () => {
    setFormData({ nome: '', banco: '', numeroConta: '', agencia: '' });
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Contas Bancárias</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCadastro}
        >
          Cadastrar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Banco</TableCell>
              <TableCell>Agência</TableCell>
              <TableCell>Conta</TableCell>
              <TableCell>Saldo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contas.map((conta) => (
              <TableRow key={conta._id}>
                <TableCell>{conta.nome}</TableCell>
                <TableCell>{conta.banco}</TableCell>
                <TableCell>{conta.agencia || '-'}</TableCell>
                <TableCell>{conta.numeroConta || '-'}</TableCell>
                <TableCell>
                  R$ {conta.saldo?.toFixed(2).replace('.', ',') || '0,00'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Cadastro Avançado</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  label="Número da Conta"
                  margin="normal"
                  value={formData.numeroConta}
                  onChange={(e) => setFormData({ ...formData, numeroConta: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Agência"
                  margin="normal"
                  value={formData.agencia}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                />
              </AccordionDetails>
            </Accordion>
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

