// @ts-nocheck
import React, { useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  ThemeProvider,
  createTheme,
} from '@mui/material';

import ErrorBoundary from '../components/ErrorBoundary';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import MetricsCards from '../components/Dashboard/MetricsCards';
import ChartsSection from '../components/Dashboard/ChartsSection';
import ReportsSection from '../components/Dashboard/ReportsSection';
import useDashboard from '../hooks/useDashboard';

// Tema Premium Indigo/Emerald
const dashboardTheme = createTheme({
  palette: {
    primary: { main: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
    secondary: { main: '#10b981', dark: '#059669', light: '#34d399' },
    background: { paper: '#ffffff', default: '#f8fafc' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, color: '#0f172a' },
    h6: { fontWeight: 600, color: '#1e293b' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
          }
        }
      }
    }
  },
});


const DashboardCompleto = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const { data, loading, error, refetch, safeNum, clearError } = useDashboard(mes, ano);

  const handleMesChange = (newMes) => {
    setMes(newMes);
  };

  const handleAnoChange = (newAno) => {
    setAno(newAno);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={dashboardTheme}>
      <ErrorBoundary
        fallbackMessage="Ocorreu um erro ao carregar o dashboard. Tente novamente mais tarde."
        onError={(error, errorInfo) => {
          console.error('Dashboard Error:', error, errorInfo);
        }}
      >
        <Box sx={{
          maxWidth: '100vw',
          overflowX: 'hidden',
          px: { xs: 1, sm: 2, md: 3 },
          py: 2,
          boxSizing: 'border-box'
        }}>
          {/* Header com seleção de mês/ano */}
          <DashboardHeader
            mes={mes}
            ano={ano}
            onMesChange={handleMesChange}
            onAnoChange={handleAnoChange}
          />

          {/* Alerta de erro */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={clearError}
            >
              {error}
            </Alert>
          )}

          {/* Cards de métricas */}
          <MetricsCards data={data} safeNum={safeNum} />

          {/* Seção de gráficos */}
          <ChartsSection data={data} />

          {/* Seção de relatórios detalhados */}
          <ReportsSection data={data} />
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default DashboardCompleto;
