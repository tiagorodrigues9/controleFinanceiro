import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const Perfil = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    endereco: '',
    bairro: '',
    cidade: '',
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
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        endereco: user.endereco || '',
        bairro: user.bairro || '',
        cidade: user.cidade || '',
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
    }
  }, [user]);

  const handleChange = (e) => {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.put('/auth/profile', formData);
      updateUser(response.data.user);
      setMessage('Perfil atualizado com sucesso!');
    } catch (error) {
      setMessage('Erro ao atualizar perfil');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Perfil
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        {message && (
          <Alert severity={message.includes('Erro') ? 'error' : 'success'} sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-mail"
                name="email"
                value={formData.email}
                disabled
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Endereço"
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bairro"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Configurações de Notificações
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.configuracoes.notificacoes.ativo}
                    onChange={handleChange}
                    name="configuracoes.notificacoes.ativo"
                    color="primary"
                  />
                }
                label="Ativar notificações"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
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
                label="Notificar contas vencidas"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
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
                label="Notificar contas próximas ao vencimento"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
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
                label="Notificar limite do cartão"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Dias de antecedência</InputLabel>
                <Select
                  name="configuracoes.notificacoes.diasAntecedencia"
                  value={formData.configuracoes.notificacoes.diasAntecedencia}
                  onChange={handleChange}
                  disabled={!formData.configuracoes.notificacoes.ativo}
                  label="Dias de antecedência"
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
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default Perfil;

