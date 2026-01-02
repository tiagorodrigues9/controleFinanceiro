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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

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

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, fetchDashboardData]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Controle Financeiro';
    return () => { document.title = prev; };
  }, []);

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
    <Box sx={{ 
      pb: isMobile ? 8 : 3, // Espaço para navegação inferior em mobile
      px: isMobile ? 0.5 : 2,
      pt: isMobile ? 1 : 3,
      minHeight: '100vh',
      bgcolor: 'background.default',
      maxWidth: '100vw',
      overflowX: 'hidden',
      boxSizing: 'border-box',
      width: '100%'
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} sx={{ 
        flexWrap: isMobile ? 'wrap' : 'nowrap', 
        gap: 2,
        maxWidth: '100%'
      }}>
        <Typography variant={isMobile ? "h5" : "h4"}>Dashboard</Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flexShrink: 0,
          minWidth: isMobile ? '200px' : 'auto'
        }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Mês</InputLabel>
            <Select 
              value={mes} 
              onChange={(e) => setMes(e.target.value)}
              label="Mês"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Ano</InputLabel>
            <Select 
              value={ano} 
              onChange={(e) => setAno(e.target.value)}
              label="Ano"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={{ xs: 1, sm: 3 }} sx={{ minWidth: 0, maxWidth: '100%', margin: 0, padding: 0, width: '100%' }}>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Total de Contas a Pagar
              </Typography>
              <Typography variant="h4">{safeNum(data?.totalContasPagar)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Valor Contas a Pagar (Mês)
              </Typography>
              <Typography variant="h4" color="warning.main">
                R$ {safeNum(data?.totalValorContasPendentes).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Contas Pagas
              </Typography>
              <Typography variant="h4" color="success.main">
                {safeNum(data?.totalContasPagas)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Valor Contas Pagas (Mês)
              </Typography>
              <Typography variant="h4" color="success.main">
                R$ {safeNum(data?.totalValorContasPagas).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Contas Pendentes
              </Typography>
              <Typography variant="h4" color="warning.main">
                {safeNum(data?.totalContasPendentesMes)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Total de Contas (Mês)
              </Typography>
              <Typography variant="h4">{safeNum(data?.totalContasMes)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Valor Contas Vencidas
              </Typography>
              <Typography variant="h4" color="error.main">
                R$ {(data?.totalValorContasVencidas || 0).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Card sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            <CardContent sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <Typography color="textSecondary" gutterBottom>
                Próximo Mês — Contas
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, minWidth: 0 }}>
                <Typography variant="h4">{data?.totalContasNextMonth || 0}</Typography>
                <Typography color="textSecondary" variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
                  R$ {(data?.totalValorContasNextMonth || 0).toFixed(2).replace('.', ',')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Análise e Comparativos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Visualizações detalhadas dos seus dados financeiros
        </Typography>
        
        <Grid container spacing={{ xs: 1, sm: 3 }} sx={{ minWidth: 0, maxWidth: '100%', margin: 0, padding: 0, width: '100%' }}>
          <Grid item xs={12} md={6} sx={{ minWidth: 0, maxWidth: '100%' }}>
            <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h6" gutterBottom>
                Comparação de Meses: Contas vs Gastos
              </Typography>
              <ResponsiveContainer width="100%" height={250} style={{ minWidth: 0 }}>
                <BarChart data={data?.mesesComparacao || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(value) => `R$ ${Number(value).toFixed(0).replace('.', ',')}`} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, '']}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="contas" fill="#8884d8" name="Contas Pagas" />
                  <Bar dataKey="gastos" fill="#00C49F" name="Gastos" />
                  <Bar dataKey="total" fill="#FF8042" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} sx={{ minWidth: 0, maxWidth: '100%' }}>
            <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h6" gutterBottom>
                Top 10 Categorias com Mais Gastos
              </Typography>
              <ResponsiveContainer width="100%" height={250} style={{ minWidth: 0 }}>
                <BarChart data={data?.graficoBarrasTiposDespesa || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nome" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tickFormatter={(value) => `R$ ${Number(value).toFixed(0).replace('.', ',')}`} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Valor']}
                    labelFormatter={(label) => `Categoria: ${label}`}
                  />
                  <Bar dataKey="valor" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} sx={{ minWidth: 0, maxWidth: '100%' }}>
            <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h6" gutterBottom>
                Evolução do Saldo por Conta Bancária
              </Typography>
              <ResponsiveContainer width="100%" height={250} style={{ minWidth: 0 }}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    />
                    <YAxis 
                      tickFormatter={(value) => {
                        if (value >= 1000000) {
                          return `R$ ${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          return `R$ ${(value / 1000).toFixed(0)}K`;
                        } else {
                          return `R$ ${value.toFixed(0)}`;
                        }
                      }}
                    />
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

          <Grid item xs={12} md={6} sx={{ minWidth: 0, maxWidth: '100%' }}>
            <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h6" gutterBottom>
                Percentual de Gastos por Categoria
              </Typography>
              <ResponsiveContainer width="100%" height={250} style={{ minWidth: 0 }}>
                <PieChart>
                  <Pie
                    data={data?.graficoPizzaTiposDespesa || []}
                    cx="50%"
                    cy="50%"
                    label={({ categoria, percentual }) => `${categoria}: ${percentual.toFixed(1)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="valor"
                  >
                    {(data?.graficoPizzaTiposDespesa || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Relatório de Formas de Pagamento
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Valores movimentados no mês/ano selecionados, organizados por forma de pagamento
        </Typography>
        
        <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            
            {data?.relatorioFormasPagamento?.length > 0 ? (
              <Box>
                {data.relatorioFormasPagamento.map((forma, index) => (
                  <Accordion key={forma.formaPagamento} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {forma.formaPagamento}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={`R$ ${forma.totalGeral.toFixed(2).replace('.', ',')}`}
                            color="primary" 
                            variant="outlined"
                            size="small"
                          />
                          <Chip 
                            label={`${forma.percentualGeral.toFixed(1)}%`}
                            color="secondary" 
                            variant="filled"
                            size="small"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer size="small">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Tipo</TableCell>
                              <TableCell align="right">Valor</TableCell>
                              <TableCell align="right">% do Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Gastos</TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  R$ {forma.totalGastos.toFixed(2).replace('.', ',')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="text.secondary">
                                  {forma.totalGeral > 0 ? ((forma.totalGastos / forma.totalGeral) * 100).toFixed(1) : 0}%
                                </Typography>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Contas Pagas</TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  R$ {forma.totalContas.toFixed(2).replace('.', ',')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="text.secondary">
                                  {forma.totalGeral > 0 ? ((forma.totalContas / forma.totalGeral) * 100).toFixed(1) : 0}%
                                </Typography>
                              </TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  Total
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                                  R$ {forma.totalGeral.toFixed(2).replace('.', ',')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Chip 
                                  label="100.0%"
                                  size="small"
                                  color="success"
                                />
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
                
                {/* Resumo Total */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Resumo Total do Período
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          Total Movimentado
                        </Typography>
                        <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          R$ {data.relatorioFormasPagamento.reduce((acc, forma) => acc + forma.totalGeral, 0).toFixed(2).replace('.', ',')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          Número de Formas
                        </Typography>
                        <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                          {data.relatorioFormasPagamento.length}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          Média por Forma
                        </Typography>
                        <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                          R$ {(data.relatorioFormasPagamento.reduce((acc, forma) => acc + forma.totalGeral, 0) / data.relatorioFormasPagamento.length).toFixed(2).replace('.', ',')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Nenhuma forma de pagamento encontrada no período
              </Typography>
            )}
          </Paper>
      </Box>

      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Relatório Detalhado por Tipo de Despesa
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Valores gastos no mês/ano selecionados, organizados por categoria do plano de contas
        </Typography>
        
        <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            
            {data?.relatorioTiposDespesa?.length > 0 ? (
              <Box>
                {data.relatorioTiposDespesa.map((grupo, index) => (
                  <Accordion key={grupo.grupoId} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {grupo.grupoNome}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={`R$ ${grupo.totalGrupo.toFixed(2).replace('.', ',')}`}
                            color="primary" 
                            variant="outlined"
                            size="small"
                          />
                          <Chip 
                            label={`${grupo.percentualGrupo.toFixed(1)}%`}
                            color="secondary" 
                            variant="filled"
                            size="small"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {grupo.subgrupos.length > 0 ? (
                        <TableContainer size="small">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Subcategoria</TableCell>
                                <TableCell align="right">Valor</TableCell>
                                <TableCell align="right">% do Grupo</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {grupo.subgrupos.map((subgrupo) => (
                                <TableRow key={subgrupo.subgrupoNome}>
                                  <TableCell>{subgrupo.subgrupoNome}</TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      R$ {subgrupo.valor.toFixed(2).replace('.', ',')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip 
                                      label={`${subgrupo.percentualSubgrupo.toFixed(1)}%`}
                                      size="small"
                                      color="default"
                                      variant="outlined"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Nenhum gasto detalhado encontrado para este grupo no período.
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
                
                {/* Resumo Total */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Resumo Total do Período
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          Total Gasto no Período
                        </Typography>
                        <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          R$ {data.relatorioTiposDespesa.reduce((acc, grupo) => acc + grupo.totalGrupo, 0).toFixed(2).replace('.', ',')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          Número de Categorias
                        </Typography>
                        <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                          {data.relatorioTiposDespesa.length}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          Média por Categoria
                        </Typography>
                        <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                          R$ {(data.relatorioTiposDespesa.reduce((acc, grupo) => acc + grupo.totalGrupo, 0) / data.relatorioTiposDespesa.length).toFixed(2).replace('.', ',')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                Nenhum gasto encontrado no período selecionado.
              </Typography>
            )}
          </Paper>
      </Box>

      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Comparação de Gastos por Cartão
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Valores gastos no mês/ano selecionados, organizados por cartão
        </Typography>
        
        <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            
            {data?.relatorioCartoes?.length > 0 ? (
              <>
                <Grid container spacing={2}>
                {data.relatorioCartoes.map((cartao) => (
                  <Grid item xs={12} sm={6} md={4} key={cartao.cartaoId}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {cartao.nome}
                          </Typography>
                          <Chip
                            label={cartao.tipo}
                            color={cartao.tipo === 'Crédito' ? 'primary' : 'secondary'}
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {cartao.banco}
                        </Typography>
                        
                        <Box mb={2}>
                          <Typography variant="body2" color="text.secondary">
                            Total Gasto
                          </Typography>
                          <Typography variant="h6" color="error.main" sx={{ fontWeight: 'bold' }}>
                            R$ {cartao.totalGeral.toFixed(2).replace('.', ',')}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="caption" color="text.secondary">
                            Gastos: R$ {cartao.totalGastos.toFixed(2).replace('.', ',')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Contas: R$ {cartao.totalContas.toFixed(2).replace('.', ',')}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {cartao.quantidadeTransacoes} transações
                          </Typography>
                          {cartao.tipo === 'Crédito' && cartao.limite > 0 && (
                            <Box textAlign="right">
                              <Typography variant="caption" color="text.secondary">
                                Limite utilizado
                              </Typography>
                              <Typography variant="body2" color={cartao.limiteUtilizado > 80 ? 'error.main' : 'success.main'}>
                                {cartao.limiteUtilizado}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
                
                {/* Gráfico de Comparação de Cartões */}
                {data.relatorioCartoes.length > 1 && (
                  <Box sx={{ mt: 3 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.relatorioCartoes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" />
                        <YAxis tickFormatter={(value) => `R$ ${Number(value).toFixed(0).replace('.', ',')}`} />
                        <Tooltip 
                          formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Total Gasto']}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Box sx={{ p: 1, bgcolor: 'background.paper', border: '1px solid #ccc' }}>
                                  <Typography variant="subtitle2">{data.nome}</Typography>
                                  <Typography variant="body2">
                                    Total: R$ {data.totalGeral.toFixed(2).replace('.', ',')}
                                  </Typography>
                                  <Typography variant="body2">
                                    Gastos: R$ {data.totalGastos.toFixed(2).replace('.', ',')}
                                  </Typography>
                                  <Typography variant="body2">
                                    Contas: R$ {data.totalContas.toFixed(2).replace('.', ',')}
                                  </Typography>
                                  <Typography variant="body2">
                                    Transações: {data.quantidadeTransacoes}
                                  </Typography>
                                  {data.tipo === 'Crédito' && (
                                    <Typography variant="body2">
                                      Limite utilizado: {data.limiteUtilizado}%
                                    </Typography>
                                  )}
                                </Box>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="totalGeral" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum gasto com cartão encontrado no período selecionado.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Cadastre cartões e utilize-os nos lançamentos para ver os relatórios aqui.
                </Typography>
              </Box>
            )}
          </Paper>
      </Box>
    </Box>
  );
};

export default DashboardCompleto;

