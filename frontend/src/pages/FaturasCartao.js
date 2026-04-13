import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CreditCard,
  Payment,
  Visibility,
  CalendarToday,
  AccountBalance,
  Warning
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../utils/api';

const FaturasCartao = () => {
  const [faturas, setFaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCartao, setSelectedCartao] = useState('');
  const [cartoes, setCartoes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState(null);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [contaBancariaPagamento, setContaBancariaPagamento] = useState('');
  const [loadingPagamento, setLoadingPagamento] = useState(false);

  useEffect(() => {
    fetchDados();
  }, []);

  useEffect(() => {
    if (selectedCartao) {
      fetchFaturas();
    }
  }, [selectedCartao]);

  const fetchDados = async () => {
    try {
      const [cartoesRes, contasRes] = await Promise.all([
        api.get('/cartoes'),
        api.get('/contas-bancarias')
      ]);
      
      setCartoes(cartoesRes.data);
      setContasBancarias(contasRes.data);
      
      if (cartoesRes.data.length > 0) {
        setSelectedCartao(cartoesRes.data[0]._id);
      }
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchFaturas = async () => {
    if (!selectedCartao) return;
    
    try {
      setLoading(true);
      const response = await api.get('/fatura-cartao', {
        params: { cartao: selectedCartao }
      });
      setFaturas(response.data);
    } catch (err) {
      setError('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  };

  const handlePagarFatura = (fatura) => {
    setSelectedFatura(fatura);
    setOpenDialog(true);
  };

  const confirmarPagamento = async () => {
    if (!selectedFatura || !contaBancariaPagamento) return;

    try {
      setLoadingPagamento(true);
      await api.post(`/fatura-cartao/${selectedFatura._id}/pagar`, {
        contaBancaria: contaBancariaPagamento
      });

      // Atualizar lista de faturas
      await fetchFaturas();
      
      setOpenDialog(false);
      setSelectedFatura(null);
      setContaBancariaPagamento('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao pagar fatura');
    } finally {
      setLoadingPagamento(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aberta':
        return 'primary';
      case 'Fechada':
        return 'warning';
      case 'Paga':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Aberta':
        return 'Aberta';
      case 'Fechada':
        return 'Fechada';
      case 'Paga':
        return 'Paga';
      default:
        return status;
    }
  };

  const formatarValor = (valor) => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const formatarDataSegura = (data, formato = 'dd/MM/yyyy') => {
    if (!data) return 'Data não disponível';
    
    try {
      const dataObj = new Date(data);
      // Verificar se a data é válida
      if (isNaN(dataObj.getTime())) {
        return 'Data inválida';
      }
      
      return format(dataObj, formato, { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const getCartaoNome = (cartaoId, faturaCartao) => {
    // Primeiro tentar usar os dados populados da fatura
    if (faturaCartao && faturaCartao.cartao) {
      return `${faturaCartao.cartao.nome} - ${faturaCartao.cartao.banco}`;
    }
    
    // Se não tiver dados populados, buscar na lista local
    const cartao = cartoes.find(c => c._id === cartaoId);
    return cartao ? `${cartao.nome} - ${cartao.banco}` : 'Cartão não encontrado';
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
      <Typography variant="h4" gutterBottom>
        Faturas de Cartão
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Cartão</InputLabel>
              <Select
                value={selectedCartao}
                onChange={(e) => setSelectedCartao(e.target.value)}
                label="Cartão"
              >
                {cartoes.map((cartao) => (
                  <MenuItem key={cartao._id} value={cartao._id}>
                    {cartao.nome} - {cartao.banco}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Lista de Faturas */}
      {faturas.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CreditCard sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhuma fatura encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary">
            As faturas aparecerão aqui quando você usar o cartão de crédito
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {faturas.map((fatura) => (
            <Grid item xs={12} md={6} lg={4} key={fatura._id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" component="div">
                      {fatura.mesReferencia}
                    </Typography>
                    <Chip
                      label={getStatusLabel(fatura.status)}
                      color={getStatusColor(fatura.status)}
                      size="small"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Cartão: {getCartaoNome(fatura.cartao, fatura)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vencimento: {formatarDataSegura(fatura.dataVencimento)}
                    </Typography>
                    {fatura.dataFechamento && (
                      <Typography variant="body2" color="text.secondary">
                        Fechamento: {formatarDataSegura(fatura.dataFechamento)}
                      </Typography>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box mb={2}>
                    <Typography variant="h6" color="primary">
                      {formatarValor(fatura.valorTotal)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {fatura.despesas.length} despesa(s)
                    </Typography>
                  </Box>

                  {fatura.status === 'Paga' ? (
                    <Box>
                      <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                        Paga em {formatarDataSegura(fatura.dataPagamento)}
                      </Typography>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => setSelectedFatura(fatura)}
                      >
                        Ver Detalhes
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Payment />}
                      onClick={() => handlePagarFatura(fatura)}
                      disabled={fatura.valorTotal === 0}
                    >
                      Pagar Fatura
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de Pagamento */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pagar Fatura</DialogTitle>
        <DialogContent>
          {selectedFatura && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Fatura {selectedFatura.mesReferencia}
              </Typography>
              
              <Typography variant="body1" gutterBottom>
                Valor a pagar: <strong>{formatarValor(selectedFatura.valorTotal)}</strong>
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cartão: {getCartaoNome(selectedFatura.cartao, selectedFatura)}
              </Typography>

              <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
                <InputLabel>Conta Bancária para Pagamento</InputLabel>
                <Select
                  value={contaBancariaPagamento}
                  onChange={(e) => setContaBancariaPagamento(e.target.value)}
                  label="Conta Bancária para Pagamento"
                >
                  {contasBancarias.map((conta) => (
                    <MenuItem key={conta._id} value={conta._id}>
                      {conta.nome} - {conta.banco}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedFatura.despesas.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Despesas incluídas:
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {selectedFatura.despesas.map((despesa, index) => (
                      <Typography key={index} variant="body2" sx={{ py: 0.5 }}>
                        {formatarValor(despesa.valor)} - {despesa.descricao}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            onClick={confirmarPagamento}
            variant="contained"
            disabled={!contaBancariaPagamento || loadingPagamento}
          >
            {loadingPagamento ? <CircularProgress size={20} /> : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Detalhes (para faturas pagas) */}
      <Dialog open={!!selectedFatura && selectedFatura.status === 'Paga'} onClose={() => setSelectedFatura(null)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes da Fatura</DialogTitle>
        <DialogContent>
          {selectedFatura && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Fatura {selectedFatura.mesReferencia}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Valor Total
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatarValor(selectedFatura.valorTotal)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Data de Pagamento
                  </Typography>
                  <Typography variant="body1">
                    {formatarDataSegura(selectedFatura.dataPagamento)}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" gutterBottom>
                Despesas ({selectedFatura.despesas.length}):
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Descrição</TableCell>
                      <TableCell align="right">Valor</TableCell>
                      <TableCell>Data</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedFatura.despesas.map((despesa, index) => (
                      <TableRow key={index}>
                        <TableCell>{despesa.descricao}</TableCell>
                        <TableCell align="right">{formatarValor(despesa.valor)}</TableCell>
                        <TableCell>{formatarDataSegura(despesa.data)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedFatura(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FaturasCartao;
