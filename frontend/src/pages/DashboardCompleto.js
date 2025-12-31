import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../utils/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DashboardCompleto = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, fetchDashboardData]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Controle Financeiro';
    return () => { document.title = prev; };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await api.get('/dashboard', {
        params: { mes, ano },
      });
      setData(response.data);
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

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

  // Build shared chart data for evolucaoSaldo: unify months and balances per account
  const buildChartData = useCallback((evolucao) => {
    if (!evolucao || evolucao.length === 0) return [];
    // assume each conta.saldos is same length and aligned by month (backend guarantees monthly endpoints)
    const months = evolucao[0].saldos.map((s) => s.data);
    return months.map((m, i) => {
      const entry = { month: m };
      evolucao.forEach((conta) => {
        entry[conta.conta] = conta.saldos[i]?.saldo ?? 0;
      });
      return entry;
    });
  }, []);

  const chartData = useMemo(() => buildChartData(data?.evolucaoSaldo), [data?.evolucaoSaldo, buildChartData]);

  return (
    <Box sx={{ flexGrow: 1 }} className="dashboard-page">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 2 } }}>
        <Typography variant="h4" sx={{ flexGrow: 1, minWidth: { xs: 'auto', sm: 200 } }}>Dashboard</Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Mês</InputLabel>
            <Select value={mes} onChange={(e) => setMes(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Ano</InputLabel>
            <Select value={ano} onChange={(e) => setAno(e.target.value)}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }} mb={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total de Contas a Pagar
              </Typography>
              <Typography variant="h4">{safeNum(data?.totalContasPagar)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Valor Contas a Pagar
              </Typography>
              <Typography variant="h4" color="warning.main">
                R$ {safeNum(data?.totalValorContasPendentes).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Contas Pagas
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
                Contas Pendentes
              </Typography>
              <Typography variant="h4" color="warning.main">
                {Math.max(0, safeNum(data?.totalContasPagar) - safeNum(data?.totalContasPagas))}
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
              <Typography variant="h4">{safeNum(data?.totalContasMes)}</Typography>
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
                <Typography variant="h4">{data?.totalContasNextMonth || 0}</Typography>
                <Typography color="textSecondary" variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
                  R$ {(data?.totalValorContasNextMonth || 0).toFixed(2).replace('.', ',')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="h6" gutterBottom>
              Comparação de Meses
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.mesesComparacao || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="h6" gutterBottom>
              Tipo de Despesa com Mais Gasto
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.tipoDespesaMaisGasto || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="valor" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="h6" gutterBottom>
              Evolução do Saldo por Conta Bancária
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  />
                  <YAxis tickFormatter={(value) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Saldo']}
                  />
                  <Legend />
                  {data?.evolucaoSaldo?.map((conta, index) => (
                    <Line
                      key={index}
                      type="monotone"
                      dataKey={conta.conta}
                      name={conta.conta}
                      stroke={COLORS[index % COLORS.length]}
                    />
                  ))}
                </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="h6" gutterBottom>
              Percentual de Gastos por Categoria
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.percentualPorCategoria || []}
                  cx="50%"
                  cy="50%"
                  label={({ categoria, percentual }) => `${categoria}: ${percentual}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="percentual"
                >
                  {(data?.percentualPorCategoria || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardCompleto;

