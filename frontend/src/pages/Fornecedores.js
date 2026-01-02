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
  Chip,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../utils/api';

const Fornecedores = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCadastro, setOpenCadastro] = useState(false);
  const [formData, setFormData] = useState({ nome: '' });
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState(null);

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
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      const response = await api.get('/fornecedores');
      setFornecedores(response.data);
    } catch (err) {
      setError('Erro ao carregar fornecedores');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fornecedores', formData);
      fetchFornecedores();
      handleCloseCadastro();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar fornecedor');
    }
  };

  const handleInativar = (id) => {
    setSelectedFornecedor(id);
    setOpenConfirm(true);
  };

  const confirmInativar = async () => {
    if (!selectedFornecedor) return;
    try {
      await api.put(`/fornecedores/${selectedFornecedor}/inativar`);
      fetchFornecedores();
      setOpenConfirm(false);
      setSelectedFornecedor(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao inativar fornecedor');
      setOpenConfirm(false);
      setSelectedFornecedor(null);
    }
  };

  const cancelInativar = () => {
    setOpenConfirm(false);
    setSelectedFornecedor(null);
  };

  // Componente para renderizar cards no mobile
  const FornecedorCard = ({ fornecedor }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {fornecedor.nome}
          </Typography>
          <Chip
            label={isActive(fornecedor) ? 'Ativo' : 'Inativo'}
            color={isActive(fornecedor) ? 'success' : 'default'}
            size="small"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={2}>
          Tipo: {fornecedor.tipo}
        </Typography>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        {isActive(fornecedor) && (
          <IconButton
            size="small"
            color="error"
            onClick={() => handleInativar(fornecedor._id)}
            title="Inativar"
          >
            <DeleteIcon />
          </IconButton>
        )}
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
      <Box sx={{ position: 'relative', mb: 2, minHeight: 40 }}>
        <Typography variant="h4">Fornecedores</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCadastro}
          size="small"
          sx={{ position: 'absolute', right: 0, top: 0 }}
        >
          Cadastrar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Layout responsivo: Cards para mobile, Tabela para desktop */}
      {isMobile ? (
        <Box>
          {fornecedores.map((fornecedor) => (
            <FornecedorCard key={fornecedor._id} fornecedor={fornecedor} />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fornecedores.map((fornecedor) => (
                <TableRow key={fornecedor._id}>
                  <TableCell>{fornecedor.nome}</TableCell>
                  <TableCell>{fornecedor.tipo}</TableCell>
                  <TableCell>
                    <Chip
                      label={isActive(fornecedor) ? 'Ativo' : 'Inativo'}
                      color={isActive(fornecedor) ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {isActive(fornecedor) && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleInativar(fornecedor._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de confirmação para inativar fornecedor */}
      <Dialog open={openConfirm} onClose={cancelInativar}>
        <DialogTitle>Confirmar Inativação</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja inativar este fornecedor?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelInativar}>Não</Button>
          <Button onClick={confirmInativar} variant="contained" color="error">Sim, Inativar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de cadastro */}
      <Dialog open={openCadastro} onClose={handleCloseCadastro} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Cadastrar Fornecedor</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome"
              margin="normal"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            <TextField
              fullWidth
              label="Tipo"
              margin="normal"
              helperText="Opcional - se não informado, será 'Geral'"
              value={formData.tipo || ''}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
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

export default Fornecedores;

