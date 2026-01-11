import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Esperar a que se complete la inicialización antes de verificar autenticación
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <p className="text-dark-text-muted">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

