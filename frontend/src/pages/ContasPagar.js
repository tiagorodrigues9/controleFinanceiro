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
  Chip,
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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentIcon from '@mui/icons-material/Payment';
import CancelIcon from '@mui/icons-material/Cancel';
import api from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ContasPagar = () => {
  // Forçando recompilação após correções
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCadastro, setOpenCadastro] = useState(false);
  const [openPagamento, setOpenPagamento] = useState(false);
  const [openFornecedor, setOpenFornecedor] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [fornecedorData, setFornecedorData] = useState({ nome: '', tipo: '' });
  const [formData, setFormData] = useState({
    nome: '',
    dataVencimento: '',
    valor: '',
    fornecedor: '',
    observacao: '',
    totalParcelas: '1',
    parcelMode: 'dividir', // dividir, mesmo_valor, manual
    tipoControle: '',
  });
  const [pagamentoData, setPagamentoData] = useState({
    formaPagamento: '',
    contaBancaria: '',
    juros: '',
  });
  const [openConfirmCancel, setOpenConfirmCancel] = useState(false);
  const [contaToCancel, setContaToCancel] = useState(null);
  const [error, setError] = useState('');
  const [parcelasList, setParcelasList] = useState([]);
  const [parcelaData, setParcelaData] = useState({ valor: '', data: '' });

  useEffect(() => {
    fetchContas();
    fetchFornecedores();
    fetchContasBancarias();
    fetchGrupos();
  }, []);

  const fetchContas = async () => {
    try {
      setLoading(true);
      // Busca todas as contas sem filtro de mês/ano
      const response = await api.get('/contas');
      console.log('Contas recebidas:', response.data);
      setContas(response.data.filter(conta => conta && conta.valor != null) || []);
    } catch (err) {
      setError('Erro ao carregar contas');
      console.error('Erro ao buscar contas:', err);
      console.error('Detalhes do erro:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchFornecedores = async () => {
    try {
      const response = await api.get('/fornecedores');
      setFornecedores(response.data.filter(f => f.ativo));
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
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

  const handleAddParcela = () => {
    if (parcelaData.valor && parcelaData.data) {
      setParcelasList([...parcelasList, { ...parcelaData }]);
      setParcelaData({ valor: '', data: '' });
    }
  };

  const handleRemoveParcela = (index) => {
    setParcelasList(parcelasList.filter((_, i) => i !== index));
  };

  const handleOpenCadastro = () => {
    setFormData({
      nome: '',
      dataVencimento: '',
      valor: '',
      fornecedor: '',
      observacao: '',
      totalParcelas: '1',
      parcelMode: 'dividir',
      tipoControle: '',
    });
    setParcelasList([]);
    setParcelaData({ valor: '', data: '' });
    setOpenCadastro(true);
  };

  const handleCloseCadastro = () => {
    setOpenCadastro(false);
  };

  const handleOpenFornecedor = () => {
    setFornecedorData({ nome: '', tipo: '' });
    setOpenFornecedor(true);
  };

  const handleCloseFornecedor = () => {
    setOpenFornecedor(false);
  };

  const handleSubmitFornecedor = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/fornecedores', fornecedorData);
      await fetchFornecedores();
      setFormData({ ...formData, fornecedor: response.data._id });
      handleCloseFornecedor();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar fornecedor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.parcelMode === 'manual') {
      const totalParcelas = parseInt(formData.totalParcelas);
      if (parcelasList.length !== totalParcelas) {
        setError(`Número de parcelas adicionadas (${parcelasList.length}) não corresponde ao informado (${totalParcelas}).`);
        return;
      }
      const somaParcelas = parcelasList.reduce((sum, p) => sum + parseFloat(p.valor), 0);
      const valorTotal = parseFloat(formData.valor);
      if (Math.abs(somaParcelas - valorTotal) > 0.01) {
        setError(`Soma dos valores das parcelas (R$ ${somaParcelas.toFixed(2)}) não corresponde ao valor total (R$ ${valorTotal.toFixed(2)}).`);
        return;
      }
    }

    try {
      const formDataToSend = new FormData();
      if (formData.parcelMode === 'manual') {
        formDataToSend.append('nome', formData.nome);
        formDataToSend.append('parcelas', JSON.stringify(parcelasList));
        formDataToSend.append('parcelMode', formData.parcelMode);
        formDataToSend.append('fornecedor', formData.fornecedor);
        formDataToSend.append('observacao', formData.observacao);
        formDataToSend.append('tipoControle', formData.tipoControle);
      } else {
        formDataToSend.append('valor', formData.valor);
        formDataToSend.append('dataVencimento', formData.dataVencimento);
        formDataToSend.append('fornecedor', formData.fornecedor);
        formDataToSend.append('observacao', formData.observacao);
        formDataToSend.append('tipoControle', formData.tipoControle);
        if (parseInt(formData.totalParcelas) > 1) {
          formDataToSend.append('totalParcelas', formData.totalParcelas);
          formDataToSend.append('parcelMode', formData.parcelMode);
        }
      }

      await api.post('/contas', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      fetchContas();
      handleCloseCadastro();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar conta');
    }
  };

  const handleOpenPagamento = (conta) => {
    if (!conta || !conta.valor) return;
    setContaSelecionada(conta);
    setPagamentoData({
      formaPagamento: '',
      contaBancaria: '',
      juros: '',
    });
    setOpenPagamento(true);
  };

  const handleClosePagamento = () => {
    setOpenPagamento(false);
    setContaSelecionada(null);
  };

  const handlePagar = async () => {
    try {
      await api.post(`/contas/${contaSelecionada._id}/pagar`, pagamentoData);
      fetchContas();
      handleClosePagamento();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao pagar conta');
    }
  };

  const handleCancelar = (id) => {
    setContaToCancel(id);
    setOpenConfirmCancel(true);
  };

  const confirmCancel = async () => {
    if (contaToCancel) {
      try {
        await api.delete(`/contas/${contaToCancel}`);
        fetchContas();
        setOpenConfirmCancel(false);
        setContaToCancel(null);
      } catch (err) {
        setError('Erro ao cancelar conta');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pago':
        return 'success';
      case 'Vencida':
        return 'error';
      case 'Cancelada':
        return 'default';
      default:
        return 'warning';
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
        <Typography variant="h4">Contas a Pagar</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCadastro}
        >
          Cadastrar Conta
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {contas.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nenhuma conta cadastrada. Clique em "Cadastrar Conta" para adicionar uma nova conta.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Fornecedor</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contas.filter(conta => conta && conta.valor != null).map((conta) => (
              <TableRow key={conta._id}>
                <TableCell>
                  {conta.nome}
                  {conta.parcelaAtual && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      Parcela {conta.parcelaAtual} de {conta.totalParcelas}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{conta.fornecedor?.nome}</TableCell>
                <TableCell>
                  {format(new Date(conta.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  R$ {conta.valor.toFixed(2).replace('.', ',')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={conta.status}
                    color={getStatusColor(conta.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {(conta.status === 'Pendente' || conta.status === 'Vencida') && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenPagamento(conta)}
                    >
                      <PaymentIcon />
                    </IconButton>
                  )}
                  {conta.status !== 'Pago' && conta.status !== 'Cancelada' && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleCancelar(conta._id)}
                    >
                      <CancelIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Cadastro */}
      <Dialog open={openCadastro} onClose={handleCloseCadastro} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Cadastrar Conta</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome da Conta"
              margin="normal"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            {formData.parcelMode !== 'manual' && (
            <TextField
              fullWidth
              label="Data de Vencimento"
              type="date"
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
              value={formData.dataVencimento}
              onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
            />
            )}
            <TextField
              fullWidth
              label={formData.parcelMode === 'manual' ? "Valor Total" : "Valor"}
              type="number"
              margin="normal"
              required
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mt: 2, mb: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Fornecedor</InputLabel>
                <Select
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                  label="Fornecedor"
                >
                  {fornecedores.map((fornecedor) => (
                    <MenuItem key={fornecedor._id} value={fornecedor._id}>
                      {fornecedor.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                color="primary"
                onClick={handleOpenFornecedor}
                sx={{ mb: 0.5 }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            <TextField
              fullWidth
              label="Número de Parcelas"
              type="number"
              margin="normal"
              value={formData.totalParcelas}
              onChange={(e) => setFormData({ ...formData, totalParcelas: e.target.value })}
              inputProps={{ min: 1 }}
            />
            {parseInt(formData.totalParcelas) > 1 && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Modo de Parcelamento</InputLabel>
                <Select
                  value={formData.parcelMode}
                  onChange={(e) => setFormData({ ...formData, parcelMode: e.target.value })}
                  label="Modo de Parcelamento"
                >
                  <MenuItem value="dividir">Dividir valor total pelas parcelas</MenuItem>
                  <MenuItem value="mesmo_valor">Mesmo valor nas parcelas restantes</MenuItem>
                  <MenuItem value="manual">Definir valores e datas manualmente</MenuItem>
                </Select>
              </FormControl>
            )}
            <TextField
              fullWidth
              label="Observação"
              margin="normal"
              multiline
              rows={3}
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo de Controle</InputLabel>
              <Select
                value={formData.tipoControle}
                onChange={(e) => setFormData({ ...formData, tipoControle: e.target.value })}
                label="Tipo de Controle"
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {grupos.map((grupo) => (
                  <MenuItem key={grupo._id} value={grupo.nome}>
                    {grupo.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formData.parcelMode === 'manual' && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>Adicionar Parcelas</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Valor da Parcela"
                      type="number"
                      value={parcelaData.valor}
                      onChange={(e) => setParcelaData({ ...parcelaData, valor: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Data de Vencimento"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={parcelaData.data}
                      onChange={(e) => setParcelaData({ ...parcelaData, data: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button variant="contained" onClick={handleAddParcela}>
                      Adicionar
                    </Button>
                  </Grid>
                </Grid>
                {parcelasList.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">Parcelas Adicionadas:</Typography>
                    <List>
                      {parcelasList.map((parcela, index) => (
                        <ListItem key={index} secondaryAction={
                          <IconButton edge="end" onClick={() => handleRemoveParcela(index)}>
                            <CancelIcon />
                          </IconButton>
                        }>
                          <ListItemText
                            primary={`Parcela ${index + 1}: R$ ${parseFloat(parcela.valor).toFixed(2).replace('.', ',')} - ${format(new Date(parcela.data + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCadastro}>Cancelar</Button>
            <Button type="submit" variant="contained">Salvar</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Pagamento */}
      <Dialog open={openPagamento} onClose={handleClosePagamento} maxWidth="sm" fullWidth>
        {contaSelecionada && (
          <>
            <DialogTitle>Pagar Conta</DialogTitle>
            <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Valor"
                  value={`R$ ${contaSelecionada.valor.toFixed(2).replace('.', ',')}`}
                  disabled
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Fornecedor"
                  value={contaSelecionada.fornecedor?.nome}
                  disabled
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required variant="outlined">
                  <InputLabel>Forma de Pagamento</InputLabel>
                  <Select
                    value={pagamentoData.formaPagamento}
                    onChange={(e) =>
                      setPagamentoData({ ...pagamentoData, formaPagamento: e.target.value })
                    }
                    label="Forma de Pagamento"
                  >
                    <MenuItem value="Pix">Pix</MenuItem>
                    <MenuItem value="Cartão de Crédito">Cartão de Crédito</MenuItem>
                    <MenuItem value="Cartão de Débito">Cartão de Débito</MenuItem>
                    <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                    <MenuItem value="Transferência">Transferência</MenuItem>
                    <MenuItem value="Boleto">Boleto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required variant="outlined">
                  <InputLabel>Conta Bancária</InputLabel>
                  <Select
                    value={pagamentoData.contaBancaria}
                    onChange={(e) =>
                      setPagamentoData({ ...pagamentoData, contaBancaria: e.target.value })
                    }
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
              {contaSelecionada && contaSelecionada.status === 'Vencida' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Juros (R$)"
                    type="number"
                    value={pagamentoData.juros}
                    onChange={(e) =>
                      setPagamentoData({ ...pagamentoData, juros: e.target.value })
                    }
                    variant="outlined"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePagamento}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handlePagar}
            disabled={!pagamentoData.formaPagamento || !pagamentoData.contaBancaria}
          >
            Confirmar Pagamento
          </Button>
        </DialogActions>
        </>
        )}
      </Dialog>

      {/* Dialog Cadastro Fornecedor */}
      <Dialog open={openFornecedor} onClose={handleCloseFornecedor} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitFornecedor}>
          <DialogTitle>Cadastrar Fornecedor</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome"
              margin="normal"
              required
              value={fornecedorData.nome}
              onChange={(e) => setFornecedorData({ ...fornecedorData, nome: e.target.value })}
            />
            <TextField
              fullWidth
              label="Tipo"
              margin="normal"
              required
              value={fornecedorData.tipo}
              onChange={(e) => setFornecedorData({ ...fornecedorData, tipo: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFornecedor}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog Confirmar Cancelamento */}
      <Dialog open={openConfirmCancel} onClose={() => setOpenConfirmCancel(false)}>
        <DialogTitle>Confirmar Cancelamento</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja cancelar esta conta?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmCancel(false)}>Não</Button>
          <Button onClick={confirmCancel} variant="contained" color="error">
            Sim, Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContasPagar;

