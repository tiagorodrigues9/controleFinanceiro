import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Visibility, VisibilityOff, AccountBalanceWallet } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import './AuthStyles.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const { user, login, error, setError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }
    setError(null);
    return () => setError(null);
  }, [user, navigate, setError]);

  useEffect(() => {
    // Check for success message from reset password
    const params = new URLSearchParams(location.search);
    if (params.get('resetSuccess') === 'true') {
      setSuccessMessage('Senha redefinida com sucesso. Faça login com sua nova senha.');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setValidationError('');
    setSuccessMessage('');
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Por favor, insira um e-mail válido.');
      return;
    }

    setSubmitting(true);

    const result = await login(email, password, rememberMe);

    if (result.success) {
      navigate('/');
    } else {
      setSubmitting(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-container">
          <div className="auth-logo">
            <AccountBalanceWallet sx={{ fontSize: 32, color: 'white' }} />
          </div>
        </div>
        
        <Typography component="h1" className="auth-title">
          Bem-vindo de volta
        </Typography>
        <Typography className="auth-subtitle">
          Faça login para gerenciar suas finanças
        </Typography>

        {(error || validationError) && (
          <Alert severity="error" className="auth-alert">
            {error || validationError}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" className="auth-alert-success">
            {successMessage}
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
              if (error) setError(null);
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationError) setValidationError('');
              if (error) setError(null);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  name="rememberMe"
                  color="primary"
                />
              }
              label="Lembrar-me"
            />
            <MuiLink
              component={Link}
              to="/forgot-password"
              className="auth-link"
            >
              Esqueceu a senha?
            </MuiLink>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            className="auth-button"
            disabled={submitting}
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>

          <Box className="auth-links">
            <Typography variant="body2" color="#94a3b8">
              Não tem uma conta?{' '}
              <MuiLink component={Link} to="/register" className="auth-link">
                Cadastre-se
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </div>
    </div>
  );
};

export default Login;

