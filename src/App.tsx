import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { RutinasPage } from './pages/RutinasPage';
import { CrearRutinaPage } from './pages/CrearRutinaPage';
import { EditarRutinaPage } from './pages/EditarRutinaPage';
import { EjerciciosPage } from './pages/EjerciciosPage';
import { CrearEjercicioPage } from './pages/CrearEjercicioPage';
import { MusculosPage } from './pages/MusculosPage';
import { MetodoBilboPage } from './pages/MetodoBilboPage';
import { ConfigurarBilboPage } from './pages/ConfigurarBilboPage';
import './App.css';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter basename="/Gym">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rutinas"
          element={
            <ProtectedRoute>
              <RutinasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rutinas/crear"
          element={
            <ProtectedRoute>
              <CrearRutinaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rutinas/:rutinaId/editar"
          element={
            <ProtectedRoute>
              <EditarRutinaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ejercicios"
          element={
            <ProtectedRoute>
              <EjerciciosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ejercicios/crear"
          element={
            <ProtectedRoute>
              <CrearEjercicioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/musculos"
          element={
            <ProtectedRoute>
              <MusculosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bilbo"
          element={
            <ProtectedRoute>
              <MetodoBilboPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bilbo/configurar"
          element={
            <ProtectedRoute>
              <ConfigurarBilboPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
