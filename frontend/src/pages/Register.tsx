import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  LinearProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { checkPasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from '../utils/passwordUtils';
import './AuthStyles.css';

const Register: React.FC = () => {
  const [nome, setNome] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const { user, register, error, setError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }
    setError(null);
    return () => setError(null);
  }, [user, navigate, setError]);

  const passwordStrength = checkPasswordStrength(password);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setValidationError('');

    // Basic validations
    if (!nome.trim()) {
      setValidationError('Nome é obrigatório.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Por favor, insira um e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setValidationError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await register(nome, email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setValidationError(result.message || 'Erro ao registrar.');
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-container">
          <div className="auth-logo">
            <PersonAdd sx={{ fontSize: 32, color: 'white' }} />
          </div>
        </div>
        
        <Typography component="h1" className="auth-title">
          Criar Conta
        </Typography>
        <Typography className="auth-subtitle">
          Junte-se a nós e organize suas finanças
        </Typography>

        {(error || validationError) && (
          <Alert severity="error" className="auth-alert">
            {error || validationError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="nome"
            label="Nome Completo"
            name="nome"
            autoComplete="name"
            autoFocus
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (validationError) setValidationError('');
              if (error) setError(null);
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationError) setValidationError('');
              if (error) setError(null);
            }}
            helperText={`Força: ${getPasswordStrengthLabel(passwordStrength)}`}
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
          
          {password && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={passwordStrength}
                color={getPasswordStrengthColor(passwordStrength) as any}
              />
            </Box>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirmar Senha"
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (validationError) setValidationError('');
              if (error) setError(null);
            }}
            error={confirmPassword.length > 0 && password !== confirmPassword}
            helperText={confirmPassword.length > 0 && password !== confirmPassword ? "As senhas não coincidem" : ""}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            className="auth-button"
            disabled={loading || password.length < 6 || password !== confirmPassword}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>

          <Box className="auth-links">
            <Typography variant="body2" color="#94a3b8">
              Já tem uma conta?{' '}
              <MuiLink component={Link} to="/login" className="auth-link">
                Faça login
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </div>
    </div>
  );
};

export default Register;

