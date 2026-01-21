import React from 'react';
import {
  Box,
  Grid,
  Typography,
} from '@mui/material';
import ComparacaoMeses from '../Charts/ComparacaoMeses';
import EvolucaoSaldo from '../Charts/EvolucaoSaldo';
import CategoriasGastos from '../Charts/CategoriasGastos';

const ChartsSection = ({ data }) => {
  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
        Análise e Comparativos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Visualizações detalhadas dos seus dados financeiros
      </Typography>
      
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ width: '100%' }}>
        <Grid item xs={12} lg={6}>
          <Box sx={{ height: '100%', minHeight: 300 }}>
            <ComparacaoMeses data={data?.mesesComparacao} />
          </Box>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Box sx={{ height: '100%', minHeight: 300 }}>
            <CategoriasGastos data={data?.graficoBarrasTiposDespesa} />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ minHeight: 300 }}>
            <EvolucaoSaldo data={data?.evolucaoSaldo} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChartsSection;
