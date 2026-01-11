import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SerieInput } from './SerieInput';
import type { EjercicioPlanificado, SerieEjecutada, Ejercicio, EjercicioMetodoBilbo, ProgresoMetodoBilbo } from '../../types';
import { useEntrenamientoStore } from '../../store/entrenamientoStore';
import { bilboService } from '../../services/bilboService';
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
}: EjercicioCardProps) => {
  const [series, setSeries] = useState<SerieEjecutada[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [ejercicioSeleccionadoId, setEjercicioSeleccionadoId] = useState<string>(ejercicio.ejercicioId);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<Ejercicio | undefined>(
    ejerciciosDisponibles.find(e => e.id === ejercicio.ejercicioId)
  );
  const [ejercicioBilbo, setEjercicioBilbo] = useState<EjercicioMetodoBilbo | null>(null);
  const [ultimoProgreso, setUltimoProgreso] = useState<ProgresoMetodoBilbo | null>(null);
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

  // Actualizar ejercicio seleccionado cuando cambia el ID
  useEffect(() => {
    const nuevoEjercicio = ejerciciosDisponibles.find(e => e.id === ejercicioSeleccionadoId);
    setEjercicioSeleccionado(nuevoEjercicio);
    if (nuevoEjercicio) {
      setHasChanges(true);
      setIsSaved(false);
    }
    
    // Cargar información del método Bilbo si existe
    const loadBilboInfo = async () => {
      try {
        const bilbo = await bilboService.getByEjercicio(usuarioId, ejercicioSeleccionadoId);
        setEjercicioBilbo(bilbo);
        
        if (bilbo) {
          const progreso = await bilboService.getUltimoProgreso(usuarioId, ejercicioSeleccionadoId);
          setUltimoProgreso(progreso || null);
          
          // Si es del método Bilbo y no hay series guardadas, sugerir peso para la primera serie
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
        // Si hay error, simplemente no mostrar info de Bilbo
        setEjercicioBilbo(null);
        setUltimoProgreso(null);
      }
    };
    
    loadBilboInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioSeleccionadoId, usuarioId]);

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
      // Si no hay series ejecutadas, inicializar con las series planificadas
      // Pero el peso para método Bilbo serie 1 se establecerá en otro useEffect
      const nuevasSeries = ejercicio.seriesPlanificadas.map((sp) => ({
        numeroSerie: sp.numeroSerie,
        pesoReal: sp.pesoPlanificado,
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

  const handleSerieUpdate = useCallback((numeroSerie: number, peso?: number, reps?: number) => {
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
  }, []);

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
            disabled={loading || (isSaved && !hasChanges)}
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
        </div>
        {isSaved && !hasChanges && (
          <div className="flex items-center gap-2 text-green-400 ml-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Guardado</span>
          </div>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {todasLasSeriesNumeros.map((numeroSerie) => {
          const seriePlanificada = ejercicio.seriesPlanificadas.find(sp => sp.numeroSerie === numeroSerie);
          const serieEjecutada = series.find((s) => s.numeroSerie === numeroSerie);
          const esSerieAdicional = !seriePlanificada;
          const esMetodoBilboSerie1 = ejercicioBilbo && numeroSerie === 1;
          
          // Calcular peso sugerido para la primera serie del método Bilbo
          let pesoInicial: number | undefined = undefined;
          
          // Si es método Bilbo serie 1, priorizar el próximo peso calculado
          if (esMetodoBilboSerie1 && ejercicioBilbo) {
            if (serieEjecutada?.pesoReal !== undefined) {
              // Si ya hay una serie ejecutada guardada, usar ese peso
              pesoInicial = serieEjecutada.pesoReal;
            } else {
              // Si no hay serie ejecutada, usar el próximo peso calculado
              const proximoPeso = calcularPesoSugerido(ejercicioBilbo, ultimoProgreso);
              if (proximoPeso !== null) {
                pesoInicial = proximoPeso;
              } else {
                pesoInicial = seriePlanificada?.pesoPlanificado;
              }
            }
          } else {
            // Para series normales o no método Bilbo, usar el comportamiento estándar
            pesoInicial = serieEjecutada?.pesoReal ?? seriePlanificada?.pesoPlanificado;
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
                  disabled={loading || (isSaved && !hasChanges)}
                />
                {esMetodoBilboSerie1 && ejercicioBilbo && (() => {
                  const proximoPeso = calcularPesoSugerido(ejercicioBilbo, ultimoProgreso);
                  return proximoPeso !== null ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-purple-400">
                        ⚡ Primera serie al fallo (Método Bilbo)
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-semibold">
                        Próximo: {proximoPeso} kg
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-purple-400 mt-1">
                      ⚡ Primera serie al fallo (Método Bilbo)
                    </p>
                  );
                })()}
              </div>
              {esSerieAdicional && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveSerie(numeroSerie)}
                  disabled={loading || (isSaved && !hasChanges)}
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
          disabled={loading || (isSaved && !hasChanges) || !ejercicioSeleccionadoId}
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
