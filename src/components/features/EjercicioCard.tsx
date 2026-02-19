import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SerieInput } from './SerieInput';
import type { EjercicioPlanificado, SerieEjecutada, Ejercicio, EjercicioMetodoBilbo, ProgresoMetodoBilbo } from '../../types';
import { useEntrenamientoStore } from '../../store/entrenamientoStore';
import { bilboService } from '../../services/bilboService';
import { entrenamientoService } from '../../services/entrenamientoService';
import { getMuscleColorWithDefault } from '../../constants/muscleColors';

interface EjercicioCardProps {
  ejercicio: EjercicioPlanificado;
  seriesEjecutadas?: SerieEjecutada[];
  usuarioId: string;
  fecha: string;
  onSave?: () => void;
  musculoPrincipal?: string;
  ejerciciosDisponibles: Ejercicio[];
  onDelete?: () => void;
  esEjercicioAdicional?: boolean; // Para ejercicios fuera de la rutina
  ejercicioBilboId?: string; // ID del ejercicio bilbo seleccionado para este día
}

export const EjercicioCard = ({
  ejercicio,
  seriesEjecutadas = [],
  usuarioId,
  fecha,
  onSave,
  musculoPrincipal,
  ejerciciosDisponibles,
  onDelete,
  esEjercicioAdicional = false,
  ejercicioBilboId,
}: EjercicioCardProps) => {
  const [series, setSeries] = useState<SerieEjecutada[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [ejercicioSeleccionadoId, setEjercicioSeleccionadoId] = useState<string>(ejercicio.ejercicioId);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<Ejercicio | undefined>(
    ejerciciosDisponibles.find(e => e.id === ejercicio.ejercicioId)
  );
  const [ejercicioBilbo, setEjercicioBilbo] = useState<EjercicioMetodoBilbo | null>(null);
  const [ultimoProgreso, setUltimoProgreso] = useState<ProgresoMetodoBilbo | null>(null);
  const [recordPersonal, setRecordPersonal] = useState<{peso: number, reps: number} | null>(null);
  const [maxRepsPesoCercano, setMaxRepsPesoCercano] = useState<{peso: number, reps: number} | null>(null);
  const [maxRepsPesoExacto, setMaxRepsPesoExacto] = useState<{peso: number, reps: number} | null>(null);
  const { registerExercise, loading } = useEntrenamientoStore();

  // Función para calcular el peso sugerido según el método Bilbo
  const calcularPesoSugerido = (bilbo: EjercicioMetodoBilbo, progreso: ProgresoMetodoBilbo | null): number | null => {
    if (!progreso) {
      // Si no hay progreso, usar peso inicial
      return bilbo.pesoInicial;
    }
    
    if (progreso.repeticiones < 15) {
      // Si las reps fueron < 15, resetear al peso inicial
      return bilbo.pesoInicial;
    } else {
      // Si las reps fueron >= 15, incrementar peso
      return progreso.pesoActual + bilbo.incremento;
    }
  };

  // Cargar record personal del ejercicio
  const cargarRecordPersonal = useCallback(async (ejercicioId: string) => {
    try {
      const record = await entrenamientoService.getRecordPersonal(usuarioId, ejercicioId);
      setRecordPersonal(record);
    } catch (error) {
      console.error('Error al cargar record personal:', error);
      setRecordPersonal(null);
    }
  }, [usuarioId]);

  // Cargar máximo de reps en peso cercano para método Bilbo
  const cargarMaxRepsPesoCercano = useCallback(async (ejercicioId: string, pesoObjetivo: number) => {
    try {
      const maxReps = await entrenamientoService.getMaxRepsEnPesoCercano(usuarioId, ejercicioId, pesoObjetivo);
      setMaxRepsPesoCercano(maxReps);
    } catch (error) {
      console.error('Error al cargar max reps peso cercano:', error);
      setMaxRepsPesoCercano(null);
    }
  }, [usuarioId]);

  // Cargar máximo de reps en peso exacto para método Bilbo
  const cargarMaxRepsPesoExacto = useCallback(async (ejercicioId: string, pesoObjetivo: number) => {
    try {
      const maxReps = await entrenamientoService.getMaxRepsEnPesoExacto(usuarioId, ejercicioId, pesoObjetivo);
      setMaxRepsPesoExacto(maxReps);
    } catch (error) {
      console.error('Error al cargar max reps peso exacto:', error);
      setMaxRepsPesoExacto(null);
    }
  }, [usuarioId]);

  // Función para habilitar modo edición
  const habilitarEdicion = () => {
    setIsEditMode(true);
    setUserInteracted(true);
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setIsEditMode(false);
    setUserInteracted(false);
    // Restaurar valores originales
    setSeries(seriesEjecutadas.length > 0 ? seriesEjecutadas : ejercicio.seriesPlanificadas.map((sp) => ({
      numeroSerie: sp.numeroSerie,
      pesoReal: sp.pesoPlanificado,
      repeticiones: undefined,
    })));
    setHasChanges(false);
  };

  // Actualizar ejercicio seleccionado cuando cambia el ID
  useEffect(() => {
    const nuevoEjercicio = ejerciciosDisponibles.find(e => e.id === ejercicioSeleccionadoId);
    setEjercicioSeleccionado(nuevoEjercicio);
    if (nuevoEjercicio) {
      setHasChanges(true);
      setIsSaved(false);
    }
    
    // Cargar información del método Bilbo solo si el ejercicio es el bilbo asignado al día
    const loadBilboInfo = async () => {
      const esEjercicioBilboDelDia = ejercicioBilboId === ejercicioSeleccionadoId;
      if (!esEjercicioBilboDelDia) {
        setEjercicioBilbo(null);
        setUltimoProgreso(null);
        return;
      }
      
      try {
        const bilbo = await bilboService.getByEjercicio(usuarioId, ejercicioSeleccionadoId);
        setEjercicioBilbo(bilbo);
        
        if (bilbo) {
          const progreso = await bilboService.getUltimoProgreso(usuarioId, ejercicioSeleccionadoId);
          setUltimoProgreso(progreso || null);
          
          if (!seriesEjecutadas || seriesEjecutadas.length === 0) {
            const pesoSugerido = calcularPesoSugerido(bilbo, progreso);
            if (pesoSugerido !== null) {
              setSeries((prev) => {
                const primeraSerie = prev.find(s => s.numeroSerie === 1);
                if (!primeraSerie || primeraSerie.pesoReal === undefined) {
                  const nuevasSeries = prev.filter(s => s.numeroSerie !== 1);
                  nuevasSeries.push({ numeroSerie: 1, pesoReal: pesoSugerido, repeticiones: undefined });
                  return nuevasSeries.sort((a, b) => a.numeroSerie - b.numeroSerie);
                }
                return prev;
              });
            }
          }
        } else {
          setEjercicioBilbo(null);
          setUltimoProgreso(null);
        }
      } catch {
        setEjercicioBilbo(null);
        setUltimoProgreso(null);
      }
    };
    
    loadBilboInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioSeleccionadoId, usuarioId, ejercicioBilboId]);

  // Sincronizar el estado interno cuando cambian las series ejecutadas (por ejemplo, al cambiar de día)
  useEffect(() => {
    if (seriesEjecutadas.length > 0) {
      // Si hay series ejecutadas, usar esos datos (no modificar)
      const seriesJson = JSON.stringify(series);
      const nuevasSeriesJson = JSON.stringify(seriesEjecutadas);
      
      if (seriesJson !== nuevasSeriesJson) {
        setSeries(seriesEjecutadas);
        setIsSaved(true);
        setHasChanges(false);
      }
    } else {
      // Si no hay series ejecutadas, inicializar con series vacías (no precargar valores)
      // Solo el peso para método Bilbo serie 1 se establecerá en otro useEffect
      const nuevasSeries = ejercicio.seriesPlanificadas.map((sp) => ({
        numeroSerie: sp.numeroSerie,
        pesoReal: undefined,
        repeticiones: undefined,
      }));
      
      const seriesJson = JSON.stringify(series);
      const nuevasSeriesJson = JSON.stringify(nuevasSeries);
      
      if (seriesJson !== nuevasSeriesJson) {
        setSeries(nuevasSeries);
        setIsSaved(false);
        setHasChanges(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicio.id, seriesEjecutadas.length, ejercicio.seriesPlanificadas.length]);

  // Actualizar el peso de la serie 1 para método Bilbo cuando se carga la información o cambian las series
  useEffect(() => {
    if (ejercicioBilbo && seriesEjecutadas.length === 0) {
      setSeries((prev) => {
        const primeraSerie = prev.find(s => s.numeroSerie === 1);
        const pesoPlanificado = ejercicio.seriesPlanificadas.find(sp => sp.numeroSerie === 1)?.pesoPlanificado;
        // Solo actualizar si la serie 1 tiene el peso planificado (no ha sido modificada)
        if (primeraSerie && primeraSerie.pesoReal === pesoPlanificado) {
          const proximoPeso = calcularPesoSugerido(ejercicioBilbo, ultimoProgreso);
          if (proximoPeso !== null && proximoPeso !== pesoPlanificado) {
            const updated = [...prev];
            const index = updated.findIndex(s => s.numeroSerie === 1);
            if (index !== -1) {
              updated[index] = { ...updated[index], pesoReal: proximoPeso };
            }
            return updated;
          }
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioBilbo, ultimoProgreso, seriesEjecutadas.length]);

  // Cargar records personales cuando cambia el ejercicio seleccionado
  useEffect(() => {
    if (ejercicioSeleccionadoId) {
      cargarRecordPersonal(ejercicioSeleccionadoId);
    }
  }, [ejercicioSeleccionadoId, cargarRecordPersonal]);

  // Cargar max reps para método Bilbo cuando cambia el peso sugerido
  useEffect(() => {
    if (ejercicioBilbo && ejercicioSeleccionadoId) {
      const proximoPeso = calcularPesoSugerido(ejercicioBilbo, ultimoProgreso);
      if (proximoPeso !== null) {
        cargarMaxRepsPesoCercano(ejercicioSeleccionadoId, proximoPeso);
        cargarMaxRepsPesoExacto(ejercicioSeleccionadoId, proximoPeso);
      }
    }
  }, [ejercicioBilbo, ultimoProgreso, ejercicioSeleccionadoId, cargarMaxRepsPesoCercano]);

  const handleSerieUpdate = useCallback((numeroSerie: number, peso?: number, reps?: number) => {
    if (!userInteracted && !isEditMode && (isSaved || seriesEjecutadas.length > 0)) {
      // No permitir cambios si está guardado y no estamos en modo edición
      return;
    }
    
    setSeries((prev) => {
      const updated = [...prev];
      const index = updated.findIndex(s => s.numeroSerie === numeroSerie);
      
      if (index !== -1) {
        updated[index] = { ...updated[index], pesoReal: peso, repeticiones: reps };
      } else {
        updated.push({ numeroSerie, pesoReal: peso, repeticiones: reps });
      }
      
      const sorted = updated.sort((a, b) => a.numeroSerie - b.numeroSerie);
      setHasChanges(true);
      setIsSaved(false);
      return sorted;
    });
  }, [userInteracted, isEditMode, isSaved, seriesEjecutadas]);

  const handleAddSerie = () => {
    const siguienteNumero = series.length > 0 
      ? Math.max(...series.map(s => s.numeroSerie)) + 1
      : (ejercicio.seriesPlanificadas.length > 0 
          ? Math.max(...ejercicio.seriesPlanificadas.map(sp => sp.numeroSerie)) + 1
          : 1);
    
    setSeries((prev) => {
      const nuevas = [...prev, { numeroSerie: siguienteNumero, pesoReal: undefined, repeticiones: undefined }];
      setHasChanges(true);
      setIsSaved(false);
      return nuevas.sort((a, b) => a.numeroSerie - b.numeroSerie);
    });
  };

  const handleRemoveSerie = (numeroSerie: number) => {
    setSeries((prev) => {
      const nuevas = prev.filter(s => s.numeroSerie !== numeroSerie);
      setHasChanges(true);
      setIsSaved(false);
      return nuevas.sort((a, b) => a.numeroSerie - b.numeroSerie);
    });
  };

  const handleSave = async () => {
    if (!ejercicioSeleccionadoId) return;
    
    try {
      await registerExercise(usuarioId, fecha, ejercicioSeleccionadoId, series);
      setIsSaved(true);
      setHasChanges(false);
      onSave?.();
    } catch {
      setIsSaved(false);
    }
  };

  const musculoActual = ejercicioSeleccionado?.musculoPrincipal || musculoPrincipal || '';
  const color = musculoActual ? getMuscleColorWithDefault(musculoActual) : 'transparent';

  // Crear lista de todas las series (planificadas + adicionales)
  const numerosDeSerie = new Set([
    ...ejercicio.seriesPlanificadas.map(sp => sp.numeroSerie),
    ...series.map(s => s.numeroSerie)
  ]);
  const todasLasSeriesNumeros = Array.from(numerosDeSerie).sort((a, b) => a - b);

  return (
    <Card 
      className={`mb-4 transition-all duration-300 ${
        isSaved && !hasChanges 
          ? 'bg-dark-surface/50 border-2 border-green-500/50' 
          : ''
      }`}
      style={{
        borderLeftColor: color !== 'transparent' ? color : undefined,
        borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
      }}
    >
      <div className="mb-4 flex justify-between items-start">
        <div className="flex-1">
          {/* Selector de ejercicio */}
          <select
            value={ejercicioSeleccionadoId}
            onChange={(e) => setEjercicioSeleccionadoId(e.target.value)}
            className="w-full mb-2 px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent"
          disabled={loading || (isSaved && !hasChanges && !isEditMode)}
          >
            {ejerciciosDisponibles.map((ej) => (
              <option key={ej.id} value={ej.id}>
                {ej.nombre}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-dark-text-muted">Orden: {ejercicio.orden}</p>
            {esEjercicioAdicional && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                Ejercicio adicional
              </span>
            )}
            {ejercicioBilbo && (
              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                Método Bilbo
              </span>
            )}
          </div>
          
          {/* Records personales */}
          {recordPersonal && (
            <div className="mt-3 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div>
                  <div className="text-sm font-bold">RÉCORD PERSONAL</div>
                  <div className="text-base font-semibold">{recordPersonal.peso} kg × {recordPersonal.reps} reps</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {isSaved && !hasChanges && (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Guardado</span>
            </div>
          )}
          
          {isSaved && !hasChanges && !isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={habilitarEdicion}
              className="ml-2"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </Button>
          )}
          
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={cancelarEdicion}
              className="ml-2"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {todasLasSeriesNumeros.map((numeroSerie) => {
          const seriePlanificada = ejercicio.seriesPlanificadas.find(sp => sp.numeroSerie === numeroSerie);
          const serieEjecutada = series.find((s) => s.numeroSerie === numeroSerie);
          const esSerieAdicional = !seriePlanificada;
          const esEjercicioBilboDelDia = ejercicioBilboId === ejercicio.ejercicioId;
          const esMetodoBilboSerie1 = (ejercicioBilbo || esEjercicioBilboDelDia) && numeroSerie === 1;
          
          // Calcular peso sugerido para la primera serie del método Bilbo
          let pesoInicial: number | undefined = undefined;
          
          // Si es método Bilbo serie 1, priorizar el próximo peso calculado o no pedir peso si es bilbo del día
          if (esMetodoBilboSerie1) {
            if (esEjercicioBilboDelDia && !ejercicioBilbo) {
              // Si es el ejercicio bilbo del día pero no está configurado en método Bilbo, no pedir peso
              pesoInicial = undefined;
            } else if (ejercicioBilbo) {
              if (serieEjecutada?.pesoReal !== undefined) {
                // Si ya hay una serie ejecutada guardada, usar ese peso
                pesoInicial = serieEjecutada.pesoReal;
              } else {
                // Si no hay serie ejecutada, usar el próximo peso calculado
                const proximoPeso = calcularPesoSugerido(ejercicioBilbo, ultimoProgreso);
                if (proximoPeso !== null) {
                  pesoInicial = proximoPeso;
                }
              }
            } else {
              pesoInicial = serieEjecutada?.pesoReal;
            }
          } else {
            // Para series normales o no método Bilbo, solo usar valores ejecutados (no planificados)
            pesoInicial = serieEjecutada?.pesoReal;
          }
          
          return (
            <div key={numeroSerie} className="flex items-center gap-2">
              <div className="flex-1">
                <SerieInput
                  numeroSerie={numeroSerie}
                  pesoInicial={pesoInicial}
                  repsInicial={serieEjecutada?.repeticiones}
                  onUpdate={(peso, reps) =>
                    handleSerieUpdate(numeroSerie, peso, reps)
                  }
                  disabled={loading || (isSaved && !hasChanges && !isEditMode)}
                  hasUserInteracted={userInteracted || isEditMode}
                />
                  {esMetodoBilboSerie1 && (esEjercicioBilboDelDia || ejercicioBilbo) && (() => {
                    if (esEjercicioBilboDelDia && !ejercicioBilbo) {
                      return (
                        <p className="text-xs text-purple-400 mt-2">
                          ⚡ Ejercicio Bilbo del día (peso variable)
                        </p>
                      );
                    }
                    
                    if (ejercicioBilbo) {
                      const proximoPeso = calcularPesoSugerido(ejercicioBilbo, ultimoProgreso);
                      return proximoPeso !== null ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-400">
                              ⚡ Primera serie al fallo (Método Bilbo)
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-semibold">
                              Próximo: {proximoPeso} kg
                            </span>
                          </div>
                          {maxRepsPesoExacto && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-orange-400">
                                🎯 Max reps en {maxRepsPesoExacto.peso} kg:
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded font-semibold">
                                {maxRepsPesoExacto.reps} reps
                              </span>
                            </div>
                          )}
                          {maxRepsPesoCercano && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-400">
                                🏆 Máx reps en pesos cercanos:
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded font-semibold">
                                {maxRepsPesoCercano.reps} reps ({maxRepsPesoCercano.peso} kg)
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-purple-400 mt-2">
                          ⚡ Primera serie al fallo (Método Bilbo)
                        </p>
                      );
                    }
                    return null;
                  })()}
              </div>
              {esSerieAdicional && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveSerie(numeroSerie)}
                  disabled={loading || (isSaved && !hasChanges && !isEditMode)}
                  className="flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>
          );
        })}
        
        {/* Botón para agregar serie */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSerie}
          disabled={loading || (isSaved && !hasChanges)}
          fullWidth
          className="mt-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar Serie
        </Button>
      </div>

      <div className="flex gap-2">
        {onDelete && (
          <Button
            variant="danger"
            size="lg"
            onClick={onDelete}
            disabled={loading}
            className="flex-shrink-0"
          >
            Eliminar
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={loading || (isSaved && !hasChanges && !isEditMode) || !ejercicioSeleccionadoId}
          fullWidth
          size="lg"
          variant={isSaved && !hasChanges ? "outline" : "primary"}
        >
          {loading ? (
            'Guardando...'
          ) : isSaved && !hasChanges ? (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardado
            </span>
          ) : (
            hasChanges ? 'Guardar Cambios' : 'Guardar Ejercicio'
          )}
        </Button>
      </div>
    </Card>
  );
};
