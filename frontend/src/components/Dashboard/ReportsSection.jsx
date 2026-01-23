import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportsSection = ({ data }) => {
  const renderFormasPagamentoReport = () => {
    if (!data?.relatorioFormasPagamento?.length) {
      return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhuma forma de pagamento encontrada no período.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        {data.relatorioFormasPagamento.map((forma, index) => (
          <Accordion key={forma.formaPagamento}>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                '& .MuiAccordionSummary-content': {
                  margin: { xs: '8px 0', sm: '12px 0' }
                }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    flex: { xs: 1, sm: 'auto' }
                  }}
                >
                  {forma.formaPagamento}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' }
                }}>
                  <Chip 
                    label={`Gastos: R$ ${(forma.totalGastos || 0).toFixed(2).replace('.', ',')}`} 
                    size="small" 
                    color="primary" 
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                  <Chip 
                    label={`Contas: R$ ${(forma.totalContas || 0).toFixed(2).replace('.', ',')}`} 
                    size="small" 
                    color="secondary" 
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total geral: <strong>R$ {(forma.totalGeral || 0).toFixed(2).replace('.', ',')}</strong> ({(forma.percentualGeral || 0).toFixed(1)}%)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Gastos: <strong>R$ {(forma.totalGastos || 0).toFixed(2).replace('.', ',')}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contas: <strong>R$ {(forma.totalContas || 0).toFixed(2).replace('.', ',')}</strong>
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </>
    );
  };

  const renderTiposDespesaReport = () => {
    if (!data?.relatorioTiposDespesa?.length) {
      return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhuma despesa encontrada no período.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        {data.relatorioTiposDespesa.map((tipo) => (
          <Accordion key={tipo.grupoId}>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                '& .MuiAccordionSummary-content': {
                  margin: { xs: '8px 0', sm: '12px 0' }
                }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    flex: { xs: 1, sm: 'auto' }
                  }}
                >
                  {tipo.grupoNome}
                </Typography>
                <Chip 
                  label={`R$ ${(tipo.totalGrupo || 0).toFixed(2).replace('.', ',')}`} 
                  size="small" 
                  color="primary" 
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Subcategoria</TableCell>
                      <TableCell align="right">Valor</TableCell>
                      <TableCell align="right">%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tipo.subgrupos?.slice(0, 5).map((subgrupo, index) => (
                      <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ py: 1.5 }}>{subgrupo.subgrupoNome}</TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          R$ {(subgrupo.valor || 0).toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          {(subgrupo.percentualSubgrupo || 0).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </>
    );
  };

  const renderCartoesReport = () => {
    if (!data?.relatorioCartoes?.length) {
      return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum gasto com cartão encontrado no período selecionado.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Cadastre cartões e utilize-os nos lançamentos para ver os relatórios aqui.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        {data.relatorioCartoes.map((cartao) => (
          <Accordion key={cartao.cartaoId}>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                '& .MuiAccordionSummary-content': {
                  margin: { xs: '8px 0', sm: '12px 0' }
                }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    flex: { xs: 1, sm: 'auto' }
                  }}
                >
                  {cartao.nome}
                </Typography>
                <Chip 
                  label={`R$ ${(cartao.totalGeral || 0).toFixed(2).replace('.', ',')}`} 
                  size="small" 
                  color="primary" 
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total geral: <strong>R$ {(cartao.totalGeral || 0).toFixed(2).replace('.', ',')}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Gastos: <strong>R$ {(cartao.totalGastos || 0).toFixed(2).replace('.', ',')}</strong> ({cartao.quantidadeGastos || 0} transações)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contas: <strong>R$ {(cartao.totalContas || 0).toFixed(2).replace('.', ',')}</strong> ({cartao.quantidadeContas || 0} contas)
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </>
    );
  };

  return (
    <>
      {/* Relatório de Formas de Pagamento */}
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Relatório de Formas de Pagamento
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Análise detalhada por forma de pagamento utilizada
        </Typography>
        
        <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', boxSizing: 'border-box' }}>
          {renderFormasPagamentoReport()}
        </Paper>
      </Box>

      {/* Relatório Detalhado por Tipo de Despesa */}
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Relatório Detalhado por Tipo de Despesa
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Agrupamento de despesas por categoria e tipo
        </Typography>
        
        <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', boxSizing: 'border-box' }}>
          {renderTiposDespesaReport()}
        </Paper>
      </Box>

      {/* Comparação de Gastos por Cartão */}
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Comparação de Gastos por Cartão
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Análise dos gastos realizados com cada cartão
        </Typography>
        
        <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', boxSizing: 'border-box' }}>
          {renderCartoesReport()}
        </Paper>
      </Box>
    </>
  );
};

export default ReportsSection;
