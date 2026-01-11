import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { ejercicioService } from '../services/ejercicioService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Ejercicio, HistorialEjercicio } from '../types';
import { calcularRM } from '../utils/formatters';
import { getMuscleColorWithDefault } from '../constants/muscleColors';

export const EjerciciosPage = () => {
  const { usuario } = useAuthStore();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [selectedEjercicio, setSelectedEjercicio] = useState<HistorialEjercicio | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Evitar ejecuciones duplicadas (especialmente en StrictMode)
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    loadEjercicios();
  }, []);

  const loadEjercicios = async () => {
    try {
      setLoading(true);
      const data = await ejercicioService.getAll();
      setEjercicios(data);
    } catch (error) {
      console.error('Error al cargar ejercicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (ejercicioId: string) => {
    if (!usuario) return;
    try {
      const historial = await ejercicioService.getHistorial(ejercicioId, usuario.id);
      setSelectedEjercicio(historial);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-dark-text-muted">Cargando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-dark-bg p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Ejercicios
            </h1>
          </div>
          <div className="mb-6">
            <Button onClick={() => navigate('/ejercicios/crear')} size="lg" fullWidth>
              Crear Nuevo Ejercicio
            </Button>
          </div>

          {selectedEjercicio ? (
            <div>
              <Button
                variant="outline"
                onClick={() => setSelectedEjercicio(null)}
                className="mb-4"
              >
                ← Volver
              </Button>
              <Card>
                <h2 className="text-2xl font-bold mb-4 text-dark-text">{selectedEjercicio.ejercicioNombre}</h2>
                
                {selectedEjercicio.record && (
                  <div className="mb-6 p-4 bg-dark-accent/20 rounded-lg border border-dark-accent/30">
                    <h3 className="font-semibold text-dark-accent mb-2">Record Personal</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-dark-text-muted">Máximo Peso</p>
                        <p className="text-2xl font-bold text-dark-text">
                          {selectedEjercicio.record.maxPeso} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-dark-text-muted">Máximas Reps</p>
                        <p className="text-2xl font-bold text-dark-text">
                          {selectedEjercicio.record.repsMax}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-xl font-bold mb-4 text-dark-text">Historial</h3>
                <div className="space-y-4">
                  {selectedEjercicio.ejecuciones.map((ejecucion, idx) => (
                    <div key={idx} className="border-b border-dark-border pb-4">
                      <p className="text-sm text-dark-text-muted mb-2">
                        {new Date(ejecucion.fecha).toLocaleDateString('es-ES')}
                      </p>
                      <div className="space-y-2">
                        {ejecucion.seriesEjecutadas.map((serie) => (
                          <div key={serie.numeroSerie} className="flex gap-4 text-sm text-dark-text">
                            <span className="font-semibold">Serie {serie.numeroSerie}:</span>
                            {serie.pesoReal && <span>{serie.pesoReal} kg</span>}
                            {serie.repeticiones && <span>{serie.repeticiones} reps</span>}
                            {serie.pesoReal && serie.repeticiones && (
                              <span className="text-dark-accent">
                                RM: {calcularRM(serie.pesoReal, serie.repeticiones).toFixed(1)} kg
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {ejercicios.length === 0 ? (
                <Card>
                  <p className="text-center text-dark-text-muted py-8">
                    No hay ejercicios disponibles. Crea uno para comenzar.
                  </p>
                </Card>
              ) : (
                ejercicios.map((ejercicio) => {
                  const color = getMuscleColorWithDefault(ejercicio.musculoPrincipal)
                  return (
                    <Card 
                      key={ejercicio.id} 
                      className="hover:border-dark-accent transition-colors"
                      style={{
                        borderLeftColor: color !== 'transparent' ? color : undefined,
                        borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-dark-text">{ejercicio.nombre}</h3>
                          <p className="text-sm text-dark-text-muted">{ejercicio.musculoPrincipal}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(ejercicio.id)}
                        >
                          Ver Historial
                        </Button>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
    )
}
