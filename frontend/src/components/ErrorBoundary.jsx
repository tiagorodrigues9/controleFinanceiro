import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log do erro para debugging
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    // Enviar para serviço de logging (opcional)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          p: 2
        }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
            <ErrorOutline 
              sx={{ 
                fontSize: 64, 
                color: 'error.main', 
                mb: 2 
              }} 
            />
            
            <Typography variant="h5" gutterBottom color="error.main">
              Ocorreu um erro inesperado
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {this.props.fallbackMessage || 
               'Ocorreu um erro ao carregar esta página. Tente novamente ou entre em contato com o suporte.'}
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ 
                textAlign: 'left', 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1, 
                mb: 3,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                maxHeight: 200,
                overflow: 'auto'
              }}>
                <Typography variant="subtitle2" gutterBottom>
                  Detalhes do erro (desenvolvimento):
                </Typography>
                <pre>
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </Box>
            )}
            
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleRetry}
              sx={{ mr: 2 }}
            >
              Tentar Novamente
            </Button>
            
            {this.props.showHomeButton && (
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/'}
              >
                Página Inicial
              </Button>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
