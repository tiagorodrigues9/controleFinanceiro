import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import api from '../utils/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const currentDate = new Date();
      const mes = currentDate.getMonth() + 1;
      const ano = currentDate.getFullYear();

      const response = await api.get('/dashboard', {
        params: { mes, ano },
      });
      setData(response.data);
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const safeNum = (v) => (typeof v === 'number' ? v : Number(v) || 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Contas Pendentes
              </Typography>
              <Typography variant="h4">
                {safeNum(data?.totalContasPagar)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Contas Pagas (Mês)
              </Typography>
              <Typography variant="h4" color="success.main">
                {safeNum(data?.totalContasPagas)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Contas Vencidas (Mês)
              </Typography>
              <Typography variant="h4" color="error.main">
                {safeNum(data?.totalContasVencidas)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total de Contas (Mês)
              </Typography>
              <Typography variant="h4">
                {safeNum(data?.totalContasMes)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Valor Contas Pagas (Mês)
              </Typography>
              <Typography variant="h4" color="success.main">
                R$ {safeNum(data?.totalValorContasPagas).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Valor Contas Pendentes
              </Typography>
              <Typography variant="h4" color="warning.main">
                R$ {safeNum(data?.totalValorContasPendentes).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Valor Contas Vencidas
              </Typography>
              <Typography variant="h4" color="error.main">
                R$ {(data?.totalValorContasVencidas || 0).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Próximo Mês — Contas
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <Typography variant="h4">{safeNum(data?.totalContasNextMonth)}</Typography>
                <Typography color="textSecondary" variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
                  R$ {safeNum(data?.totalValorContasNextMonth).toFixed(2).replace('.', ',')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

