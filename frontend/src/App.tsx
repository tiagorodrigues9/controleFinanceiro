import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MainLayout from './components/MainLayout';
import ContasPagar from './pages/ContasPagar';
import Fornecedores from './pages/Fornecedores';
import GastosDiarios from './pages/GastosDiarios';
import ContasBancarias from './pages/ContasBancarias';
import Transferencias from './pages/Transferencias';
import Categorias from './pages/Categorias';
import Extrato from './pages/Extrato';
import DashboardCompleto from './pages/DashboardCompleto';
import Perfil from './pages/Perfil';
import FormasPagamento from './pages/FormasPagamento';
import Cartoes from './pages/Cartoes';
import FaturasCartao from './pages/FaturasCartao';
import Notificacoes from './pages/Notificacoes';
import Orcamentos from './pages/Orcamentos';
import PWAInstallPrompt from './components/PWAInstallPrompt';
const theme = createTheme({
  palette: {
    primary: { main: '#6366f1', dark: '#4f46e5', light: '#818cf8' },
    secondary: { main: '#10b981', dark: '#059669', light: '#34d399' },
    background: { paper: '#ffffff', default: '#f8fafc' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, color: '#0f172a' },
    h6: { fontWeight: 600, color: '#1e293b' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        }
      }
    }
  }
});

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Detectar se veio de um redirecionamento 404
    const params = new URLSearchParams(location.search);
    const redirectedFrom = params.get('redirected');
    
    if (redirectedFrom && redirectedFrom !== location.pathname) {
      // Redirecionar para a rota correta usando o React Router
      navigate(redirectedFrom, { replace: true });
    }
  }, [location, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route 
        path="/*" 
        element={
          <PrivateRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<DashboardCompleto />} />
                <Route path="/dashboard" element={<DashboardCompleto />} />
                <Route path="/contas-pagar" element={<ContasPagar />} />
                <Route path="/fornecedores" element={<Fornecedores />} />
                <Route path="/gastos-diarios" element={<GastosDiarios />} />
                <Route path="/contas-bancarias" element={<ContasBancarias />} />
                <Route path="/transferencias" element={<Transferencias />} />
                <Route path="/categorias" element={<Categorias />} />
                <Route path="/extrato" element={<Extrato />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/formas-pagamento" element={<FormasPagamento />} />
                <Route path="/cartoes" element={<Cartoes />} />
                <Route path="/faturas-cartao" element={<FaturasCartao />} />
                <Route path="/notificacoes" element={<Notificacoes />} />
                <Route path="/orcamentos" element={<Orcamentos />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
      <PWAInstallPrompt />
    </ThemeProvider>
  );
}

export default App;

