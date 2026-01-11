import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuthStore } from '../store/authStore';
import { useEntrenamientoStore } from '../store/entrenamientoStore';
import { rutinaService } from '../services/rutinaService';
import { ejercicioService } from '../services/ejercicioService';
import { entrenamientoService } from '../services/entrenamientoService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DaySelector } from '../components/features/DaySelector';
import { EjercicioCard } from '../components/features/EjercicioCard';
import { formatDiaSemana, getDiaSemanaFromDate, getDateForDayOfWeek } from '../utils/formatters';
import type { Rutina, Ejercicio, EjercicioPlanificado, EjercicioEjecutado } from '../types';

export const HomePage = () => {
  const { usuario } = useAuthStore();
  const { entrenamiento, loadTodayTraining, loadTrainingByDate, clearEntrenamiento } = useEntrenamientoStore();
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [ejerciciosNuevos, setEjerciciosNuevos] = useState<EjercicioPlanificado[]>([]);
  const [selectedDay, setSelectedDay] = useState(getDiaSemanaFromDate(new Date()));
  const [weekOffset, setWeekOffset] = useState(0); // 0 = esta semana, 1 = semana siguiente
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const loadedUsuarioIdRef = useRef<string | null>(null);
  const ejercicioNuevoCounterRef = useRef(0);

  const loadEjercicios = useCallback(async () => {
    try {
      const data = await ejercicioService.getAll();
      setEjercicios(data);
    } catch (error) {
      console.error('Error al cargar ejercicios:', error);
    }
  }, []);

  const loadRutina = useCallback(async () => {
    if (!usuario) return;
    try {
      const rutinaActiva = await rutinaService.getActive(usuario.id);
      setRutina(rutinaActiva);
    } catch (error) {
      console.error('Error al cargar rutina:', error);
      setRutina(null);
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) {
      navigate('/login');
      return;
    }

    // Evitar ejecuciones duplicadas para el mismo usuario
    if (loadedUsuarioIdRef.current === usuario.id) return;
    loadedUsuarioIdRef.current = usuario.id;

    const init = async () => {
      setLoading(true);
      await loadEjercicios();
      await loadRutina();
      await loadTodayTraining(usuario.id);
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, navigate, loadRutina]);

  // Cargar entrenamiento cuando cambie el día seleccionado o la semana
  useEffect(() => {
    if (usuario && selectedDay !== null) {
      const fecha = getDateForDayOfWeek(selectedDay, weekOffset);
      loadTrainingByDate(usuario.id, fecha);
      // Limpiar ejercicios nuevos al cambiar de día/semana
      setEjerciciosNuevos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, selectedDay, weekOffset]);

  const diaDeRutina = rutina?.diasDeRutina?.find((d) => d.diaSemana === selectedDay);
  const ejerciciosDelDiaPlanificados = diaDeRutina?.ejerciciosPlanificados || [];
  const fechaSeleccionada = getDateForDayOfWeek(selectedDay, weekOffset);
  
  // Crear un EjercicioPlanificado temporal desde un EjercicioEjecutado
  const crearEjercicioPlanificadoTemporal = (ejecutado: EjercicioEjecutado, orden: number): EjercicioPlanificado => {
    const ejercicioInfo = ejercicios.find(e => e.id === ejecutado.ejercicioId);
    return {
      id: `temp-${ejecutado.ejercicioId}-${ejecutado.id || Date.now()}`,
      ejercicioId: ejecutado.ejercicioId,
      ejercicioNombre: ejecutado.ejercicioNombre || ejercicioInfo?.nombre || 'Ejercicio',
      orden,
      seriesPlanificadas: ejecutado.seriesEjecutadas.length > 0
        ? ejecutado.seriesEjecutadas.map((serie, idx) => ({
            id: `temp-serie-${idx}`,
            numeroSerie: serie.numeroSerie,
            pesoPlanificado: serie.pesoReal,
          }))
        : [{ id: 'temp-1', numeroSerie: 1, pesoPlanificado: undefined }],
    };
  };

  // Identificar ejercicios ejecutados que NO están en la rutina
  const ejerciciosIdsEnRutina = new Set(ejerciciosDelDiaPlanificados.map(e => e.ejercicioId));
  const ejerciciosAdicionales = entrenamiento?.ejerciciosEjecutados
    .filter(ee => !ejerciciosIdsEnRutina.has(ee.ejercicioId))
    .map((ee, idx) => crearEjercicioPlanificadoTemporal(ee, ejerciciosDelDiaPlanificados.length + idx + 1)) || [];

  // Combinar ejercicios de la rutina, ejercicios adicionales guardados, y ejercicios nuevos temporales
  const todosLosEjercicios = [...ejerciciosDelDiaPlanificados, ...ejerciciosAdicionales, ...ejerciciosNuevos];
  
  // Verificar si hay algún entrenamiento para el día seleccionado (basado en si tiene ejercicios ejecutados)
  const tieneDatos = entrenamiento && entrenamiento.ejerciciosEjecutados.length > 0;

  const handleAgregarEjercicio = () => {
    if (ejercicios.length === 0) return;
    
    ejercicioNuevoCounterRef.current += 1;
    const nuevoEjercicio: EjercicioPlanificado = {
      id: `nuevo-${Date.now()}-${ejercicioNuevoCounterRef.current}`,
      ejercicioId: ejercicios[0].id,
      ejercicioNombre: ejercicios[0].nombre,
      orden: todosLosEjercicios.length + 1,
      seriesPlanificadas: [{ id: 'temp-1', numeroSerie: 1, pesoPlanificado: undefined }],
    };
    
    setEjerciciosNuevos((prev) => [...prev, nuevoEjercicio]);
  };

  const handleEliminarEjercicioNuevo = (ejercicioId: string) => {
    setEjerciciosNuevos((prev) => prev.filter(e => e.id !== ejercicioId));
  };

  const handleEliminarEjercicioAdicional = async (ejercicioEjecutado: EjercicioEjecutado) => {
    if (!entrenamiento || !ejercicioEjecutado.id) return;
    
    try {
      await entrenamientoService.deleteExerciseExecution(
        entrenamiento.id,
        ejercicioEjecutado.id
      );
      
      // Recargar entrenamiento
      const fecha = getDateForDayOfWeek(selectedDay, weekOffset);
      await loadTrainingByDate(usuario!.id, fecha);
    } catch (error) {
      console.error('Error al eliminar ejercicio:', error);
      alert('Error al eliminar el ejercicio');
    }
  };

  const recargarEntrenamiento = useCallback(async () => {
    if (usuario && selectedDay !== null) {
      const fecha = getDateForDayOfWeek(selectedDay, weekOffset);
      await loadTrainingByDate(usuario.id, fecha);
      // Limpiar ejercicios nuevos después de guardar (ya estarán en el entrenamiento)
      setEjerciciosNuevos([]);
    }
  }, [usuario, selectedDay, weekOffset, loadTrainingByDate]);

  if (loading && !rutina) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-dark-text-muted">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (!rutina) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="w-full max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4 text-dark-text">No hay rutina activa</h2>
            <p className="text-dark-text-muted mb-6">
              Crea una rutina y actívala para comenzar a entrenar
            </p>
            <Button onClick={() => navigate('/rutinas')} fullWidth>
              Ir a Rutinas
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-dark-bg p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                Entrenamiento
              </h1>
              <p className="text-dark-text-muted">{formatDiaSemana(selectedDay)} ({fechaSeleccionada})</p>
            </div>
            {tieneDatos && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('¿Estás seguro de que quieres borrar todos los registros de este día?')) {
                    clearEntrenamiento();
                  }
                }}
              >
                Limpiar Día
              </Button>
            )}
          </div>

          {/* Selector de semana y día */}
          <Card className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekOffset(0)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    weekOffset === 0
                      ? 'bg-dark-accent text-white'
                      : 'bg-dark-surface text-dark-text border border-dark-border hover:bg-dark-hover'
                  }`}
                >
                  Esta Semana
                </button>
                <button
                  onClick={() => setWeekOffset(1)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    weekOffset === 1
                      ? 'bg-dark-accent text-white'
                      : 'bg-dark-surface text-dark-text border border-dark-border hover:bg-dark-hover'
                  }`}
                >
                  Semana Siguiente
                </button>
              </div>
              {weekOffset === 1 && (
                <span className="text-sm text-dark-text-muted italic">
                  Vista previa - sin datos guardados
                </span>
              )}
            </div>
            <DaySelector
              selectedDay={selectedDay}
              onDayChange={setSelectedDay}
            />
          </Card>

          {/* Ejercicios - Mostrar siempre con campos de entrada */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-dark-text">Ejercicios del Día</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAgregarEjercicio}
                disabled={ejercicios.length === 0}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Ejercicio
              </Button>
            </div>
            <div className="space-y-4">
              {todosLosEjercicios.length > 0 ? (
                todosLosEjercicios.map((ejercicio) => {
                  const ejercicioEjecutado = entrenamiento?.ejerciciosEjecutados.find(
                    (ee) => ee.ejercicioId === ejercicio.ejercicioId
                  );
                  const ejercicioInfo = ejercicios.find(e => e.id === ejercicio.ejercicioId);
                  const esAdicional = ejerciciosAdicionales.some(ea => ea.id === ejercicio.id);
                  const esNuevo = ejerciciosNuevos.some(en => en.id === ejercicio.id);
                  
                  return (
                    <EjercicioCard
                      key={`${selectedDay}-${ejercicio.id}`}
                      ejercicio={ejercicio}
                      seriesEjecutadas={ejercicioEjecutado?.seriesEjecutadas}
                      usuarioId={usuario!.id}
                      fecha={fechaSeleccionada}
                      onSave={recargarEntrenamiento}
                      musculoPrincipal={ejercicioInfo?.musculoPrincipal}
                      ejerciciosDisponibles={ejercicios}
                      esEjercicioAdicional={esAdicional || esNuevo}
                      onDelete={
                        esNuevo
                          ? () => handleEliminarEjercicioNuevo(ejercicio.id)
                          : esAdicional && ejercicioEjecutado
                          ? () => handleEliminarEjercicioAdicional(ejercicioEjecutado)
                          : undefined
                      }
                    />
                  );
                })
              ) : (
                <Card>
                  <div className="py-12 text-center">
                    <p className="text-dark-text-muted mb-4">
                      No hay ejercicios planificados para {formatDiaSemana(selectedDay)}
                    </p>
                    <Button variant="outline" onClick={() => navigate('/rutinas')}>
                      Gestionar Rutinas
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
