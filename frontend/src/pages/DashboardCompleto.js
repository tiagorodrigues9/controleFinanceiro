import React, { useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ErrorBoundary from '../components/ErrorBoundary';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import MetricsCards from '../components/Dashboard/MetricsCards';
import ChartsSection from '../components/Dashboard/ChartsSection';
import ReportsSection from '../components/Dashboard/ReportsSection';
import useDashboard from '../hooks/useDashboard';

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
  );
};

export default DashboardCompleto;
