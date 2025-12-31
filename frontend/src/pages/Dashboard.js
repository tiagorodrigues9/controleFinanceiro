import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import api from '../utils/api';

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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

  // Componente para renderizar cards no mobile
  const DashboardCard = ({ title, value, color, subtitle }) => (
    <Card sx={{ mb: 1.5, maxWidth: 260, mx: 'auto' }}>
      <CardContent sx={{ textAlign: 'center', py: 1 }}>
        <Typography color="textSecondary" gutterBottom variant="caption" sx={{ fontSize: '0.7rem' }}>
          {title}
        </Typography>
        <Typography variant="h6" color={color} sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

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
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {isMobile ? (
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <DashboardCard
                  title="A Pagar"
                  value={`R$ ${safeNum(data?.totalValorContasPagarMes).toFixed(2).replace('.', ',')}`}
                  color="warning.main"
                />
              </Grid>
              <Grid item xs={6}>
                <DashboardCard
                  title="Pendentes"
                  value={safeNum(data?.totalContasPendentesMes)}
                  color="warning.main"
                />
              </Grid>
              <Grid item xs={6}>
                <DashboardCard
                  title="Pagas"
                  value={safeNum(data?.totalContasPagas)}
                  color="success.main"
                />
              </Grid>
              <Grid item xs={6}>
                <DashboardCard
                  title="Vencidas"
                  value={safeNum(data?.totalContasVencidas)}
                  color="error.main"
                />
              </Grid>
              <Grid item xs={6}>
                <DashboardCard
                  title="Total"
                  value={safeNum(data?.totalContasMes)}
                  color="text.primary"
                />
              </Grid>
              <Grid item xs={6}>
                <DashboardCard
                  title="Valor Pg"
                  value={`R$ ${safeNum(data?.totalValorContasPagas).toFixed(2).replace('.', ',')}`}
                  color="success.main"
                />
              </Grid>
              <Grid item xs={6}>
                <DashboardCard
                  title="Valor Pd"
                  value={`R$ ${safeNum(data?.totalValorContasPendentes).toFixed(2).replace('.', ',')}`}
                  color="warning.main"
                />
              </Grid>
              <Grid item xs={6}>
                <DashboardCard
                  title="Valor Vc"
                  value={`R$ ${(data?.totalValorContasVencidas || 0).toFixed(2).replace('.', ',')}`}
                  color="error.main"
                />
              </Grid>
              <Grid item xs={12}>
                <DashboardCard
                  title="Próximo Mês"
                  value={safeNum(data?.totalContasNextMonth)}
                  color="primary.main"
                  subtitle={`R$ ${safeNum(data?.totalValorContasNextMonth).toFixed(2).replace('.', ',')}`}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography color="textSecondary" gutterBottom>
                      Valor Contas a Pagar (Mês)
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      R$ {safeNum(data?.totalValorContasPagarMes).toFixed(2).replace('.', ',')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography color="textSecondary" gutterBottom>
                      Contas Pendentes (Mês)
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {safeNum(data?.totalContasPendentesMes)}
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
          )}
        </>
      )}
    </Box>
  );
};

export default Dashboard;

