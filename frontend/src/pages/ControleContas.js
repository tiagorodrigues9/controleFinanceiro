import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../utils/api';

const ControleContas = () => {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGrupo, setOpenGrupo] = useState(false);
  const [openSubgrupo, setOpenSubgrupo] = useState(null);
  const [formData, setFormData] = useState({ nome: '' });
  const [subgrupoData, setSubgrupoData] = useState({ nome: '' });
  const [error, setError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    try {
      const response = await api.get('/grupos');
      setGrupos(response.data);
    } catch (err) {
      setError('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGrupo = () => {
    setFormData({ nome: '' });
    setOpenGrupo(true);
  };

  const handleCloseGrupo = () => {
    setOpenGrupo(false);
  };

  const handleSubmitGrupo = async (e) => {
    e.preventDefault();
    try {
      await api.post('/grupos', formData);
      fetchGrupos();
      handleCloseGrupo();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar grupo');
    }
  };

  const handleOpenSubgrupo = (grupoId) => {
    setSubgrupoData({ nome: '' });
    setOpenSubgrupo(grupoId);
  };

  const handleCloseSubgrupo = () => {
    setOpenSubgrupo(null);
  };

  const handleSubmitSubgrupo = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/grupos/${openSubgrupo}/subgrupos`, { nome: subgrupoData.nome });
      fetchGrupos();
      handleCloseSubgrupo();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar subgrupo');
    }
  };

  const handleDeleteGrupo = (id, nome) => {
    setDeleteTarget({ type: 'grupo', id, nome });
    setOpenDeleteDialog(true);
  };

  const handleDeleteSubgrupo = (grupoId, subId, nome) => {
    setDeleteTarget({ type: 'subgrupo', grupoId, subId, nome });
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'grupo') {
        await api.delete(`/grupos/${deleteTarget.id}`);
      } else if (deleteTarget.type === 'subgrupo') {
        await api.delete(`/grupos/${deleteTarget.grupoId}/subgrupos/${deleteTarget.subId}`);
      }
      fetchGrupos();
      setOpenDeleteDialog(false);
      setDeleteTarget(null);
    } catch (err) {
      setError('Erro ao excluir');
      setOpenDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setOpenDeleteDialog(false);
    setDeleteTarget(null);
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
        <Typography variant="h4">Controle de Contas</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenGrupo}
        >
          Cadastrar Grupo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {grupos.map((grupo, index) => (
        <Accordion key={grupo._id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
              <Typography variant="h6">{index + 1} - {grupo.nome}</Typography>
              <Chip label={`${grupo.subgrupos.length} subgrupos`} size="small" sx={{ mr: 2 }} />
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGrupo(grupo._id, grupo.nome);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {grupo.subgrupos.map((subgrupo, subIndex) => (
                <ListItem key={subgrupo._id} secondaryAction={
                  <IconButton edge="end" size="small" color="error" onClick={() => handleDeleteSubgrupo(grupo._id, subgrupo._id, subgrupo.nome)}>
                    <DeleteIcon />
                  </IconButton>
                }>
                  <ListItemText primary={`${index + 1}.${subIndex + 1} - ${subgrupo.nome}`} />
                </ListItem>
              ))}
              <ListItem>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenSubgrupo(grupo._id)}
                >
                  Adicionar Subgrupo
                </Button>
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>
      ))}

      <Dialog open={openGrupo} onClose={handleCloseGrupo} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitGrupo}>
          <DialogTitle>Cadastrar Grupo</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome do Grupo"
              margin="normal"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseGrupo}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de confirmação para exclusão de grupo/subgrupo */}
      <Dialog open={openDeleteDialog} onClose={cancelDelete}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget?.type === 'grupo' && `Tem certeza que deseja excluir o grupo "${deleteTarget.nome}"?`}
            {deleteTarget?.type === 'subgrupo' && `Tem certeza que deseja excluir o subgrupo "${deleteTarget.nome}"?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Não</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">Sim, Excluir</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openSubgrupo !== null}
        onClose={handleCloseSubgrupo}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmitSubgrupo}>
          <DialogTitle>Adicionar Subgrupo</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nome do Subgrupo"
              margin="normal"
              required
              value={subgrupoData.nome}
              onChange={(e) => setSubgrupoData({ ...subgrupoData, nome: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSubgrupo}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ControleContas;

