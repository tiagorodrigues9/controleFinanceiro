import React, { useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const EvolucaoSaldo = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const months = data[0].saldos.map((s) => s.data);
    return months.map((m, i) => {
      const entry = { month: m };
      data.forEach((conta) => {
        entry[conta.conta] = conta.saldos[i]?.saldo ?? 0;
      });
      return entry;
    });
  }, [data]);

  return (
    <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h6" gutterBottom>
        Evolução do Saldo por Conta Bancária
      </Typography>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={250} style={{ minWidth: 0 }}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short' })}
            />
            <YAxis tickFormatter={(value) => `R$ ${Number(value).toFixed(0).replace('.', ',')}`} />
            <Tooltip 
              formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, '']}
              labelFormatter={(label) => `Data: ${new Date(label).toLocaleDateString('pt-BR')}`}
            />
            <Legend />
            {data?.map((conta, index) => (
              <Line
                key={conta.conta}
                type="monotone"
                dataKey={conta.conta}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhuma conta bancária encontrada.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default EvolucaoSaldo;
