import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  ThemeProvider,
  createTheme,
  InputAdornment,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Collapse
} from '@mui/material';
import { Save as SaveIcon, Warning as WarningIcon, TrackChanges as TrackIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import api from '../utils/api';

// Tema Premium Indigo/Emerald
const budgetTheme = createTheme({
  palette: {
    primary: { main: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
    secondary: { main: '#10b981', dark: '#059669', light: '#34d399' },
    background: { paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, color: '#0f172a' },
    h6: { fontWeight: 600, color: '#1e293b' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
          border: '1px solid #f1f5f9',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(99,102,241,0.2)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
      },
    },
  },
});

interface SubgrupoModel {
  nome: string;
}

interface Grupo {
  _id: string;
  nome: string;
  subgrupos?: SubgrupoModel[];
}

interface LimiteSubgrupo {
  nome: string;
  valorLimite: number;
  gastoReal: number;
}

interface LimiteGrupo {
  grupo: string | Grupo;
  nome?: string;
  valorLimite: number;
  gastoReal: number;
  subgrupos: LimiteSubgrupo[];
}

interface OrcamentoData {
  valorLimiteGeral: number;
  gastoRealGeral: number;
  limitesPorGrupo: LimiteGrupo[];
}

const Orcamentos: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const today = useMemo(() => new Date(), []);
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  
  const [orcamento, setOrcamento] = useState<OrcamentoData>({ 
    valorLimiteGeral: 0, 
    gastoRealGeral: 0,
    limitesPorGrupo: [] 
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Controls expanded state of cards that have subgroups
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});

  const toggleExpand = (groupId: string) => {
    setExpandedCards(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resGrupos, resOrcamento] = await Promise.all([
        api.get('/grupos'),
        api.get(`/orcamentos/${ano}/${mes}`)
      ]);
      
      const orcData = resOrcamento.data;
      if (!orcData.limitesPorGrupo) {
        orcData.limitesPorGrupo = [];
      }
      
      // Mapear os grupos para garantir que todos tenham um limite (mesmo que 0) e herdem o gasto real
      const limites: LimiteGrupo[] = resGrupos.data.map((g: Grupo) => {
        const existente = orcData.limitesPorGrupo.find((l: any) => 
          l.grupo?._id === g._id || l.grupo === g._id
        );
        
        const subgruposReais = g.subgrupos || [];
        
        const subgruposMapeados: LimiteSubgrupo[] = subgruposReais.map(sub => {
          const subExistente = existente?.subgrupos?.find((s: any) => s.nome === sub.nome);
          return {
            nome: sub.nome,
            valorLimite: subExistente ? subExistente.valorLimite : 0,
            gastoReal: subExistente ? subExistente.gastoReal : 0
          };
        });

        let valLim = existente ? existente.valorLimite : 0;
        // Se houver subgrupos, a soma dos limites dos subgrupos dita o valorLimite principal na view.
        if (subgruposMapeados.length > 0) {
           valLim = subgruposMapeados.reduce((acc, curr) => acc + curr.valorLimite, 0);
        }

        return {
          grupo: g._id,
          nome: g.nome,
          valorLimite: valLim,
          gastoReal: existente ? existente.gastoReal : 0,
          subgrupos: subgruposMapeados
        };
      });
      
      setOrcamento({
        valorLimiteGeral: orcData.valorLimiteGeral || 0,
        gastoRealGeral: orcData.gastoRealGeral || 0,
        limitesPorGrupo: limites
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar dados do orçamento');
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        valorLimiteGeral: parseFloat(orcamento.valorLimiteGeral.toString()) || 0,
        limitesPorGrupo: orcamento.limitesPorGrupo.map(l => ({
          grupo: l.grupo,
          valorLimite: parseFloat(l.valorLimite.toString()) || 0,
          subgrupos: l.subgrupos.map(s => ({
            nome: s.nome,
            valorLimite: parseFloat(s.valorLimite.toString()) || 0
          }))
        }))
      };
      
      await api.post(`/orcamentos/${ano}/${mes}`, payload);
      setSuccess('Orçamento salvo com sucesso!');
      fetchData();
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const handleLimiteGrupoChange = (index: number, value: string) => {
    const novosLimites = [...orcamento.limitesPorGrupo];
    novosLimites[index].valorLimite = parseFloat(value) || 0;
    setOrcamento({ ...orcamento, limitesPorGrupo: novosLimites });
  };

  const handleLimiteSubgrupoChange = (grupoIndex: number, subIndex: number, value: string) => {
    const novosLimites = [...orcamento.limitesPorGrupo];
    const val = parseFloat(value) || 0;
    
    novosLimites[grupoIndex].subgrupos[subIndex].valorLimite = val;
    
    // Recalcular o valorLimite do Grupo Pai
    const soma = novosLimites[grupoIndex].subgrupos.reduce((acc, curr) => acc + curr.valorLimite, 0);
    novosLimites[grupoIndex].valorLimite = soma;
    
    setOrcamento({ ...orcamento, limitesPorGrupo: novosLimites });
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'error';
    if (percent >= 80) return 'warning';
    return 'success';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const renderProgressBar = (gasto: number, limite: number) => {
    if (limite <= 0) return null; // Se não tem limite definido, não tem barra
    
    const percent = Math.min((gasto / limite) * 100, 100);
    const color = getProgressColor(percent);
    
    return (
      <Box sx={{ width: '100%', mt: 1.5 }}>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">
            Consumo: {percent.toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">
            {formatCurrency(gasto)} / {formatCurrency(limite)}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={percent} 
          color={color}
          sx={{ height: 8, borderRadius: 4 }}
        />
        {percent >= 100 && (
          <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 0.5 }}>
            <WarningIcon fontSize="inherit" /> Limite estourado
          </Typography>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const progressoGeral = orcamento.valorLimiteGeral > 0 
    ? Math.min((orcamento.gastoRealGeral / orcamento.valorLimiteGeral) * 100, 100)
    : 0;

  return (
    <ThemeProvider theme={budgetTheme}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={3} gap={2}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrackIcon color="primary" fontSize="large" /> Metas de Gastos
          </Typography>
          
          <Paper sx={{ p: 1, px: 2, borderRadius: 3, display: 'flex', gap: 2, bgcolor: '#f8fafc' }}>
            <FormControl variant="standard" size="small">
              <InputLabel>Mês</InputLabel>
              <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} disableUnderline sx={{ fontWeight: 'bold' }}>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="standard" size="small">
              <InputLabel>Ano</InputLabel>
              <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} disableUnderline sx={{ fontWeight: 'bold' }}>
                {Array.from({length: 5}).map((_, idx) => {
                  const y = today.getFullYear() - 1 + idx;
                  return <MenuItem key={y} value={y}>{y}</MenuItem>;
                })}
              </Select>
            </FormControl>
          </Paper>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 4 }}>
              <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom color="rgba(255,255,255,0.8)">
                      Orçamento Geral do Mês
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={1}>
                      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '3rem' }, fontWeight: 'bold' }}>
                        {formatCurrency(orcamento.gastoRealGeral)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }} color="rgba(255,255,255,0.7)">
                        gastos no mês
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.15)', p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
                      <Typography variant="body2" mb={1} color="rgba(255,255,255,0.8)">
                        Qual o seu limite máximo de gastos para este mês?
                      </Typography>
                      <TextField
                        fullWidth
                        size={isMobile ? "small" : "medium"}
                        type="number"
                        variant="outlined"
                        value={orcamento.valorLimiteGeral || ''}
                        onChange={(e) => setOrcamento({ ...orcamento, valorLimiteGeral: parseFloat(e.target.value) || 0 })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start" sx={{ color: 'white' }}>R$</InputAdornment>,
                          sx: { color: 'white', bgcolor: 'rgba(0,0,0,0.1)', '& fieldset': { border: 'none' } }
                        }}
                        placeholder="Ex: 5000.00"
                      />
                      
                      {orcamento.valorLimiteGeral > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="rgba(255,255,255,0.7)">Progresso</Typography>
                            <Typography variant="caption" fontWeight="bold">
                              {progressoGeral.toFixed(1)}% do limite
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={progressoGeral} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: progressoGeral >= 100 ? '#ef4444' : progressoGeral >= 80 ? '#fbbf24' : '#10b981'
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4 }}>
              <Typography variant="h6" gutterBottom>
                Metas por Categoria (Grupos)
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={4}>
                Defina limites para cada categoria ou por subgrupos. Categorias que possuem subgrupos calcularão o limite automaticamente através da soma deles.
              </Typography>
              
              <Grid container spacing={3} alignItems="flex-start">
                {orcamento.limitesPorGrupo.map((limite, index) => {
                  const hasSubgroups = limite.subgrupos.length > 0;
                  const isExpanded = expandedCards[limite.grupo as string] || false;
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={limite.grupo as string}>
                      <Card variant="outlined" sx={{ border: '1px solid #e2e8f0', borderRadius: 3, '&:hover': { borderColor: 'primary.light', bgcolor: '#f8fafc' } }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} minHeight={32}>
                            <Typography variant="subtitle2" color="text.primary" fontWeight="bold">
                              {limite.nome}
                            </Typography>
                            {hasSubgroups && (
                              <Button 
                                size="small" 
                                onClick={() => toggleExpand(limite.grupo as string)}
                                endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                                sx={{ minWidth: 'auto', p: 0.5 }}
                              >
                                {limite.subgrupos.length} Subs
                              </Button>
                            )}
                          </Box>
                          
                          {hasSubgroups ? (
                            <Box mb={1} sx={{ bgcolor: 'rgba(99, 102, 241, 0.05)', p: 1.5, borderRadius: 2, minHeight: 104, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <Typography variant="caption" color="text.secondary" display="block">Limite Total Agregado</Typography>
                              <Typography variant="h6" color="primary.main" fontWeight="bold">
                                {formatCurrency(limite.valorLimite)}
                              </Typography>
                              {renderProgressBar(limite.gastoReal, limite.valorLimite)}
                            </Box>
                          ) : (
                            <Box sx={{ mb: 1, minHeight: 104, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Limite (R$)"
                                type="number"
                                variant="outlined"
                                value={limite.valorLimite || ''}
                                onChange={(e) => handleLimiteGrupoChange(index, e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                              />
                              {renderProgressBar(limite.gastoReal, limite.valorLimite)}
                            </Box>
                          )}

                          {hasSubgroups && (
                            <Collapse in={isExpanded}>
                              <Divider sx={{ my: 2 }} />
                              <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">
                                DEFINIR LIMITES POR SUBGRUPO
                              </Typography>
                              <Box display="flex" flexDirection="column" gap={2}>
                                {limite.subgrupos.map((sub, sIndex) => (
                                  <Box key={sub.nome} sx={{ pl: 1, borderLeft: '2px solid #e2e8f0' }}>
                                    <Typography variant="body2" mb={0.5}>{sub.nome}</Typography>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      type="number"
                                      placeholder="0.00"
                                      value={sub.valorLimite || ''}
                                      onChange={(e) => handleLimiteSubgrupoChange(index, sIndex, e.target.value)}
                                      InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                    />
                                    {renderProgressBar(sub.gastoReal, sub.valorLimite)}
                                  </Box>
                                ))}
                              </Box>
                            </Collapse>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              <Divider sx={{ my: 4 }} />
              
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  sx={{ minWidth: 200 }}
                >
                  {saving ? 'Salvando...' : 'Salvar Metas'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default Orcamentos;
