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
  ResponsiveContainer,
} from 'recharts';

const CategoriasGastos = ({ data }) => {
  return (
    <Paper sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h6" gutterBottom>
        Top 10 Categorias com Mais Gastos
      </Typography>
      <ResponsiveContainer width="100%" height={250} style={{ minWidth: 0 }}>
        <BarChart data={data || []}>
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
          />
          <Bar dataKey="valor" fill="#00C49F" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default CategoriasGastos;
