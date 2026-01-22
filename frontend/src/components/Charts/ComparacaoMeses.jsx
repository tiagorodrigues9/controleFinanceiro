import React from 'react';
import {
  Paper,
  Typography,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ComparacaoMeses = ({ data }) => {
  console.log('🔍 COMPARACAO MESES - Props recebidas:', data);
  console.log('🔍 COMPARACAO MESES - Tipo de data:', typeof data);
  
  // Usar dados de múltiplos meses se disponível
  const chartData = data && typeof data === 'object' && data.comparacaoMensal && Array.isArray(data.comparacaoMensal) 
    ? data.comparacaoMensal.map(mes => ({
        mes: mes.mes,
        contas: mes.totalContas || 0,
        gastos: mes.totalGastos || 0,
        total: mes.total || 0
      }))
    : [];
  
  console.log('🔍 COMPARACAO MESES - Chart data final:', chartData);
  console.log('🔍 COMPARACAO MESES - Chart data length:', chartData.length);
  
  return (
    <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h6" gutterBottom>
        Comparação de Meses: Contas vs Gastos
      </Typography>
      <ResponsiveContainer width="100%" height={250} style={{ minWidth: 0 }}>
        <BarChart data={chartData}>
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
  );
};

export default ComparacaoMeses;
