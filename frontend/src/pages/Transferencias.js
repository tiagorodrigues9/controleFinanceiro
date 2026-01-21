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
  Card,
  CardContent,
  CardActions,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Transferencias = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [contas, setContas] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransfer, setLoadingTransfer] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [transferenciaToDelete, setTransferenciaToDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState({
    contaOrigem: '',
    contaDestino: '',
    valor: '',
    motivo: ''
  });

  useEffect(() => {
    fetchContas();
    fetchTransferencias();
  }, [page]);

  const fetchContas = async () => {
    try {
      const response = await api.get('/contas-bancarias');
      setContas(response.data.filter(conta => conta.ativo !== false));
    } catch (err) {
      setError('Erro ao carregar contas bancárias');
    }
  };

  const fetchTransferencias = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/transferencias?page=${page}&limit=20`);
      setTransferencias(response.data.transferencias);
      setTotalPages(response.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar histórico de transferências');
      setLoading(false);
    }
  };

  const handleOpenTransfer = () => {
    setFormData({
      contaOrigem: '',
      contaDestino: '',
      valor: '',
      motivo: ''
    });
    setOpenTransfer(true);
    setError('');
    setSuccess('');
  };

  const handleCloseTransfer = () => {
    setOpenTransfer(false);
  };

  const handleOpenDelete = (id) => {
    setTransferenciaToDelete(id);
    setOpenConfirmDelete(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDelete = () => {
    setOpenConfirmDelete(false);
    setTransferenciaToDelete(null);
  };

  const handleDelete = async () => {
    if (!transferenciaToDelete) return;
    
    try {
      const response = await api.delete(`/transferencias/${transferenciaToDelete}`);
      
      setSuccess('Transferência excluída com sucesso!');
      setOpenConfirmDelete(false);
      setTransferenciaToDelete(null);
      
      // Atualizar lista de transferências
      fetchTransferencias();
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir transferência');
    }
  };

  const handleTransfer = async () => {
    if (!formData.contaOrigem || !formData.contaDestino || !formData.valor) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.contaOrigem === formData.contaDestino) {
      setError('Selecione contas diferentes');
      return;
    }

    if (parseFloat(formData.valor) <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }

    try {
      setLoadingTransfer(true);
      const response = await api.post('/transferencias', formData);
      
      setSuccess('Transferência realizada com sucesso!');
      setOpenTransfer(false);
      setError('');
      
      // Atualizar lista de transferências
      fetchTransferencias();
      
      // Limpar formulário
      setFormData({
        contaOrigem: '',
        contaDestino: '',
        valor: '',
        motivo: ''
      });
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao realizar transferência');
    } finally {
      setLoadingTransfer(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <>
      <Box sx={{ 
        p: { xs: 1, sm: 2, md: 3 },
        pb: { xs: 8, sm: 3 } // Espaço extra para navegação móvel
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          gutterBottom
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          Transferências entre Contas
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Botão de Nova Transferência */}
        <Box sx={{ 
          mb: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          px: { xs: 1, sm: 0 }
        }}>
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            sx={{ 
              alignSelf: { xs: 'stretch', sm: 'auto' },
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            Histórico de Transferências
          </Typography>
          <Button
            variant="contained"
            startIcon={<SwapHorizIcon />}
            onClick={handleOpenTransfer}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
            sx={{ 
              minWidth: { xs: '100%', sm: '200px' },
              height: { xs: '56px', sm: 'auto' },
              fontSize: { xs: '1rem', sm: '0.875rem' }
            }}
          >
            Nova Transferência
          </Button>
        </Box>

        {/* Lista para Mobile vs Tabela para Desktop */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : isMobile ? (
            // Layout Mobile - Card List
            <List sx={{ p: 0 }}>
              {transferencias.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma transferência encontrada
                  </Typography>
                </Box>
              ) : (
                transferencias.map((transferencia, index) => (
                  <React.Fragment key={transferencia._id}>
                    <Card sx={{ mx: 1, my: 1 }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(transferencia.valor)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDelete(transferencia._id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(transferencia.data), 'dd/MM/yyyy', { locale: ptBR })}
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            Origem:
                          </Typography>
                          <Typography variant="body2">
                            {transferencia.contaBancaria?.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {transferencia.contaBancaria?.banco}
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            Destino:
                          </Typography>
                          {transferencia.contaDestino ? (
                            <>
                              <Typography variant="body2">
                                {transferencia.contaDestino.nome}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {transferencia.contaDestino.banco}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Carregando...
                            </Typography>
                          )}
                        </Box>

                        {transferencia.motivo && !transferencia.motivo.includes('Transferência de') && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {transferencia.motivo}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                    {index < transferencias.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          ) : (
            // Layout Desktop - Tabela
            <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
              <Table size={isTablet ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 100 }}>Data</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Origem</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Destino</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Valor</TableCell>
                    <TableCell sx={{ minWidth: 200, display: { xs: 'none', md: 'table-cell' } }}>Motivo</TableCell>
                    <TableCell sx={{ minWidth: 80 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transferencias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" sx={{ py: 2 }}>
                          Nenhuma transferência encontrada
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transferencias.map((transferencia) => (
                      <TableRow key={transferencia._id}>
                        <TableCell sx={{ minWidth: 100 }}>
                          {format(new Date(transferencia.data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            {transferencia.contaBancaria?.nome} ({transferencia.contaBancaria?.banco})
                          </Box>
                          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {transferencia.contaBancaria?.nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {transferencia.contaBancaria?.banco}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            {transferencia.contaDestino ? (
                              `${transferencia.contaDestino.nome} (${transferencia.contaDestino.banco})`
                            ) : (
                              'Carregando...'
                            )}
                          </Box>
                          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {transferencia.contaDestino?.nome || 'Carregando...'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {transferencia.contaDestino?.banco || ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(transferencia.valor)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 200, display: { xs: 'none', md: 'table-cell' } }}>
                          {transferencia.motivo}
                        </TableCell>
                        <TableCell sx={{ minWidth: 80 }}>
                          <Tooltip title="Excluir transferência">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleOpenDelete(transferencia._id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Paginação */}
        {totalPages > 1 && (
          <Box sx={{ 
            mt: { xs: 2, sm: 3 }, 
            display: 'flex', 
            justifyContent: 'center', 
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: 'row', sm: 'row' },
            alignItems: 'center',
            flexWrap: 'wrap',
            px: { xs: 1, sm: 0 }
          }}>
            <Button
              variant="outlined"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              size={isMobile ? "small" : "medium"}
              sx={{ 
                minWidth: { xs: '80px', sm: '100px' },
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              Anterior
            </Button>
            <Typography 
              variant="body2" 
              sx={{ 
                textAlign: 'center',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                px: { xs: 1, sm: 2 }
              }}
            >
              Página {page} de {totalPages}
            </Typography>
            <Button
              variant="outlined"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              size={isMobile ? "small" : "medium"}
              sx={{ 
                minWidth: { xs: '80px', sm: '100px' },
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              Próxima
            </Button>
          </Box>
        )}

        {/* Dialog de Nova Transferência */}
        <Dialog 
          open={openTransfer} 
          onClose={handleCloseTransfer} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              m: { xs: 2, sm: 3 },
              maxHeight: '90vh'
            }
          }}
        >
          <form onSubmit={(e) => {
            e.preventDefault();
            handleTransfer();
          }}>
            <DialogTitle>Nova Transferência</DialogTitle>
            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
              <FormControl fullWidth required sx={{ mb: 2 }}>
                <InputLabel>Conta de Origem</InputLabel>
                <Select
                  value={formData.contaOrigem}
                  onChange={(e) => setFormData({ ...formData, contaOrigem: e.target.value })}
                  label="Conta de Origem"
                  size="medium"
                >
                  {contas.map((conta) => (
                    <MenuItem key={conta._id} value={conta._id}>
                      {conta.nome} ({conta.banco})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth required sx={{ mb: 2 }}>
                <InputLabel>Conta de Destino</InputLabel>
                <Select
                  value={formData.contaDestino}
                  onChange={(e) => setFormData({ ...formData, contaDestino: e.target.value })}
                  label="Conta de Destino"
                  size="medium"
                >
                  {contas.map((conta) => (
                    <MenuItem key={conta._id} value={conta._id}>
                      {conta.nome} ({conta.banco})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                required
                label="Valor"
                type="number"
                margin="normal"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                inputProps={{ 
                  step: '0.01', 
                  min: '0.01',
                  style: { fontSize: '16px' } // Evita zoom no iOS
                }}
              />
              
              <TextField
                fullWidth
                label="Motivo (opcional)"
                margin="normal"
                multiline
                rows={2}
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                inputProps={{
                  style: { fontSize: '16px' } // Evita zoom no iOS
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
              <Button 
                onClick={handleCloseTransfer}
                type="button"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loadingTransfer}
                startIcon={loadingTransfer ? <CircularProgress size={20} /> : <SwapHorizIcon />}
              >
                {loadingTransfer ? 'Transferindo...' : 'Transferir'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
        
        {/* Dialog de Confirmação de Exclusão */}
        <Dialog 
          open={openConfirmDelete} 
          onClose={handleCloseDelete}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              m: { xs: 2, sm: 3 }
            }
          }}
        >
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography>
              Tem certeza que deseja excluir esta transferência? Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
            <Button onClick={handleCloseDelete}>
              Cancelar
            </Button>
            <Button onClick={handleDelete} variant="contained" color="error">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default Transferencias;
