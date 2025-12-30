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
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import api from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Extrato = () => {
  const [extratos, setExtratos] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openLancamento, setOpenLancamento] = useState(false);
  const [openSaldoInicial, setOpenSaldoInicial] = useState(false);
  const [filtros, setFiltros] = useState({
    contaBancaria: '',
    tipoDespesa: '',
  });
  const [formData, setFormData] = useState({
    contaBancaria: '',
    tipo: 'Saída',
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    motivo: '',
  });
  const [saldoInicialData, setSaldoInicialData] = useState({
    contaBancaria: '',
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
  });
  const [openConfirmEstorno, setOpenConfirmEstorno] = useState(false);
  const [estornoId, setEstornoId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExtratos();
    fetchContasBancarias();
    fetchGrupos();
  }, []);

  useEffect(() => {
    fetchExtratos();
  }, [filtros]);

  const fetchExtratos = async () => {
    try {
      const params = {};
      if (filtros.contaBancaria) params.contaBancaria = filtros.contaBancaria;
      if (filtros.tipoDespesa) params.tipoDespesa = filtros.tipoDespesa;

      const response = await api.get('/extrato', { params });
      setExtratos(response.data.extratos || []);
      setTotalSaldo(response.data.totalSaldo || 0);
    } catch (err) {
      setError('Erro ao carregar extrato');
    } finally {
      setLoading(false);
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

  const fetchGrupos = async () => {
    try {
      const response = await api.get('/grupos');
      setGrupos(response.data);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  };

  useEffect(() => {
    fetchExtratos();
  }, [filtros]);

  const handleOpenLancamento = () => {
    setFormData({
      contaBancaria: '',
      tipo: 'Saída',
      valor: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      motivo: '',
    });
    setOpenLancamento(true);
  };

  const handleCloseLancamento = () => {
    setOpenLancamento(false);
  };

  const handleSubmitLancamento = async (e) => {
    e.preventDefault();
    try {
      await api.post('/extrato', formData);
      fetchExtratos();
      handleCloseLancamento();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar lançamento');
    }
  };

  const handleOpenSaldoInicial = () => {
    setSaldoInicialData({
      contaBancaria: '',
      valor: '',
      data: format(new Date(), 'yyyy-MM-dd'),
    });
    setOpenSaldoInicial(true);
  };

  const handleCloseSaldoInicial = () => {
    setOpenSaldoInicial(false);
  };

  const handleSubmitSaldoInicial = async (e) => {
    e.preventDefault();
    try {
      await api.post('/extrato/saldo-inicial', saldoInicialData);
      fetchExtratos();
      handleCloseSaldoInicial();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao lançar saldo inicial');
    }
  };

  const handleEstornar = (id) => {
    setEstornoId(id);
    setOpenConfirmEstorno(true);
  };

  const confirmEstorno = async () => {
    try {
      await api.post(`/extrato/${estornoId}/estornar`);
      fetchExtratos();
      setOpenConfirmEstorno(false);
      setEstornoId(null);
    } catch (err) {
      setError('Erro ao estornar lançamento');
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
        <Typography variant="h4">Extrato Financeiro</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AccountBalanceWalletIcon />}
            onClick={handleOpenSaldoInicial}
            sx={{ mr: 1 }}
          >
            Saldo Inicial
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenLancamento}
          >
            Lançamento
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Conta Bancária</InputLabel>
              <Select
                value={filtros.contaBancaria}
                onChange={(e) => setFiltros({ ...filtros, contaBancaria: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                {contasBancarias.map((conta) => (
                  <MenuItem key={conta._id} value={conta._id}>
                    {conta.nome} - {conta.banco}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Despesa</InputLabel>
              <Select
                value={filtros.tipoDespesa}
                onChange={(e) => setFiltros({ ...filtros, tipoDespesa: e.target.value })}
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
        </Grid>
      </Paper>

      {/* Saldo da Conta Selecionada */}
      {filtros.contaBancaria && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Saldo Atual da Conta
          </Typography>
          <Chip
            label={`R$ ${totalSaldo.toFixed(2).replace('.', ',')}`}
            color={totalSaldo >= 0 ? 'success' : 'error'}
            variant="outlined"
            size="large"
          />
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Conta Bancária</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {extratos.map((extrato) => (
              <TableRow key={extrato._id}>
                <TableCell>
                  {format(new Date(extrato.data), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>{extrato.contaBancaria?.nome}</TableCell>
                <TableCell>
                  <Chip
                    label={extrato.tipo}
                    color={
                      extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial'
                        ? 'success'
                        : 'error'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{extrato.motivo}</TableCell>
                <TableCell>
                  R$ {extrato.valor.toFixed(2).replace('.', ',')}
                </TableCell>
                <TableCell>
                  {extrato.estornado ? (
                    <Chip label="Estornado" color="default" size="small" />
                  ) : (
                    <Chip label="Ativo" color="success" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {!extrato.estornado && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleEstornar(extrato._id)}
                    >
                      Estornar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openLancamento} onClose={handleCloseLancamento} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitLancamento}>
          <DialogTitle>Novo Lançamento</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
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
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      label="Tipo"
                    >
                      <MenuItem value="Entrada">Entrada</MenuItem>
                      <MenuItem value="Saída">Saída</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
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
                    label="Motivo"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    variant="outlined"
                    required
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLancamento}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={openSaldoInicial} onClose={handleCloseSaldoInicial} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitSaldoInicial}>
          <DialogTitle>Lançar Saldo Inicial</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Conta Bancária</InputLabel>
              <Select
                value={saldoInicialData.contaBancaria}
                onChange={(e) =>
                  setSaldoInicialData({ ...saldoInicialData, contaBancaria: e.target.value })
                }
              >
                {contasBancarias.map((conta) => (
                  <MenuItem key={conta._id} value={conta._id}>
                    {conta.nome} - {conta.banco}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Valor"
              type="number"
              margin="normal"
              required
              value={saldoInicialData.valor}
              onChange={(e) =>
                setSaldoInicialData({ ...saldoInicialData, valor: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Data"
              type="date"
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
              value={saldoInicialData.data}
              onChange={(e) =>
                setSaldoInicialData({ ...saldoInicialData, data: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSaldoInicial}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Confirmar Estorno */}
      <Dialog open={openConfirmEstorno} onClose={() => setOpenConfirmEstorno(false)}>
        <DialogTitle>Confirmar Estorno</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja estornar este lançamento?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmEstorno(false)}>Não</Button>
          <Button onClick={confirmEstorno} variant="contained" color="error">
            Sim, Estornar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Extrato;

