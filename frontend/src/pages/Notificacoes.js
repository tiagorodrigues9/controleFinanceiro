import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  Switch,
  FormControlLabel,
  Paper
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Event as EventIcon,
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import api from '../utils/api';
import usePushNotifications from '../hooks/usePushNotifications';

const Notificacoes = () => {
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidasCount, setNaoLidasCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNotificacao, setSelectedNotificacao] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showSettings, setShowSettings] = useState(false);

  // Hook de notificações push
  const {
    isSupported,
    permission,
    subscription,
    isLoading: pushLoading,
    requestPermission,
    sendLocalNotification
  } = usePushNotifications();

  useEffect(() => {
    fetchNotificacoes();
    fetchNaoLidas();
  }, []);

  const fetchNotificacoes = async () => {
    try {
      const response = await api.get('/notificacoes');
      setNotificacoes(response.data);
    } catch (error) {
      setError('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const fetchNaoLidas = async () => {
    try {
      const response = await api.get('/notificacoes/nao-lidas');
      setNaoLidasCount(response.data.length);
    } catch (error) {
      console.error('Erro ao buscar não lidas:', error);
    }
  };

  const marcarComoLida = async (id) => {
    try {
      await api.put(`/notificacoes/${id}/marcar-lida`);
      setNotificacoes(notificacoes.map(n => 
        n._id === id ? { ...n, lida: true } : n
      ));
      setNaoLidasCount(prev => Math.max(0, prev - 1));
      setSnackbar({ open: true, message: 'Notificação marcada como lida' });
    } catch (error) {
      setError('Erro ao marcar notificação como lida');
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await api.put('/notificacoes/marcar-todas-lidas');
      setNotificacoes(notificacoes.map(n => ({ ...n, lida: true })));
      setNaoLidasCount(0);
      setSnackbar({ open: true, message: 'Todas as notificações foram marcadas como lidas' });
    } catch (error) {
      setError('Erro ao marcar notificações como lidas');
    }
  };

  const excluirNotificacao = async (id) => {
    try {
      await api.delete(`/notificacoes/${id}`);
      setNotificacoes(notificacoes.filter(n => n._id !== id));
      const notificacao = notificacoes.find(n => n._id === id);
      if (!notificacao.lida) {
        setNaoLidasCount(prev => Math.max(0, prev - 1));
      }
      setSnackbar({ open: true, message: 'Notificação excluída' });
    } catch (error) {
      setError('Erro ao excluir notificação');
    }
  };

  const limparTodas = async () => {
    try {
      await api.delete('/notificacoes/limpar-todas');
      setNotificacoes([]);
      setNaoLidasCount(0);
      setSnackbar({ open: true, message: 'Todas as notificações foram excluídas' });
    } catch (error) {
      setError('Erro ao limpar notificações');
    }
  };

  const handleRequestPermission = async () => {
    try {
      await requestPermission();
      setSnackbar({ open: true, message: 'Notificações push ativadas com sucesso!' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao ativar notificações push' });
    }
  };

  const testNotification = () => {
    sendLocalNotification(
      'Notificação de Teste',
      'Esta é uma notificação de teste do sistema!',
      '/notificacoes'
    );
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'conta_vencida':
        return <WarningIcon color="error" />;
      case 'conta_proxima_vencimento':
        return <EventIcon color="warning" />;
      case 'limite_cartao':
        return <CreditCardIcon color="warning" />;
      default:
        return <NotificationsIcon color="info" />;
    }
  };

  const getCorChip = (tipo) => {
    switch (tipo) {
      case 'conta_vencida':
        return 'error';
      case 'conta_proxima_vencimento':
        return 'warning';
      case 'limite_cartao':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Carregando notificações...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <Badge badgeContent={naoLidasCount} color="error">
            <NotificationsIcon />
          </Badge>
          {' '}Notificações
        </Typography>
        
        <Box>
          {isSupported && (
            <Button
              variant="outlined"
              onClick={() => setShowSettings(true)}
              sx={{ mr: 1 }}
              startIcon={<SettingsIcon />}
            >
              Configurar
            </Button>
          )}
          {naoLidasCount > 0 && (
            <Button
              variant="outlined"
              onClick={marcarTodasComoLidas}
              sx={{ mr: 1 }}
              startIcon={<MarkReadIcon />}
            >
              Marcar Todas como Lidas
            </Button>
          )}
          {notificacoes.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              onClick={limparTodas}
              startIcon={<DeleteIcon />}
            >
              Limpar Todas
            </Button>
          )}
        </Box>
      </Box>

      {/* Alerta de configuração de notificações */}
      {isSupported && permission === 'default' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Ative as notificações push para receber alertas no seu celular, mesmo quando o app estiver fechado!
          </Typography>
          <Button size="small" onClick={handleRequestPermission} sx={{ mt: 1 }}>
            Ativar Notificações Push
          </Button>
        </Alert>
      )}

      {!isSupported && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Seu navegador não suporta notificações push. Use um navegador moderno como Chrome, Firefox ou Edge.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {notificacoes.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nenhuma notificação
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Você não possui notificações no momento.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {notificacoes.map((notificacao, index) => (
            <React.Fragment key={notificacao._id}>
              <ListItem
                sx={{
                  bgcolor: notificacao.lida ? 'transparent' : 'action.hover',
                  cursor: 'pointer',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'grey.50'
                  }
                }}
                onClick={() => setSelectedNotificacao(notificacao)}
              >
                <ListItemIcon>
                  {getIcon(notificacao.tipo)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: !notificacao.lida ? 'bold' : 'normal' }}>
                        {notificacao.titulo}
                      </Typography>
                      <Chip
                        label={notificacao.tipo.replace('_', ' ').toUpperCase()}
                        color={getCorChip(notificacao.tipo)}
                        size="small"
                      />
                      {!notificacao.lida && (
                        <Chip
                          label="Nova"
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {notificacao.mensagem}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatarData(notificacao.data)}
                      </Typography>
                    </Box>
                  }
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {!notificacao.lida && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarComoLida(notificacao._id);
                      }}
                      title="Marcar como lida"
                    >
                      <MarkReadIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      excluirNotificacao(notificacao._id);
                    }}
                    title="Excluir notificação"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
              {index < notificacoes.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Dialog para detalhes da notificação */}
      <Dialog 
        open={!!selectedNotificacao} 
        onClose={() => setSelectedNotificacao(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedNotificacao && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                {getIcon(selectedNotificacao.tipo)}
                {selectedNotificacao.titulo}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedNotificacao.mensagem}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatarData(selectedNotificacao.data)}
              </Typography>
            </DialogContent>
            <DialogActions>
              {!selectedNotificacao.lida && (
                <Button 
                  onClick={() => {
                    marcarComoLida(selectedNotificacao._id);
                    setSelectedNotificacao(null);
                  }}
                  startIcon={<MarkReadIcon />}
                >
                  Marcar como Lida
                </Button>
              )}
              <Button 
                onClick={() => setSelectedNotificacao(null)}
                startIcon={<CloseIcon />}
              >
                Fechar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog para configurações de notificações */}
      <Dialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon />
            Configurar Notificações Push
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status das Notificações
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={permission === 'granted'}
                    disabled={permission === 'granted'}
                  />
                }
                label="Notificações Push Ativadas"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Status: {permission === 'granted' ? '✅ Ativado' : permission === 'denied' ? '❌ Bloqueado' : '⏳ Não configurado'}
              </Typography>
            </Box>

            {isSupported && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Com as notificações push ativadas, você receberá alertas no seu celular:
                </Typography>
                <ul>
                  <li>Quando contas vencerem</li>
                  <li>Quando contas estiverem próximas do vencimento</li>
                  <li>Quando o limite do cartão for atingido</li>
                  <li>Mesmo quando o app estiver fechado</li>
                </ul>
              </Box>
            )}

            {permission === 'granted' && (
              <Button 
                variant="outlined" 
                onClick={testNotification}
                sx={{ mr: 1 }}
              >
                Testar Notificação
              </Button>
            )}
          </Paper>

          {permission === 'denied' && (
            <Alert severity="warning">
              <Typography variant="body2">
                As notificações estão bloqueadas. Para ativar, vá nas configurações do seu navegador e permita notificações para este site.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default Notificacoes;
