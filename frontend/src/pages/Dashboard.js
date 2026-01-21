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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../utils/api';

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard', {
        params: { mes: selectedMonth, ano: selectedYear },
      });
      setData(response.data);
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Gerar anos disponíveis (ano atual - 2 até ano atual + 2)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

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
      {/* Header com título */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Typography variant="h4" sx={{ mb: 0 }}>
            Dashboard
          </Typography>
        </Grid>
        
        <Grid item xs={6}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            justifyContent: 'flex-end'
          }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Mês</InputLabel>
              <Select
                value={selectedMonth}
                label="Mês"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Ano</InputLabel>
              <Select
                value={selectedYear}
                label="Ano"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <IconButton onClick={handleRefresh} size="small" title="Atualizar">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

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
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Valor Contas a Pagar (Mês)
                    </Typography>
                    <Typography variant="h5" color="warning.main" sx={{ fontWeight: 600 }}>
                      R$ {safeNum(data?.totalValorContasPagarMes).toFixed(2).replace('.', ',')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Contas Pendentes (Mês)
                    </Typography>
                    <Typography variant="h5" color="warning.main" sx={{ fontWeight: 600 }}>
                      {safeNum(data?.totalContasPendentesMes)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Contas Pagas (Mês)
                    </Typography>
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                      {safeNum(data?.totalContasPagas)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Contas Vencidas (Mês)
                    </Typography>
                    <Typography variant="h5" color="error.main" sx={{ fontWeight: 600 }}>
                      {safeNum(data?.totalContasVencidas)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total de Contas (Mês)
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {safeNum(data?.totalContasMes)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Valor Contas Pagas (Mês)
                    </Typography>
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                      R$ {safeNum(data?.totalValorContasPagas).toFixed(2).replace('.', ',')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Valor Contas Pendentes
                    </Typography>
                    <Typography variant="h5" color="warning.main" sx={{ fontWeight: 600 }}>
                      R$ {safeNum(data?.totalValorContasPendentes).toFixed(2).replace('.', ',')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Valor Contas Vencidas
                    </Typography>
                    <Typography variant="h5" color="error.main" sx={{ fontWeight: 600 }}>
                      R$ {(data?.totalValorContasVencidas || 0).toFixed(2).replace('.', ',')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: 140 }}>
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Próximo Mês — Contas
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>{safeNum(data?.totalContasNextMonth)}</Typography>
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

