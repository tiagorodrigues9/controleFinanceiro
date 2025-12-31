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
  CardActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import api from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Extrato = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [extratos, setExtratos] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openLancamento, setOpenLancamento] = useState(false);
  const [openSaldoInicial, setOpenSaldoInicial] = useState(false);
  const [filtros, setFiltros] = useState({
    contaBancaria: '',
    tipoDespesa: '',
    cartao: '',
    dataInicio: '',
    dataFim: '',
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
    fetchCartoes();
  }, []);

  useEffect(() => {
    fetchExtratos();
  }, [filtros]);

  const fetchExtratos = async () => {
    try {
      const params = {};
      if (filtros.contaBancaria) params.contaBancaria = filtros.contaBancaria;
      if (filtros.tipoDespesa) params.tipoDespesa = filtros.tipoDespesa;
      if (filtros.cartao) params.cartao = filtros.cartao;
      if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
      if (filtros.dataFim) params.dataFim = filtros.dataFim;

      const response = await api.get('/extrato', { params });
      setExtratos(response.data.extratos || []);
      setTotalSaldo(response.data.totalSaldo || 0);
      setTotalEntradas(response.data.totalEntradas || 0);
      setTotalSaidas(response.data.totalSaidas || 0);
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

  const fetchCartoes = async () => {
    try {
      const response = await api.get('/cartoes');
      setCartoes(response.data.filter(cartao => cartao.ativo));
    } catch (err) {
      console.error('Erro ao carregar cartões:', err);
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

  const limparFiltros = () => {
    setFiltros({
      contaBancaria: '',
      tipoDespesa: '',
      cartao: '',
      dataInicio: '',
      dataFim: '',
    });
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

  // Componente para renderizar cards no mobile
  const ExtratoCard = ({ extrato }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {extrato.motivo || 'Sem motivo'}
          </Typography>
          <Chip
            label={extrato.tipo}
            color={
              extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial'
                ? 'success'
                : 'error'
            }
            size="small"
          />
        </Box>
        
        <Box mb={1}>
          <Typography variant="body2" color="text.secondary">
            Data: {format(new Date(extrato.data), 'dd/MM/yyyy', { locale: ptBR })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Conta: {extrato.contaBancaria?.nome || 'N/A'}
          </Typography>
        </Box>
        
        <Typography variant="h6" color={extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial' ? 'success.main' : 'error.main'} fontWeight="bold">
          {extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial' ? '+' : '-'} R$ {extrato.valor.toFixed(2).replace('.', ',')}
        </Typography>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        {extrato.tipo !== 'Saldo Inicial' && (
          <IconButton
            size="small"
            color="warning"
            onClick={() => handleEstornar(extrato._id)}
            title="Estornar"
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
      <Box sx={{ position: 'relative', mb: 2, minHeight: 80 }}>
        <Box>
          <Typography variant="h4">Extrato</Typography>
          <Typography variant="h4">Financeiro</Typography>
        </Box>
        <Box sx={{ position: 'absolute', right: 0, top: 8, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AccountBalanceWalletIcon />}
            onClick={handleOpenSaldoInicial}
            size="small"
          >
            Saldo Inicial
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenLancamento}
            size="small"
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
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2.4}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Conta Bancária</InputLabel>
              <Select
                value={filtros.contaBancaria}
                onChange={(e) => setFiltros({ ...filtros, contaBancaria: e.target.value })}
                label="Conta Bancária"
                size="small"
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
          <Grid item xs={12} md={2.4}>
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
          <Grid item xs={12} md={2.4}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Cartão</InputLabel>
              <Select
                value={filtros.cartao}
                onChange={(e) => setFiltros({ ...filtros, cartao: e.target.value })}
                label="Cartão"
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {cartoes.map((cartao) => (
                  <MenuItem key={cartao._id} value={cartao._id}>
                    {cartao.nome} - {cartao.banco} ({cartao.tipo})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={1.2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={limparFiltros}
              size="small"
            >
              Limpar
            </Button>
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

      {/* Layout responsivo: Cards para mobile, Tabela para desktop */}
      {isMobile ? (
        <Box>
          {extratos.map((extrato) => (
            <ExtratoCard key={extrato._id} extrato={extrato} />
          ))}
        </Box>
      ) : (
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
                  <TableCell>{extrato.motivo || '-'}</TableCell>
                  <TableCell>
                    <Typography
                      color={extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial' ? 'success.main' : 'error.main'}
                    >
                      {extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial' ? '+' : '-'} R$ {extrato.valor.toFixed(2).replace('.', ',')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={extrato.estornado ? 'Estornado' : 'Ativo'}
                      color={extrato.estornado ? 'default' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {extrato.tipo !== 'Saldo Inicial' && !extrato.estornado && (
                      <IconButton size="small" color="warning" onClick={() => handleEstornar(extrato._id)}>
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

      {/* Totais do Período */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resumo do Período Filtrado
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total de Entradas
              </Typography>
              <Chip
                label={`R$ ${totalEntradas.toFixed(2).replace('.', ',')}`}
                color="success"
                variant="outlined"
                size="large"
                sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total de Saídas
              </Typography>
              <Chip
                label={`R$ ${totalSaidas.toFixed(2).replace('.', ',')}`}
                color="error"
                variant="outlined"
                size="large"
                sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Saldo do Período
              </Typography>
              <Chip
                label={`R$ ${(totalEntradas - totalSaidas).toFixed(2).replace('.', ',')}`}
                color={totalEntradas - totalSaidas >= 0 ? 'success' : 'error'}
                variant="filled"
                size="large"
                sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Dialog Lançamento */}
      <Dialog open={openLancamento} onClose={handleCloseLancamento} maxWidth="sm" fullScreen={isMobile} fullWidth>
        <form onSubmit={handleSubmitLancamento}>
          <DialogTitle>Lançamento</DialogTitle>
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

      <Dialog open={openSaldoInicial} onClose={handleCloseSaldoInicial} maxWidth="sm" fullScreen={isMobile} fullWidth>
        <form onSubmit={handleSubmitSaldoInicial}>
          <DialogTitle>Lançar Saldo Inicial</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal" required variant="outlined" size="small">
              <InputLabel>Conta Bancária</InputLabel>
              <Select
                value={saldoInicialData.contaBancaria}
                onChange={(e) =>
                  setSaldoInicialData({ ...saldoInicialData, contaBancaria: e.target.value })
                }
                label="Conta Bancária"
                size="small"
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
              variant="outlined"
              size="small"
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
              variant="outlined"
              size="small"
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

