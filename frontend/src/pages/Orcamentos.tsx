// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import api from '../utils/api';

const Orcamentos = () => {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth() + 1);
  const [ano, setAno] = useState(today.getFullYear());
  const [grupos, setGrupos] = useState([]);
  const [orcamento, setOrcamento] = useState({ valorLimiteGeral: 0, limitesPorGrupo: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [mes, ano]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resGrupos, resOrcamento] = await Promise.all([
        api.get('/grupos'),
        api.get(`/orcamentos/${ano}/${mes}`)
      ]);
      setGrupos(resGrupos.data);
      
      const orcData = resOrcamento.data;
      if (!orcData.limitesPorGrupo) {
        orcData.limitesPorGrupo = [];
      }
      
      // Mapear os grupos para garantir que todos tenham um limite (mesmo que 0)
      const limites = resGrupos.data.map(g => {
        const existente = orcData.limitesPorGrupo.find(l => l.grupo?._id === g._id || l.grupo === g._id);
        return {
          grupo: g._id,
          nome: g.nome,
          valorLimite: existente ? existente.valorLimite : 0
        };
      });
      
      setOrcamento({
        valorLimiteGeral: orcData.valorLimiteGeral || 0,
        limitesPorGrupo: limites
      });
    } catch (err) {
      setError('Erro ao carregar dados do orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        valorLimiteGeral: parseFloat(orcamento.valorLimiteGeral),
        limitesPorGrupo: orcamento.limitesPorGrupo.map(l => ({
          grupo: l.grupo,
          valorLimite: parseFloat(l.valorLimite) || 0
        }))
      };
      
      await api.post(`/orcamentos/${ano}/${mes}`, payload);
      setSuccess('Orçamento salvo com sucesso!');
    } catch (err) {
      setError('Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const handleLimiteGrupoChange = (index, value) => {
    const novosLimites = [...orcamento.limitesPorGrupo];
    novosLimites[index].valorLimite = value;
    setOrcamento({ ...orcamento, limitesPorGrupo: novosLimites });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Orçamento Mensal</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Mês</InputLabel>
              <Select value={mes} label="Mês" onChange={(e) => setMes(parseInt(e.target.value))}>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i+1} value={i+1}>{i+1}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Ano</InputLabel>
              <Select value={ano} label="Ano" onChange={(e) => setAno(parseInt(e.target.value))}>
                {Array.from({length: 5}).map((_, idx) => {
                  const y = today.getFullYear() - 1 + idx;
                  return <MenuItem key={y} value={y}>{y}</MenuItem>;
                })}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Limite de Gastos Geral
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={2}>
          Defina o limite total de gastos que você pretende ter neste mês.
        </Typography>
        <TextField
          fullWidth
          label="Valor Limite Total"
          type="number"
          variant="outlined"
          value={orcamento.valorLimiteGeral}
          onChange={(e) => setOrcamento({ ...orcamento, valorLimiteGeral: e.target.value })}
          sx={{ maxWidth: 300 }}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Limites por Categoria (Grupos)
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={3}>
          Você pode estipular limites de gastos para cada categoria separadamente.
        </Typography>
        
        <Grid container spacing={3}>
          {orcamento.limitesPorGrupo.map((limite, index) => (
            <Grid item xs={12} md={4} key={limite.grupo}>
              <TextField
                fullWidth
                label={`Limite - ${limite.nome}`}
                type="number"
                variant="outlined"
                value={limite.valorLimite}
                onChange={(e) => handleLimiteGrupoChange(index, e.target.value)}
              />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />
        
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Orçamento'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Orcamentos;
