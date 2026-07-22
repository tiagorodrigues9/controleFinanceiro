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
  // Usar dados de múltiplos meses se disponível
  const chartData = data && Array.isArray(data) 
    ? data.map(mes => ({
        mes: mes.mes,
        entradas: mes.entradas || 0,
        gastos: mes.gastos || 0
      }))
    : [];
  
  return (
    <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h6" gutterBottom>
        Comparação de Meses: Receitas vs Despesas
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
          <Bar dataKey="entradas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default ComparacaoMeses;
