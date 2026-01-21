import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
} from '@mui/material';

const MetricsCards = ({ data, safeNum }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 3 }}>
        Resumo Financeiro
      </Typography>
      
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ width: '100%' }}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total de Contas a Pagar
              </Typography>
              <Typography variant="h4" component="div">{safeNum(data?.totalContasPagar)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Valor Contas a Pagar (Mês)
              </Typography>
              <Typography variant="h4" color="warning.main" component="div">
                R$ {safeNum(data?.totalValorContasPagarMes).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Contas Pagas
              </Typography>
              <Typography variant="h4" color="success.main" component="div">
                {safeNum(data?.totalContasPagas)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Valor Contas Pagas (Mês)
              </Typography>
              <Typography variant="h4" color="success.main" component="div">
                R$ {safeNum(data?.totalValorContasPagas).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Contas Pendentes
              </Typography>
              <Typography variant="h4" color="warning.main" component="div">
                {safeNum(data?.totalContasPendentesMes)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total de Contas (Mês)
              </Typography>
              <Typography variant="h4" component="div">{safeNum(data?.totalContasMes)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Valor Contas Vencidas
              </Typography>
              <Typography variant="h4" color="error.main" component="div">
                R$ {(data?.totalValorContasVencidas || 0).toFixed(2).replace('.', ',')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Contas Próximo Mês
              </Typography>
              <Typography variant="h4" color="info.main" component="div">
                {safeNum(data?.totalContasNextMonth)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MetricsCards;
