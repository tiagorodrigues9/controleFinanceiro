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
  IconButton,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../utils/api';

const FormasPagamento = () => {
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCadastro, setOpenCadastro] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [formaSelecionada, setFormaSelecionada] = useState(null);
  const [formData, setFormData] = useState({ nome: '' });
  const [error, setError] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [formaToDelete, setFormaToDelete] = useState(null);

  useEffect(() => {
    fetchFormas();
  }, []);

  const fetchFormas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/formas-pagamento');
      setFormas(response.data);
    } catch (err) {
      setError('Erro ao carregar formas de pagamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCadastro = () => {
    setFormData({ nome: '' });
    setOpenCadastro(true);
  };

  const handleCloseCadastro = () => {
    setOpenCadastro(false);
  };

  const handleOpenEditar = (forma) => {
    setFormaSelecionada(forma);
    setFormData({ nome: forma.nome });
    setOpenEditar(true);
  };

  const handleCloseEditar = () => {
    setOpenEditar(false);
    setFormaSelecionada(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/formas-pagamento', formData);
      fetchFormas();
      window.dispatchEvent(new Event('formasUpdated'));
      handleCloseCadastro();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar forma de pagamento');
    }
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/formas-pagamento/${formaSelecionada._id}`, formData);
      fetchFormas();
      window.dispatchEvent(new Event('formasUpdated'));
      handleCloseEditar();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao editar forma de pagamento');
    }
  };

  const handleExcluir = (id) => {
    setFormaToDelete(id);
    setOpenDelete(true);
  };

  const confirmExcluir = async () => {
    if (!formaToDelete) return;
    try {
      await api.delete(`/formas-pagamento/${formaToDelete}`);
      fetchFormas();
      window.dispatchEvent(new Event('formasUpdated'));
    } catch (err) {
      setError('Erro ao excluir forma de pagamento');
    } finally {
      setOpenDelete(false);
      setFormaToDelete(null);
    }
  };

  const cancelExcluir = () => {
    setOpenDelete(false);
    setFormaToDelete(null);
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
        <Typography variant="h4">Formas de Pagamento</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCadastro}
        >
          Cadastrar Forma
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
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formas.map((forma) => (
              <TableRow key={forma._id}>
                <TableCell>{forma.nome}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenEditar(forma)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleExcluir(forma._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Cadastro */}
      <Dialog open={openCadastro} onClose={handleCloseCadastro} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Cadastrar Forma de Pagamento</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    variant="outlined"
                    required
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCadastro}>Cancelar</Button>
            <Button type="submit" variant="contained">Salvar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={openEditar} onClose={handleCloseEditar} maxWidth="sm" fullWidth>
        <form onSubmit={handleEditar}>
          <DialogTitle>Editar Forma de Pagamento</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    variant="outlined"
                    required
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditar}>Cancelar</Button>
            <Button type="submit" variant="contained">Salvar</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={openDelete} onClose={cancelExcluir}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja excluir esta forma de pagamento?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelExcluir}>Não</Button>
          <Button onClick={confirmExcluir} variant="contained" color="error">Sim, Excluir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormasPagamento;