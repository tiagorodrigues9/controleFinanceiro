import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
  Paper,
  InputAdornment,
  ThemeProvider,
  createTheme,
  Collapse,
  Divider,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon,
  SubdirectoryArrowRight as SubIcon,
  Category as CategoryIcon,
  Home as HomeIcon,
  DirectionsCar as CarIcon,
  Restaurant as RestaurantIcon,
  ShoppingCart as ShoppingCartIcon,
  School as SchoolIcon,
  LocalHospital as HealthIcon,
  SportsEsports as LeisureIcon,
  Pets as PetsIcon,
  Checkroom as ClothesIcon,
  Build as BuildIcon,
  FlightTakeoff as TravelIcon,
  Savings as SavingsIcon,
  ChildCare as ChildIcon,
  Devices as DevicesIcon,
  LocalGroceryStore as GroceryIcon,
  FitnessCenter as FitnessIcon,
  Bolt as BoltIcon,
  Water as WaterIcon,
  Wifi as WifiIcon,
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  Work as WorkIcon,
  MoreHoriz as MoreHorizIcon,
  AttachMoney as MoneyIcon,
  CardGiftcard as GiftIcon,
  Spa as SpaIcon,
  Fastfood as FastfoodIcon,
  DirectionsBus as BusIcon,
  LocalCafe as CafeIcon,
  Computer as ComputerIcon,
  MenuBook as BookIcon,
  Movie as MovieIcon,
  MusicNote as MusicIcon,
  Language as GlobeIcon,
  Security as SecurityIcon,
  LocalBar as BarIcon,
  DirectionsBike as BikeIcon,
  PhoneIphone as PhoneIcon,
  LocalGasStation as GasStationIcon,
  FormatPaint as PaintIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../utils/api';

// === MAPA DE ÍCONES DISPONÍVEIS ===
const ICON_MAP: Record<string, React.ReactElement> = {
  Folder: <FolderIcon />,
  Home: <HomeIcon />,
  Car: <CarIcon />,
  Restaurant: <RestaurantIcon />,
  ShoppingCart: <ShoppingCartIcon />,
  School: <SchoolIcon />,
  Health: <HealthIcon />,
  Leisure: <LeisureIcon />,
  Pets: <PetsIcon />,
  Clothes: <ClothesIcon />,
  Build: <BuildIcon />,
  Travel: <TravelIcon />,
  Savings: <SavingsIcon />,
  Child: <ChildIcon />,
  Devices: <DevicesIcon />,
  Grocery: <GroceryIcon />,
  Fitness: <FitnessIcon />,
  Bolt: <BoltIcon />,
  Water: <WaterIcon />,
  Wifi: <WifiIcon />,
  CreditCard: <CreditCardIcon />,
  Receipt: <ReceiptIcon />,
  Work: <WorkIcon />,
  Money: <MoneyIcon />,
  Gift: <GiftIcon />,
  Spa: <SpaIcon />,
  Fastfood: <FastfoodIcon />,
  Bus: <BusIcon />,
  Cafe: <CafeIcon />,
  Computer: <ComputerIcon />,
  Book: <BookIcon />,
  Movie: <MovieIcon />,
  Music: <MusicIcon />,
  Globe: <GlobeIcon />,
  Security: <SecurityIcon />,
  Bar: <BarIcon />,
  Bike: <BikeIcon />,
  Phone: <PhoneIcon />,
  GasStation: <GasStationIcon />,
  Paint: <PaintIcon />,
  Person: <PersonIcon />,
  More: <MoreHorizIcon />,
};

const ICON_LABELS: Record<string, string> = {
  Folder: 'Pasta',
  Home: 'Casa',
  Car: 'Transporte',
  Restaurant: 'Restaurante',
  ShoppingCart: 'Compras',
  School: 'Educação',
  Health: 'Saúde',
  Leisure: 'Lazer',
  Pets: 'Pets',
  Clothes: 'Roupas',
  Build: 'Manutenção',
  Travel: 'Viagem',
  Savings: 'Poupança',
  Child: 'Filhos',
  Devices: 'Tecnologia',
  Grocery: 'Mercado',
  Fitness: 'Academia',
  Bolt: 'Energia',
  Water: 'Água',
  Wifi: 'Internet',
  CreditCard: 'Cartão',
  Receipt: 'Contas',
  Work: 'Trabalho',
  Money: 'Dinheiro',
  Gift: 'Presentes',
  Spa: 'Bem-estar',
  Fastfood: 'Lanches',
  Bus: 'Ônibus',
  Cafe: 'Café',
  Computer: 'Informática',
  Book: 'Estudos',
  Movie: 'Cinema',
  Music: 'Música',
  Globe: 'Serviços',
  Security: 'Segurança',
  Bar: 'Bar',
  Bike: 'Ciclismo',
  Phone: 'Celular',
  GasStation: 'Combustível',
  Paint: 'Reforma',
  Person: 'Pessoal',
  More: 'Outros',
};

// === PALETA DE CORES ===
const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#64748b', // Slate
];

// Helper para renderizar o ícone correto a partir de uma string
const renderIcon = (iconName: string, color?: string, size?: number) => {
  const iconElement = ICON_MAP[iconName] || ICON_MAP['Folder'];
  return React.cloneElement(iconElement, {
    sx: { color: color || '#6366f1', fontSize: size || 24 }
  });
};

// Tema premium padronizado
const categoriasTheme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
      dark: '#4f46e5',
      light: '#818cf8',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      paper: '#ffffff',
      default: '#f8fafc',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#0f172a',
    },
    h6: {
      fontWeight: 600,
      color: '#1e293b',
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          border: '1px solid #f1f5f9',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            transition: 'all 0.2s',
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
            }
          }
        }
      }
    }
  }
});

interface Subgrupo {
  _id: string;
  nome: string;
  cor?: string;
  icone?: string;
}

interface Grupo {
  _id: string;
  nome: string;
  cor?: string;
  icone?: string;
  subgrupos: Subgrupo[];
}

const Categorias = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [openGrupoModal, setOpenGrupoModal] = useState(false);
  const [grupoData, setGrupoData] = useState({ id: '', nome: '', cor: '#6366f1', icone: 'Folder' });
  
  const [openSubgrupoModal, setOpenSubgrupoModal] = useState(false);
  const [subgrupoData, setSubgrupoData] = useState({ grupoId: '', subId: '', nome: '', cor: '#6366f1', icone: 'Folder' });

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/grupos');
      setGrupos(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar categorias.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredGrupos = useMemo(() => {
    if (!searchTerm) return grupos;
    const lower = searchTerm.toLowerCase();
    
    return grupos.filter(grupo => {
      const matchGrupo = grupo.nome.toLowerCase().includes(lower);
      const matchSub = grupo.subgrupos.some(sub => sub.nome.toLowerCase().includes(lower));
      return matchGrupo || matchSub;
    }).map(grupo => {
      if (!grupo.nome.toLowerCase().includes(lower)) {
        return {
          ...grupo,
          subgrupos: grupo.subgrupos.filter(sub => sub.nome.toLowerCase().includes(lower))
        };
      }
      return grupo;
    });
  }, [grupos, searchTerm]);

  // === AÇÕES DE GRUPO ===
  const handleOpenGrupo = (grupo?: Grupo) => {
    if (grupo) {
      setGrupoData({ id: grupo._id, nome: grupo.nome, cor: grupo.cor || '#6366f1', icone: grupo.icone || 'Folder' });
    } else {
      setGrupoData({ id: '', nome: '', cor: '#6366f1', icone: 'Folder' });
    }
    setMessage({ type: '', text: '' });
    setOpenGrupoModal(true);
  };

  const handleSubmitGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      if (grupoData.id) {
        await api.put(`/grupos/${grupoData.id}/editar`, { nome: grupoData.nome, cor: grupoData.cor, icone: grupoData.icone });
        setMessage({ type: 'success', text: 'Categoria atualizada com sucesso!' });
      } else {
        await api.post('/grupos', { nome: grupoData.nome, cor: grupoData.cor, icone: grupoData.icone });
        setMessage({ type: 'success', text: 'Categoria criada com sucesso!' });
      }
      fetchGrupos();
      setOpenGrupoModal(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao processar categoria.' });
    }
  };

  // === AÇÕES DE SUBGRUPO ===
  const handleOpenSubgrupo = (grupoId: string, sub?: Subgrupo, grupoCor?: string) => {
    if (sub) {
      setSubgrupoData({ grupoId, subId: sub._id, nome: sub.nome, cor: sub.cor || grupoCor || '#6366f1', icone: sub.icone || 'Folder' });
    } else {
      setSubgrupoData({ grupoId, subId: '', nome: '', cor: grupoCor || '#6366f1', icone: 'Folder' });
    }
    setMessage({ type: '', text: '' });
    setOpenSubgrupoModal(true);
  };

  const handleSubmitSubgrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      if (subgrupoData.subId) {
        await api.put(`/grupos/${subgrupoData.grupoId}/subgrupos/${subgrupoData.subId}/renomear`, { nome: subgrupoData.nome, cor: subgrupoData.cor, icone: subgrupoData.icone });
        setMessage({ type: 'success', text: 'Subcategoria atualizada com sucesso!' });
      } else {
        await api.post(`/grupos/${subgrupoData.grupoId}/subgrupos`, { nome: subgrupoData.nome, cor: subgrupoData.cor, icone: subgrupoData.icone });
        setMessage({ type: 'success', text: 'Subcategoria criada com sucesso!' });
      }
      fetchGrupos();
      setExpandedGroups(prev => ({ ...prev, [subgrupoData.grupoId]: true }));
      setOpenSubgrupoModal(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao processar subcategoria.' });
    }
  };

  // === EXCLUSÃO ===
  const handleDeleteClick = (target: any) => {
    setDeleteTarget(target);
    setOpenDeleteDialog(true);
    setMessage({ type: '', text: '' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'grupo') {
        await api.delete(`/grupos/${deleteTarget.id}`);
        setMessage({ type: 'success', text: 'Categoria excluída com sucesso!' });
      } else if (deleteTarget.type === 'subgrupo') {
        await api.delete(`/grupos/${deleteTarget.grupoId}/subgrupos/${deleteTarget.subId}`);
        setMessage({ type: 'success', text: 'Subcategoria excluída com sucesso!' });
      }
      fetchGrupos();
      setOpenDeleteDialog(false);
      setDeleteTarget(null);
    } catch (err: any) {
      setOpenDeleteDialog(false);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao excluir. Verifique se existem itens vinculados.' });
      setDeleteTarget(null);
    }
  };

  return (
    <ThemeProvider theme={categoriasTheme}>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 4, gap: 2 }}>
          <Typography variant="h4" sx={{ mb: { xs: 1, sm: 0 }, display: 'flex', alignItems: 'center' }}>
            <CategoryIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} /> Categorias
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenGrupo()}
            size="large"
            sx={{ flexShrink: 0 }}
          >
            Nova Categoria
          </Button>
        </Box>

        {message.text && !openGrupoModal && !openSubgrupoModal && (
          <Alert severity={message.type as 'success' | 'error'} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Barra de Pesquisa */}
        <Paper sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center', borderRadius: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar categoria ou subcategoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="small"
          />
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : filteredGrupos.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 3 }}>
            <CategoryIcon sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Nenhuma categoria encontrada</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredGrupos.map((grupo) => {
              const grupoCor = grupo.cor || '#6366f1';
              const grupoIcone = grupo.icone || 'Folder';

              return (
                <Paper key={grupo._id} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#f8fafc' },
                      borderLeft: `4px solid ${grupoCor}`,
                      transition: 'background-color 0.15s ease'
                    }}
                    onClick={() => toggleGroup(grupo._id)}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      {renderIcon(grupoIcone, grupoCor, 28)}
                      <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>{grupo.nome}</Typography>
                      <Chip 
                        label={`${grupo.subgrupos.length} subcategorias`} 
                        size="small" 
                        sx={{ backgroundColor: `${grupoCor}18`, color: grupoCor, fontWeight: 600, border: `1px solid ${grupoCor}30` }} 
                      />
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Tooltip title="Editar Categoria">
                        <IconButton 
                          size="small" 
                          onClick={(e) => { e.stopPropagation(); handleOpenGrupo(grupo); }}
                          sx={{ color: '#64748b', '&:hover': { color: grupoCor } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir Categoria">
                        <IconButton 
                          size="small" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick({ type: 'grupo', id: grupo._id, nome: grupo.nome }); }}
                          sx={{ color: '#64748b', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {expandedGroups[grupo._id] || (searchTerm && grupo.subgrupos.length > 0) ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
                    </Box>
                  </Box>

                  <Collapse in={expandedGroups[grupo._id] || (searchTerm !== '' && grupo.subgrupos.length > 0)} timeout="auto" unmountOnExit>
                    <Divider />
                    <List component="div" disablePadding sx={{ backgroundColor: '#fcfcfd' }}>
                      {grupo.subgrupos.map((sub) => (
                        <ListItem key={sub._id} sx={{ pl: 6, pr: 2, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                          <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                            {renderIcon(sub.icone || 'Folder', sub.cor || grupoCor, 20)}
                          </Box>
                          <ListItemText primary={<Typography variant="body1" color="text.secondary" fontWeight={500}>{sub.nome}</Typography>} />
                          
                          <Box>
                            <Tooltip title="Editar Subcategoria">
                              <IconButton size="small" onClick={() => handleOpenSubgrupo(grupo._id, sub)}>
                                <EditIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir Subcategoria">
                              <IconButton size="small" onClick={() => handleDeleteClick({ type: 'subgrupo', grupoId: grupo._id, subId: sub._id, nome: sub.nome })}>
                                <DeleteIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItem>
                      ))}
                      
                      <ListItem sx={{ pl: 6, pr: 2, py: 1.5 }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleOpenSubgrupo(grupo._id)}
                          sx={{ color: '#64748b' }}
                        >
                          Nova Subcategoria
                        </Button>
                      </ListItem>
                    </List>
                  </Collapse>
                </Paper>
              );
            })}
          </Box>
        )}

        {/* ===== Modal de Criação/Edição de Grupo ===== */}
        <Dialog open={openGrupoModal} onClose={() => setOpenGrupoModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <form onSubmit={handleSubmitGrupo}>
            <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #f1f5f9', mb: 2 }}>
              {grupoData.id ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            {message.text && openGrupoModal && (
              <Box px={3} mb={2}>
                <Alert severity="error">{message.text}</Alert>
              </Box>
            )}
            <DialogContent sx={{ pt: 2, pb: 2 }}>
              <TextField
                fullWidth
                margin="dense"
                label="Nome da Categoria"
                required
                value={grupoData.nome}
                onChange={(e) => setGrupoData({ ...grupoData, nome: e.target.value })}
                placeholder="Ex: Alimentação, Transporte"
              />

              {/* Seletor de Cores */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                Cor da Categoria
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Box
                  component="input"
                  type="color"
                  value={grupoData.cor}
                  onChange={(e: any) => setGrupoData({ ...grupoData, cor: e.target.value })}
                  sx={{
                    width: 38,
                    height: 38,
                    p: 0,
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    outline: 'none',
                    overflow: 'hidden',
                    flexShrink: 0,
                    '&::-webkit-color-swatch-wrapper': { p: 0 },
                    '&::-webkit-color-swatch': { border: '2px solid #e2e8f0', borderRadius: '50%' },
                  }}
                  title="Cor Personalizada"
                />
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#e2e8f0' }} />
                {COLOR_PALETTE.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setGrupoData({ ...grupoData, cor: color })}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: grupoData.cor === color ? '3px solid #1e293b' : '3px solid transparent',
                      boxShadow: grupoData.cor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.15)',
                        boxShadow: `0 2px 8px ${color}66`,
                      }
                    }}
                  />
                ))}
              </Box>

              {/* Seletor de Ícones */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                Ícone da Categoria
              </Typography>
              <Grid container spacing={1}>
                {Object.keys(ICON_MAP).map((iconKey) => (
                  <Grid item key={iconKey}>
                    <Tooltip title={ICON_LABELS[iconKey] || iconKey} arrow>
                      <Box
                        onClick={() => setGrupoData({ ...grupoData, icone: iconKey })}
                        sx={{
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 2,
                          cursor: 'pointer',
                          backgroundColor: grupoData.icone === iconKey ? `${grupoData.cor}15` : '#f8fafc',
                          border: grupoData.icone === iconKey ? `2px solid ${grupoData.cor}` : '2px solid transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: `${grupoData.cor}10`,
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        {renderIcon(iconKey, grupoData.icone === iconKey ? grupoData.cor : '#94a3b8', 22)}
                      </Box>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>

              {/* Preview */}
              <Paper sx={{ mt: 3, p: 2, borderRadius: 2, borderLeft: `4px solid ${grupoData.cor}`, backgroundColor: '#f8fafc' }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  {renderIcon(grupoData.icone, grupoData.cor, 24)}
                  <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                    {grupoData.nome || 'Nome da Categoria'}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Prévia de como ficará na lista
                </Typography>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={() => setOpenGrupoModal(false)} color="inherit">Cancelar</Button>
              <Button type="submit" variant="contained" sx={{ backgroundColor: grupoData.cor, '&:hover': { backgroundColor: grupoData.cor, filter: 'brightness(0.9)' } }}>Salvar</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Modal de Subgrupo */}
        <Dialog open={openSubgrupoModal} onClose={() => setOpenSubgrupoModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <form onSubmit={handleSubmitSubgrupo}>
            <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #f1f5f9', mb: 2 }}>
              {subgrupoData.subId ? 'Renomear Subcategoria' : 'Nova Subcategoria'}
            </DialogTitle>
            {message.text && openSubgrupoModal && (
              <Box px={3} mb={2}>
                <Alert severity="error">{message.text}</Alert>
              </Box>
            )}
            <DialogContent sx={{ pt: 2, pb: 2 }}>
              <TextField
                fullWidth
                margin="dense"
                label="Nome da Subcategoria"
                required
                value={subgrupoData.nome}
                onChange={(e) => setSubgrupoData({ ...subgrupoData, nome: e.target.value })}
                placeholder="Ex: Supermercado, Padaria"
              />

              {/* Seletor de Cores */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                Cor da Subcategoria
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Box
                  component="input"
                  type="color"
                  value={subgrupoData.cor}
                  onChange={(e: any) => setSubgrupoData({ ...subgrupoData, cor: e.target.value })}
                  sx={{
                    width: 38, height: 38, p: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', outline: 'none', overflow: 'hidden', flexShrink: 0,
                    '&::-webkit-color-swatch-wrapper': { p: 0 }, '&::-webkit-color-swatch': { border: '2px solid #e2e8f0', borderRadius: '50%' },
                  }}
                  title="Cor Personalizada"
                />
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#e2e8f0' }} />
                {COLOR_PALETTE.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setSubgrupoData({ ...subgrupoData, cor: color })}
                    sx={{
                      width: 36, height: 36, borderRadius: '50%', backgroundColor: color, cursor: 'pointer',
                      border: subgrupoData.cor === color ? '3px solid #1e293b' : '3px solid transparent',
                      boxShadow: subgrupoData.cor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                      transition: 'all 0.2s ease', '&:hover': { transform: 'scale(1.15)', boxShadow: `0 2px 8px ${color}66` }
                    }}
                  />
                ))}
              </Box>

              {/* Seletor de Ícones */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                Ícone da Subcategoria
              </Typography>
              <Grid container spacing={1} sx={{ maxHeight: 200, overflowY: 'auto', p: 1, border: '1px solid #f1f5f9', borderRadius: 2 }}>
                {Object.keys(ICON_MAP).map((iconKey) => (
                  <Grid item key={iconKey}>
                    <Tooltip title={ICON_LABELS[iconKey] || iconKey} arrow>
                      <Box
                        onClick={() => setSubgrupoData({ ...subgrupoData, icone: iconKey })}
                        sx={{
                          width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, cursor: 'pointer',
                          backgroundColor: subgrupoData.icone === iconKey ? `${subgrupoData.cor}15` : '#f8fafc',
                          border: subgrupoData.icone === iconKey ? `2px solid ${subgrupoData.cor}` : '2px solid transparent',
                          transition: 'all 0.2s ease', '&:hover': { backgroundColor: `${subgrupoData.cor}10`, transform: 'scale(1.1)' }
                        }}
                      >
                        {renderIcon(iconKey, subgrupoData.icone === iconKey ? subgrupoData.cor : '#94a3b8', 22)}
                      </Box>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>

              {/* Preview */}
              <Paper sx={{ mt: 3, p: 2, borderRadius: 2, borderLeft: `4px solid ${subgrupoData.cor}`, backgroundColor: '#f8fafc' }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  {renderIcon(subgrupoData.icone, subgrupoData.cor, 24)}
                  <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                    {subgrupoData.nome || 'Nome da Subcategoria'}
                  </Typography>
                </Box>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button onClick={() => setOpenSubgrupoModal(false)} color="inherit">Cancelar</Button>
              <Button type="submit" variant="contained" color="primary">Salvar</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog de Exclusão */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir a {deleteTarget?.type === 'grupo' ? 'categoria' : 'subcategoria'} <strong>{deleteTarget?.nome}</strong>?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Não será possível excluir se houver contas vinculadas.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">Cancelar</Button>
            <Button onClick={confirmDelete} variant="contained" color="error">Excluir</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
};

export default Categorias;
