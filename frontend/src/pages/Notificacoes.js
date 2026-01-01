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
  Paper,
  useMediaQuery,
  useTheme,
  Fab,
  Drawer,
  AppBar,
  Toolbar,
  BottomNavigation,
  BottomNavigationAction
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
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ClearAll as ClearAllIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import api from '../utils/api';
import usePushNotifications from '../hooks/usePushNotifications';

const Notificacoes = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidasCount, setNaoLidasCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNotificacao, setSelectedNotificacao] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <Box sx={{ 
      pb: isMobile ? 8 : 3, // Espaço para navegação inferior em mobile
      px: isMobile ? 1 : 3,
      pt: isMobile ? 1 : 3,
      minHeight: '100vh',
      bgcolor: 'background.default'
    }}>
      {/* Header responsivo */}
      {isMobile ? (
        <AppBar position="sticky" color="default" elevation={1} sx={{ mb: 2 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <Badge badgeContent={naoLidasCount} color="error">
                <NotificationsIcon />
              </Badge>
              {' '}Notificações
            </Typography>
            <IconButton 
              edge="end" 
              onClick={() => setMobileMenuOpen(true)}
              sx={{ ml: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      ) : (
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
                startIcon={<DoneAllIcon />}
              >
                Marcar Todas como Lidas
              </Button>
            )}
            {notificacoes.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                onClick={limparTodas}
                startIcon={<ClearAllIcon />}
              >
                Limpar Todas
              </Button>
            )}
          </Box>
        </Box>
      )}

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

      {/* Cards de notificações otimizados para mobile */}
      {notificacoes.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: isMobile ? 6 : 4, px: isMobile ? 2 : 3 }}>
            <CheckCircleIcon sx={{ fontSize: isMobile ? 48 : 64, color: 'success.main', mb: 2 }} />
            <Typography variant={isMobile ? 'body1' : 'h6'} color="text.secondary">
              Nenhuma notificação
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Você não possui notificações no momento.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {notificacoes.map((notificacao) => (
            <Card 
              key={notificacao._id} 
              sx={{ 
                mb: 2, 
                bgcolor: notificacao.lida ? 'background.paper' : 'primary.50',
                border: notificacao.lida ? '1px solid' : '2px solid',
                borderColor: notificacao.lida ? 'divider' : 'primary.main',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => setSelectedNotificacao(notificacao)}
            >
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box display="flex" alignItems="flex-start" gap={2}>
                  <Box sx={{ mt: 1 }}>
                    {getIcon(notificacao.tipo)}
                  </Box>
                  
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                      <Typography 
                        variant={isMobile ? 'body2' : 'subtitle2'} 
                        sx={{ 
                          fontWeight: !notificacao.lida ? 'bold' : 'normal',
                          color: !notificacao.lida ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {notificacao.titulo}
                      </Typography>
                      <Chip
                        label={notificacao.tipo.replace('_', ' ').toUpperCase()}
                        color={getCorChip(notificacao.tipo)}
                        size="small"
                        sx={{ fontSize: '0.7rem' }}
                      />
                      {!notificacao.lida && (
                        <Chip
                          label="NOVA"
                          color="primary"
                          size="small"
                          sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                        />
                      )}
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {notificacao.mensagem}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      {formatarData(notificacao.data)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {!notificacao.lida && (
                      <IconButton
                        size={isMobile ? 'small' : 'medium'}
                        onClick={(e) => {
                          e.stopPropagation();
                          marcarComoLida(notificacao._id);
                        }}
                        title="Marcar como lida"
                        sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                      >
                        <MarkReadIcon fontSize={isMobile ? 'small' : 'medium'} />
                      </IconButton>
                    )}
                    <IconButton
                      size={isMobile ? 'small' : 'medium'}
                      onClick={(e) => {
                        e.stopPropagation();
                        excluirNotificacao(notificacao._id);
                      }}
                      title="Excluir notificação"
                      sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                    >
                      <DeleteIcon fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
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

      {/* FAB para ações rápidas em mobile */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1000
          }}
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon />
        </Fab>
      )}

      {/* Drawer mobile para ações */}
      <Drawer
        anchor="bottom"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            p: 2
          }
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
          Ações Rápidas
        </Typography>
        
        {isSupported && (
          <Button
            variant="outlined"
            onClick={() => {
              setShowSettings(true);
              setMobileMenuOpen(false);
            }}
            sx={{ mb: 1, width: '100%' }}
            startIcon={<SettingsIcon />}
          >
            Configurar Notificações
          </Button>
        )}
        
        {naoLidasCount > 0 && (
          <Button
            variant="outlined"
            onClick={() => {
              marcarTodasComoLidas();
              setMobileMenuOpen(false);
            }}
            sx={{ mb: 1, width: '100%' }}
            startIcon={<DoneAllIcon />}
          >
            Marcar Todas como Lidas ({naoLidasCount})
          </Button>
        )}
        
        {notificacoes.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              limparTodas();
              setMobileMenuOpen(false);
            }}
            sx={{ mb: 1, width: '100%' }}
            startIcon={<ClearAllIcon />}
          >
            Limpar Todas
          </Button>
        )}
      </Drawer>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default Notificacoes;
