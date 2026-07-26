import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CreditCardIcon from '@mui/icons-material/CreditCard';

const MetricsCards = ({ data, safeNum }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>Saldo do Mês (Entradas - Saídas)</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    R$ {safeNum(data?.saldoMes).toFixed(2).replace('.', ',')}
                  </Typography>
                </Box>
                <AccountBalanceWalletIcon sx={{ opacity: 0.5, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>Gastos Diários</Typography>
                  <Typography variant="h5" color="error.main" sx={{ fontWeight: 700 }}>
                    R$ {safeNum(data?.totalGastosMes).toFixed(2).replace('.', ',')}
                  </Typography>
                </Box>
                <TrendingDownIcon color="error" sx={{ opacity: 0.5, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>Contas Pagas</Typography>
                  <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                    R$ {safeNum(data?.totalValorContasPagas).toFixed(2).replace('.', ',')}
                  </Typography>
                </Box>
                <TrackChangesIcon color="success" sx={{ opacity: 0.5, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>Contas a Pagar</Typography>
                  <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                    R$ {safeNum(data?.totalValorContasPagarMes).toFixed(2).replace('.', ',')}
                  </Typography>
                </Box>
                <CreditCardIcon color="warning" sx={{ opacity: 0.5, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MetricsCards;
