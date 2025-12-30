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
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GastosDiarios = () => {
  const [gastos, setGastos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCadastro, setOpenCadastro] = useState(false);
  const [filtros, setFiltros] = useState({
    tipoDespesa: '',
    dataInicio: '',
    dataFim: '',
  });
  const [formData, setFormData] = useState({
    tipoDespesa: { grupo: '', subgrupo: '' },
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    local: '',
    observacao: '',
    formaPagamento: '',
    contaBancaria: '',
  });
  const [error, setError] = useState('');
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [gastoToDelete, setGastoToDelete] = useState(null);

  useEffect(() => {
    fetchGastos();
    fetchGrupos();
    fetchContasBancarias();
    fetchFormasPagamento();
  }, []);

  useEffect(() => {
    const handler = () => fetchFormasPagamento();
    window.addEventListener('formasUpdated', handler);
    return () => window.removeEventListener('formasUpdated', handler);
  }, []);

  const fetchGastos = async () => {
    try {
      const params = {};
      if (filtros.tipoDespesa) params.tipoDespesa = filtros.tipoDespesa;
      if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
      if (filtros.dataFim) params.dataFim = filtros.dataFim;

      const response = await api.get('/gastos', { params });
      setGastos(response.data);
    } catch (err) {
      setError('Erro ao carregar gastos');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrupos = async () => {
    try {
      const response = await api.get('/grupos');
      setGrupos(response.data);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  };

  const fetchContasBancarias = async () => {
    try {
      const response = await api.get('/contas-bancarias');
      setContasBancarias(response.data);
    } catch (err) {
      console.error('Erro ao carregar contas bancárias:', err);
    }
  };

  const fetchFormasPagamento = async () => {
    try {
      const response = await api.get('/formas-pagamento');
      setFormasPagamento(response.data);
    } catch (err) {
      console.error('Erro ao carregar formas de pagamento:', err);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, [filtros]);

  const handleOpenCadastro = () => {
    setFormData({
      tipoDespesa: { grupo: '', subgrupo: '' },
      valor: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      local: '',
      observacao: '',
      formaPagamento: '',
      contaBancaria: '',
    });
    setOpenCadastro(true);
  };

  const handleCloseCadastro = () => {
    setOpenCadastro(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/gastos', formData);
      fetchGastos();
      handleCloseCadastro();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar gasto');
    }
  };

  const handleConfirmDelete = async () => {
    if (!gastoToDelete) return;
    try {
      await api.delete(`/gastos/${gastoToDelete}`);
      setOpenDeleteConfirm(false);
      setGastoToDelete(null);
      fetchGastos();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir gasto');
      setOpenDeleteConfirm(false);
      setGastoToDelete(null);
    }
  };

  const cancelDelete = () => {
    setOpenDeleteConfirm(false);
    setGastoToDelete(null);
  };

  const grupoSelecionado = grupos.find((g) => g._id === formData.tipoDespesa.grupo);

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
        <Typography variant="h4">Gastos Diários</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCadastro}
        >
          Cadastrar Gasto
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Tipo de Despesa</InputLabel>
              <Select
                value={filtros.tipoDespesa}
                onChange={(e) => setFiltros({ ...filtros, tipoDespesa: e.target.value })}
                label="Tipo de Despesa"
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {grupos.map((grupo) => (
                  <MenuItem key={grupo._id} value={grupo._id}>
                    {grupo.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              label="Data Início"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              label="Data Fim"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tipo de Despesa</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Forma de Pagamento</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gastos.map((gasto) => (
              <TableRow key={gasto._id}>
                <TableCell>
                  {format(new Date(gasto.data), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {gasto.tipoDespesa?.grupo?.nome} - {gasto.tipoDespesa?.subgrupo}
                </TableCell>
                <TableCell>{gasto.local || '-'}</TableCell>
                <TableCell>R$ {gasto.valor.toFixed(2).replace('.', ',')}</TableCell>
                <TableCell>{gasto.formaPagamento}</TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => { setGastoToDelete(gasto._id); setOpenDeleteConfirm(true); }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDeleteConfirm} onClose={cancelDelete}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja excluir este gasto?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Não</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">Sim, Excluir</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCadastro} onClose={handleCloseCadastro} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Cadastrar Gasto</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Grupo</InputLabel>
                    <Select
                      value={formData.tipoDespesa.grupo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tipoDespesa: { ...formData.tipoDespesa, grupo: e.target.value, subgrupo: '' },
                        })
                      }
                      label="Grupo"
                    >
                      {grupos.map((grupo) => (
                        <MenuItem key={grupo._id} value={grupo._id}>
                          {grupo.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {grupoSelecionado && (
                  <Grid item xs={12}>
                    <FormControl fullWidth required variant="outlined">
                      <InputLabel>Subgrupo</InputLabel>
                      <Select
                        value={formData.tipoDespesa.subgrupo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tipoDespesa: { ...formData.tipoDespesa, subgrupo: e.target.value },
                          })
                        }
                        label="Subgrupo"
                      >
                        {grupoSelecionado.subgrupos.map((subgrupo, index) => (
                          <MenuItem key={index} value={subgrupo.nome}>
                            {subgrupo.nome}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Valor"
                    type="number"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    variant="outlined"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    variant="outlined"
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Local"
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observação"
                    multiline
                    rows={3}
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Forma de Pagamento</InputLabel>
                    <Select
                      value={formData.formaPagamento}
                      onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                      label="Forma de Pagamento"
                    >
                      {formasPagamento.map((f) => (
                        <MenuItem key={f._id} value={f.nome}>{f.nome}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Conta Bancária</InputLabel>
                    <Select
                      value={formData.contaBancaria}
                      onChange={(e) => setFormData({ ...formData, contaBancaria: e.target.value })}
                      label="Conta Bancária"
                    >
                      {contasBancarias.map((conta) => (
                        <MenuItem key={conta._id} value={conta._id}>
                          {conta.nome} - {conta.banco}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
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

export default GastosDiarios;

