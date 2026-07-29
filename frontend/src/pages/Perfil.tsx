import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Grid,
  Button,
  Alert,
  FormControlLabel,
  Switch,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Avatar,
  IconButton,
  CircularProgress,
  ThemeProvider,
  createTheme
} from '@mui/material';
import { PhotoCamera, Save as SaveIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

// Criando um tema específico para a tela de perfil para dar um visual mais "premium"
// mantendo compatibilidade com o layout existente
const profileTheme = createTheme({
  palette: {
    primary: {
      main: '#6366f1', // Indigo 500
      dark: '#4f46e5', // Indigo 600
      light: '#818cf8', // Indigo 400
    },
    background: {
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#0f172a',
    },
    h6: {
      fontWeight: 600,
      color: '#1e293b',
    }
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid #f1f5f9',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s ease-in-out',
            backgroundColor: '#f8fafc',
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366f1',
              borderWidth: '2px',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.1)',
            }
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2), 0 2px 4px -2px rgba(99, 102, 241, 0.1)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3), 0 4px 6px -4px rgba(99, 102, 241, 0.2)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        }
      }
    }
  }
});

const Perfil = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    endereco: '',
    bairro: '',
    cidade: '',
    telefone: '',
    fotoPerfil: '' as string | null,
    configuracoes: {
      notificacoes: {
        ativo: true,
        contasVencidas: true,
        contasProximas: true,
        limiteCartao: true,
        diasAntecedencia: 7
      }
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        endereco: user.endereco || '',
        bairro: user.bairro || '',
        cidade: user.cidade || '',
        telefone: user.telefone || '',
        fotoPerfil: user.fotoPerfil || null,
        configuracoes: {
          notificacoes: {
            ativo: user.configuracoes?.notificacoes?.ativo ?? true,
            contasVencidas: user.configuracoes?.notificacoes?.contasVencidas ?? true,
            contasProximas: user.configuracoes?.notificacoes?.contasProximas ?? true,
            limiteCartao: user.configuracoes?.notificacoes?.limiteCartao ?? true,
            diasAntecedencia: user.configuracoes?.notificacoes?.diasAntecedencia ?? 7
          }
        }
      });
      if (user.fotoPerfil) {
        setImagePreview(user.fotoPerfil);
      }
    }
  }, [user]);

  const handleChange = (e: any) => {
    const { name, value, checked, type } = e.target;
    
    if (name.startsWith('configuracoes.notificacoes.')) {
      const configField = name.replace('configuracoes.notificacoes.', '');
      setFormData({
        ...formData,
        configuracoes: {
          ...formData.configuracoes,
          notificacoes: {
            ...formData.configuracoes.notificacoes,
            [configField]: type === 'checkbox' ? checked : value
          }
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    // Limpar mensagens de erro/sucesso ao digitar
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (limit to ~500KB to fit well in MongoDB)
    if (file.size > 500 * 1024) {
      setMessage({ type: 'error', text: 'A imagem é muito grande. O tamanho máximo permitido é 500KB.' });
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor, selecione um arquivo de imagem válido.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      setFormData(prev => ({ ...prev, fotoPerfil: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.put('/auth/profile', formData);
      const updatedUser = response.data.user;
      
      updateUser(updatedUser);
      
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Erro ao atualizar perfil. Tente novamente.';
      setMessage({ type: 'error', text: errorMsg });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={profileTheme}>
      <Box sx={{ maxWidth: 900, mx: 'auto', py: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4, ml: 1 }}>
          Meu Perfil
        </Typography>

        {message.text && (
          <Alert 
            severity={message.type as 'success' | 'error'} 
            sx={{ mb: 4, borderRadius: 3 }}
          >
            {message.text}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            {/* Coluna da Esquerda (Foto e Dados Básicos) */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <Box sx={{ position: 'relative', mb: 3 }}>
                  <Avatar
                    src={imagePreview || undefined}
                    alt={formData.nome}
                    sx={{ 
                      width: 150, 
                      height: 150, 
                      border: '4px solid white',
                      boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
                      fontSize: 64,
                      bgcolor: 'primary.main'
                    }}
                  >
                    {!imagePreview && formData.nome ? formData.nome.charAt(0).toUpperCase() : ''}
                  </Avatar>
                  <IconButton
                    color="primary"
                    aria-label="upload picture"
                    component="span"
                    onClick={triggerFileInput}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      '&:hover': { backgroundColor: '#f8fafc' }
                    }}
                  >
                    <PhotoCamera />
                  </IconButton>
                  <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    onChange={handleFileChange}
                  />
                </Box>
                
                <Typography variant="h6" align="center" gutterBottom>
                  {formData.nome || 'Seu Nome'}
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  {formData.email}
                </Typography>

                <Divider sx={{ width: '100%', mb: 3 }} />

                <Typography variant="subtitle2" color="text.secondary" sx={{ alignSelf: 'flex-start', mb: 1 }}>
                  Dica
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mantenha seus dados atualizados para receber notificações precisas sobre seus vencimentos.
                </Typography>
              </Paper>
            </Grid>

            {/* Coluna da Direita (Formulário) */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 4, height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  Informações Pessoais
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nome Completo"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="E-mail"
                      name="email"
                      value={formData.email}
                      disabled
                      helperText="O e-mail não pode ser alterado"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefone / Celular"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Endereço"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Bairro"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Cidade"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  Preferências de Notificação
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        border: '1px solid', 
                        borderColor: formData.configuracoes.notificacoes.ativo ? 'primary.light' : 'grey.200',
                        bgcolor: formData.configuracoes.notificacoes.ativo ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                        borderRadius: 2,
                        mb: 2
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.configuracoes.notificacoes.ativo}
                            onChange={handleChange}
                            name="configuracoes.notificacoes.ativo"
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="subtitle1" fontWeight={500}>
                            Ativar sistema de notificações
                          </Typography>
                        }
                      />
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.configuracoes.notificacoes.contasVencidas}
                          onChange={handleChange}
                          name="configuracoes.notificacoes.contasVencidas"
                          color="primary"
                          disabled={!formData.configuracoes.notificacoes.ativo}
                        />
                      }
                      label="Contas vencidas"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.configuracoes.notificacoes.contasProximas}
                          onChange={handleChange}
                          name="configuracoes.notificacoes.contasProximas"
                          color="primary"
                          disabled={!formData.configuracoes.notificacoes.ativo}
                        />
                      }
                      label="Contas próximas ao vencimento"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.configuracoes.notificacoes.limiteCartao}
                          onChange={handleChange}
                          name="configuracoes.notificacoes.limiteCartao"
                          color="primary"
                          disabled={!formData.configuracoes.notificacoes.ativo}
                        />
                      }
                      label="Alertas de limite de cartão"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" disabled={!formData.configuracoes.notificacoes.ativo}>
                      <InputLabel id="dias-antecedencia-label">Avisar com antecedência de</InputLabel>
                      <Select
                        labelId="dias-antecedencia-label"
                        name="configuracoes.notificacoes.diasAntecedencia"
                        value={formData.configuracoes.notificacoes.diasAntecedencia}
                        onChange={handleChange}
                        label="Avisar com antecedência de"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value={1}>1 dia</MenuItem>
                        <MenuItem value={3}>3 dias</MenuItem>
                        <MenuItem value={5}>5 dias</MenuItem>
                        <MenuItem value={7}>7 dias</MenuItem>
                        <MenuItem value={10}>10 dias</MenuItem>
                        <MenuItem value={15}>15 dias</MenuItem>
                        <MenuItem value={30}>30 dias</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </form>
      </Box>
    </ThemeProvider>
  );
};

export default Perfil;
