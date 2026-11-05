// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Switch,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  NotificationsActive as NotificationsActiveIcon,
  Add as AddIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const DIAS_SEMANA_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [currentTab, setCurrentTab] = useState(0);
  const [programadas, setProgramadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    tipoFrequencia: 'diaria',
    horario: '09:00',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    dataEspecifica: '',
    urlDestino: '/gastos-diarios',
    ativo: true
  });

  // Redireciona se não for administrador
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchProgramadas();
    }
  }, [user]);

  const fetchProgramadas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notificacoes-programadas');
      setProgramadas(res.data);
    } catch (err) {
      console.error('Erro ao buscar notificações programadas:', err);
      mostrarSnackbar('Erro ao carregar notificações programadas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        titulo: item.titulo,
        mensagem: item.mensagem,
        tipoFrequencia: item.tipoFrequencia || 'diaria',
        horario: item.horario || '09:00',
        diasSemana: item.diasSemana || [0, 1, 2, 3, 4, 5, 6],
        dataEspecifica: item.dataEspecifica ? item.dataEspecifica.substring(0, 10) : '',
        urlDestino: item.urlDestino || '/gastos-diarios',
        ativo: item.ativo !== undefined ? item.ativo : true
      });
    } else {
      setEditingItem(null);
      setFormData({
        titulo: '',
        mensagem: '',
        tipoFrequencia: 'diaria',
        horario: '09:00',
        diasSemana: [0, 1, 2, 3, 4, 5, 6],
        dataEspecifica: '',
        urlDestino: '/gastos-diarios',
        ativo: true
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.mensagem.trim()) {
      mostrarSnackbar('Preencha título e mensagem', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      if (editingItem) {
        await api.put(`/notificacoes-programadas/${editingItem._id}`, formData);
        mostrarSnackbar('Notificação programada atualizada com sucesso!');
      } else {
        await api.post('/notificacoes-programadas', formData);
        mostrarSnackbar('Nova notificação programada com sucesso!');
      }
      setDialogOpen(false);
      fetchProgramadas();
    } catch (err) {
      console.error('Erro ao salvar notificação:', err);
      mostrarSnackbar(err.response?.data?.message || 'Erro ao salvar', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/notificacoes-programadas/${id}/toggle`);
      setProgramadas(programadas.map(p => p._id === id ? { ...p, ativo: res.data.ativo } : p));
      mostrarSnackbar(res.data.message);
    } catch (err) {
      console.error('Erro ao alternar status:', err);
      mostrarSnackbar('Erro ao alternar status da notificação', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta notificação programada?')) return;
    try {
      await api.delete(`/notificacoes-programadas/${id}`);
      setProgramadas(programadas.filter(p => p._id !== id));
      mostrarSnackbar('Notificação programada excluída com sucesso');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      mostrarSnackbar('Erro ao excluir notificação', 'error');
    }
  };

  const handleDispararAgora = async (id, titulo) => {
    if (!window.confirm(`Disparar a notificação "${titulo}" agora para todos os usuários inscritos?`)) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/notificacoes-programadas/${id}/disparar-agora`);
      mostrarSnackbar(`Disparo concluído! Notificados via push: ${res.data.resultado?.totalEnviados || 0}`);
      fetchProgramadas();
    } catch (err) {
      console.error('Erro ao disparar agora:', err);
      mostrarSnackbar('Erro ao realizar disparo imediato', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleDiaSemana = (diaIndex) => {
    const jaSelecionado = formData.diasSemana.includes(diaIndex);
    let novosDias;
    if (jaSelecionado) {
      novosDias = formData.diasSemana.filter(d => d !== diaIndex);
    } else {
      novosDias = [...formData.diasSemana, diaIndex].sort((a, b) => a - b);
    }
    setFormData({ ...formData, diasSemana: novosDias });
  };

  if (!user?.isAdmin) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="error">Acesso restrito ao administrador.</Typography>
      </Box>
    );
  }

  const ativasCount = programadas.filter(p => p.ativo).length;
  const totalDisparos = programadas.reduce((acc, p) => acc + (p.historicoEnvios?.length || 0), 0);

  return (
    <Box sx={{ p: isMobile ? 1.5 : 3, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header do Painel */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              p: 1.2,
              borderRadius: 3,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 2
            }}
          >
            <AdminIcon fontSize="medium" />
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" fontWeight="bold">
                Painel Administrativo
              </Typography>
              <Chip label="ADMIN" color="primary" size="small" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Gerenciamento avançado, disparos e configurações do sistema.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs para extensão futura */}
      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }} elevation={1}>
        <Tabs
          value={currentTab}
          onChange={(e, val) => setCurrentTab(val)}
          variant={isMobile ? 'scrollable' : 'standard'}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<NotificationsActiveIcon />} iconPosition="start" label="Notificações Programadas" />
          <Tab icon={<SettingsIcon />} iconPosition="start" label="Configurações Gerais" />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Métricas & Auditoria" />
        </Tabs>
      </Paper>

      {/* TAB 0: Notificações Programadas */}
      {currentTab === 0 && (
        <Box>
          {/* Métricas Rápidas */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">NOTIFICAÇÕES ATIVAS</Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">{ativasCount}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 3, borderLeft: '4px solid', borderColor: 'success.main' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL PROGRAMADAS</Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">{programadas.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 3, borderLeft: '4px solid', borderColor: 'info.main' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">DISPAROS REALIZADOS</Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">{totalDisparos}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Barra de Ações */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="600">
              Programações Ativas e Agendamentos
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ borderRadius: 2 }}
            >
              Nova Notificação
            </Button>
          </Box>

          {/* Lista de Notificações */}
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : programadas.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 5, borderRadius: 3 }}>
              <CardContent>
                <ScheduleIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Nenhuma notificação programada
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Cadastre mensagens automáticas (ex: lembrete de gastos matinal ou alertas de fim de semana).
                </Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                  Criar Primeira Notificação
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {programadas.map((item) => (
                <Grid item xs={12} key={item._id}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: item.ativo ? 'primary.light' : 'divider',
                      opacity: item.ativo ? 1 : 0.75,
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
                    <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                        <Box flex={1} minWidth={250}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                            <Typography variant="subtitle1" fontWeight="bold">
                              {item.titulo}
                            </Typography>
                            <Chip
                              icon={<ScheduleIcon sx={{ fontSize: '1rem !important' }} />}
                              label={item.horario}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 'bold' }}
                            />
                            <Chip
                              label={item.tipoFrequencia.toUpperCase().replace('_', ' ')}
                              size="small"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {item.mensagem}
                          </Typography>

                          {/* Chips dos dias da semana */}
                          {item.tipoFrequencia === 'dias_semana' && (
                            <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                              {DIAS_SEMANA_NOMES.map((nomeDia, idx) => {
                                const ativo = item.diasSemana?.includes(idx);
                                return (
                                  <Chip
                                    key={idx}
                                    label={nomeDia}
                                    size="small"
                                    color={ativo ? 'primary' : 'default'}
                                    variant={ativo ? 'filled' : 'outlined'}
                                    sx={{ fontSize: '0.65rem', height: 22 }}
                                  />
                                );
                              })}
                            </Box>
                          )}

                          {item.tipoFrequencia === 'diaria' && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              🗓️ Enviado todos os dias às {item.horario}
                            </Typography>
                          )}

                          {item.ultimaExecucao && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Último disparo: {new Date(item.ultimaExecucao).toLocaleString('pt-BR')}
                            </Typography>
                          )}
                        </Box>

                        {/* Ações do Card */}
                        <Box display="flex" alignItems="center" gap={1}>
                          <Tooltip title={item.ativo ? 'Notificação Ativa' : 'Notificação Pausada'}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={item.ativo}
                                  onChange={() => handleToggle(item._id)}
                                  color="success"
                                />
                              }
                              label={item.ativo ? 'Ativo' : 'Pausado'}
                              sx={{ m: 0 }}
                            />
                          </Tooltip>

                          <Tooltip title="Disparar Teste Imediato">
                            <IconButton
                              color="primary"
                              onClick={() => handleDispararAgora(item._id, item.titulo)}
                              sx={{ bgcolor: 'primary.50' }}
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Editar">
                            <IconButton onClick={() => handleOpenDialog(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Excluir">
                            <IconButton color="error" onClick={() => handleDelete(item._id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* TAB 1: Configurações Gerais (Preparado para Futuras Funcionalidades) */}
      {currentTab === 1 && (
        <Card sx={{ borderRadius: 3, p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>
            <TuneIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">Configurações Gerais do Sistema</Typography>
            <Chip label="EM BREVE" size="small" color="default" />
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Esta área foi reservada na arquitetura para futuras opções administrativas globais, tais como:
          </Typography>
          <ul>
            <li><Typography variant="body2">Limites globais de upload de comprovantes</Typography></li>
            <li><Typography variant="body2">Políticas de retenção de histórico financeiro</Typography></li>
            <li><Typography variant="body2">Chaves e parâmetros de integração externa</Typography></li>
          </ul>
        </Card>
      )}

      {/* TAB 2: Métricas e Auditoria (Preparado para Futuras Funcionalidades) */}
      {currentTab === 2 && (
        <Card sx={{ borderRadius: 3, p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>
            <AssessmentIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">Auditoria & Logs Globais</Typography>
            <Chip label="EM BREVE" size="small" color="default" />
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Módulo reservado para acompanhamento de saúde da plataforma:
          </Typography>
          <ul>
            <li><Typography variant="body2">Relatórios de entrega de Web Push por dispositivo</Typography></li>
            <li><Typography variant="body2">Logs de erro do disparador em tempo real</Typography></li>
            <li><Typography variant="body2">Métricas de engajamento do usuário</Typography></li>
          </ul>
        </Card>
      )}

      {/* DIALOG DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingItem ? 'Editar Notificação Programada' : 'Nova Notificação Programada'}
          </DialogTitle>
          <DialogContent dividers>
            <TextField
              label="Título da Notificação"
              fullWidth
              required
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: ☀️ Lembrete: Registre seus Gastos"
              sx={{ mb: 2 }}
            />

            <TextField
              label="Mensagem"
              fullWidth
              required
              multiline
              rows={3}
              value={formData.mensagem}
              onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
              placeholder="Ex: Não esqueça de registrar seus gastos de hoje para manter tudo sob controle!"
              sx={{ mb: 2 }}
            />

            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequência</InputLabel>
                  <Select
                    value={formData.tipoFrequencia}
                    label="Frequência"
                    onChange={(e) => setFormData({ ...formData, tipoFrequencia: e.target.value })}
                  >
                    <MenuItem value="diaria">Diária (Todos os dias)</MenuItem>
                    <MenuItem value="dias_semana">Dias Específicos da Semana</MenuItem>
                    <MenuItem value="data_especifica">Data Específica (Único)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Horário de Envio (HH:mm)"
                  type="time"
                  fullWidth
                  required
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Seleção de dias da semana se for tipo 'dias_semana' */}
            {formData.tipoFrequencia === 'dias_semana' && (
              <Box mb={2}>
                <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
                  DIAS DA SEMANA PARA O ENVIO:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {DIAS_SEMANA_NOMES.map((nomeDia, idx) => {
                    const checked = formData.diasSemana.includes(idx);
                    return (
                      <Chip
                        key={idx}
                        label={nomeDia}
                        clickable
                        color={checked ? 'primary' : 'default'}
                        variant={checked ? 'filled' : 'outlined'}
                        onClick={() => toggleDiaSemana(idx)}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Data específica */}
            {formData.tipoFrequencia === 'data_especifica' && (
              <TextField
                label="Data Específica"
                type="date"
                fullWidth
                value={formData.dataEspecifica}
                onChange={(e) => setFormData({ ...formData, dataEspecifica: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              label="URL de Destino ao Clicar"
              fullWidth
              value={formData.urlDestino}
              onChange={(e) => setFormData({ ...formData, urlDestino: e.target.value })}
              placeholder="/gastos-diarios ou /contas-pagar"
              helperText="Página que abrirá quando o usuário clicar na notificação."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : 'Salvar Programação'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar de Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Admin;

