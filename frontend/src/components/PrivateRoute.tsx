import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user } = useAuth(); // Removido loading

  // Redireciona para login se não estiver autenticado
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

export default PrivateRoute;

