import React, { useState, FormEvent, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  LinearProgress,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, VpnKey, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { checkPasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from '../utils/passwordUtils';
import './AuthStyles.css';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Token validation state
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [tokenError, setTokenError] = useState<string>('');
  
  const { user, resetPassword, validateResetToken } = useAuth();
  
  const passwordStrength = checkPasswordStrength(password);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setTokenError('Token não fornecido.');
        setIsValidating(false);
        return;
      }
      
      const result = await validateResetToken(token);
      if (!result.valid) {
        setTokenError(result.message || 'Token inválido ou expirado.');
      }
      setIsValidating(false);
    };
    
    checkToken();
  }, [token, validateResetToken]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 6) {
      setValidationError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('As senhas não coincidem.');
      return;
    }

    if (!token) return;

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (result.success) {
      navigate('/login?resetSuccess=true');
    } else {
      setValidationError(result.message || 'Erro ao redefinir senha.');
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  if (isValidating) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress color="primary" sx={{ mb: 2 }} />
          <Typography color="white">Validando token de segurança...</Typography>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <Alert severity="error" className="auth-alert">
            {tokenError}
          </Alert>
          <Button
            component={Link}
            to="/forgot-password"
            fullWidth
            variant="contained"
            className="auth-button"
            sx={{ mt: 2 }}
          >
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-container">
          <div className="auth-logo">
            <VpnKey sx={{ fontSize: 32, color: 'white' }} />
          </div>
        </div>
        
        <Typography component="h1" className="auth-title">
          Nova Senha
        </Typography>
        <Typography className="auth-subtitle">
          Crie uma nova senha forte para sua conta
        </Typography>

        {validationError && (
          <Alert severity="error" className="auth-alert">
            {validationError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Nova Senha"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationError) setValidationError('');
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
            label="Confirmar Nova Senha"
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (validationError) setValidationError('');
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
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
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

export default ResetPassword;

