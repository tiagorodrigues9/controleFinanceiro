// @ts-nocheck
import React, { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Badge,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HomeIcon from '@mui/icons-material/Home';
import PaymentIcon from '@mui/icons-material/Payment';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CategoryIcon from '@mui/icons-material/Category';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PieChartIcon from '@mui/icons-material/PieChart';

const drawerWidth = 260;

interface MenuLink {
  text: string;
  icon: React.ReactElement;
  path: string;
}

const menuItems: MenuLink[] = [
  { text: 'Dashboard', icon: <HomeIcon />, path: '/' },
  { text: 'Contas a Pagar', icon: <ReceiptIcon />, path: '/contas-pagar' },
  { text: 'Fornecedores', icon: <BusinessIcon />, path: '/fornecedores' },
  { text: 'Categorias', icon: <AccountBalanceIcon />, path: '/categorias' },
  { text: 'Gastos Diários', icon: <AttachMoneyIcon />, path: '/gastos-diarios' },
  { text: 'Orçamentos', icon: <PieChartIcon />, path: '/orcamentos' },
  { text: 'Contas Bancárias', icon: <AccountBalanceWalletIcon />, path: '/contas-bancarias' },
  { text: 'Transferências', icon: <SwapHorizIcon />, path: '/transferencias' },
  { text: 'Cartões', icon: <CreditCardIcon />, path: '/cartoes' },
  { text: 'Faturas de Cartão', icon: <ReceiptLongIcon />, path: '/faturas-cartao' },
  { text: 'Formas de Pagamento', icon: <PaymentIcon />, path: '/formas-pagamento' },
  { text: 'Extrato', icon: <CategoryIcon />, path: '/extrato' },
];

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [naoLidasCount, setNaoLidasCount] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Buscar quantidade de notificações não lidas ao carregar o layout
    const fetchNotificacoes = async () => {
      if (user) {
        try {
          const res = await api.get('/notificacoes/nao-lidas');
          setNaoLidasCount(res.data.length);
        } catch (error) {
          console.error('Erro ao buscar notificações:', error);
        }
      }
    };
    fetchNotificacoes();
  }, [location.pathname, user]); // Atualiza sempre que mudar de rota

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.5px' }}>
          Controle Financeiro
        </Typography>
      </Toolbar>
      
      <Box sx={{ px: 2, pb: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <List sx={{ flexGrow: 1, px: 0 }}>
          {menuItems.map((item) => {
            const isSelected = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.8 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    transition: 'all 0.2s',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      }
                    },
                    '&:hover': {
                      bgcolor: isSelected ? 'primary.dark' : 'rgba(99, 102, 241, 0.08)',
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 40,
                    color: isSelected ? 'inherit' : 'text.secondary' 
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ 
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.9rem'
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: 'error.main',
              '&:hover': {
                bgcolor: 'error.50',
              },
              '& .MuiListItemIcon-root': {
                color: 'error.main',
              }
            }}
          >
            <ListItemIcon>
              <ExitToAppIcon />
            </ListItemIcon>
            <ListItemText primary="Sair" primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        </ListItem>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Desenvolvido por Tiago Rodrigues
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notificações">
              <IconButton color="inherit" onClick={() => navigate('/notificacoes')} sx={{ mr: 1 }}>
                <Badge badgeContent={naoLidasCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Box 
              onClick={() => navigate('/perfil')}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                cursor: 'pointer',
                p: 0.5,
                pr: 1.5,
                borderRadius: 8,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <Avatar 
                src={user?.fotoPerfil || undefined}
                sx={{ 
                  width: 36, 
                  height: 36, 
                  bgcolor: 'primary.main',
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                {!user?.fotoPerfil && user?.nome ? user.nome.charAt(0).toUpperCase() : ''}
              </Avatar>
              <Typography variant="subtitle2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>
                {user?.nome || 'Usuário'}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
              boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100vw',
          overflowX: 'hidden'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;

