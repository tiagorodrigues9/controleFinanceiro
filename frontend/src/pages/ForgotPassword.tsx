import React, { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import './AuthStyles.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [success, setSuccess] = useState<boolean>(false);
  
  const { user, forgotPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setValidationError('');
    setMessage('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Por favor, insira um e-mail válido.');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setMessage(
        'Se o e-mail estiver cadastrado, você receberá um link de recuperação. Verifique sua caixa de entrada e pasta de spam. O link expira em 10 minutos.'
      );
      setCooldown(60); // 60 segundos de cooldown
    } else {
      setValidationError(result.message || 'Erro ao processar solicitação.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-container">
          <div className="auth-logo">
            <Email sx={{ fontSize: 32, color: 'white' }} />
          </div>
        </div>
        
        <Typography component="h1" className="auth-title">
          Recuperar Senha
        </Typography>
        <Typography className="auth-subtitle">
          Enviaremos um link para você redefinir sua senha
        </Typography>

        {validationError && (
          <Alert severity="error" className="auth-alert">
            {validationError}
          </Alert>
        )}

        {message && (
          <Alert severity="success" className="auth-alert-success">
            {message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError('');
            }}
            disabled={success}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            className="auth-button"
            disabled={loading || cooldown > 0 || success}
          >
            {loading ? 'Enviando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar Link'}
          </Button>

          <Box className="auth-links" mt={2}>
            <MuiLink component={Link} to="/login" className="auth-link" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ArrowBack fontSize="small" /> Voltar para o Login
            </MuiLink>
          </Box>
        </Box>
      </div>
    </div>
  );
};

export default ForgotPassword;
