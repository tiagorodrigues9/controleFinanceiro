import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import ControleContas from './pages/ControleContas';
import Extrato from './pages/Extrato';
import DashboardCompleto from './pages/DashboardCompleto';
import Perfil from './pages/Perfil';
import FormasPagamento from './pages/FormasPagamento';
import Cartoes from './pages/Cartoes';
import Notificacoes from './pages/Notificacoes';
import PWAInstallPrompt from './components/PWAInstallPrompt';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
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
                      <Route path="/controle-contas" element={<ControleContas />} />
                      <Route path="/extrato" element={<Extrato />} />
                      <Route path="/perfil" element={<Perfil />} />
                      <Route path="/formas-pagamento" element={<FormasPagamento />} />
                      <Route path="/cartoes" element={<Cartoes />} />
                      <Route path="/notificacoes" element={<Notificacoes />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </MainLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
      <PWAInstallPrompt />
    </ThemeProvider>
  );
};

export default App;

