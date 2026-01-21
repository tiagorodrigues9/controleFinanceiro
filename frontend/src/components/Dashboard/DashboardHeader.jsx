import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';

const DashboardHeader = ({ mes, ano, onMesChange, onAnoChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const meses = [
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

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Box sx={{ mb: 4 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: 2
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold',
            color: 'primary.main',
            textAlign: { xs: 'center', sm: 'left' },
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
          }}
        >
          Dashboard Financeiro
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2, 
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            justifyContent: { xs: 'center', sm: 'flex-end' }
          }}
        >
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: { xs: 120, sm: 140 },
              flexShrink: 0
            }}
          >
            <InputLabel>Mês</InputLabel>
            <Select
              value={mes}
              label="Mês"
              onChange={(e) => onMesChange(e.target.value)}
            >
              {meses.map((mes) => (
                <MenuItem key={mes.value} value={mes.value}>
                  {mes.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl 
            size="small" 
            sx={{ 
              minWidth: { xs: 80, sm: 100 },
              flexShrink: 0
            }}
          >
            <InputLabel>Ano</InputLabel>
            <Select
              value={ano}
              label="Ano"
              onChange={(e) => onAnoChange(e.target.value)}
            >
              {anos.map((ano) => (
                <MenuItem key={ano} value={ano}>
                  {ano}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardHeader;
