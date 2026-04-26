import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SerieInput } from './SerieInput';
import type {
  EjercicioPlanificado,
  SerieEjecutada,
  Ejercicio,
  EjercicioMetodoBilbo,
  ProgresoMetodoBilbo,
  UltimaSesionEjercicio,
} from '../../types';
import { useEntrenamientoStore } from '../../store/entrenamientoStore';
import { bilboService } from '../../services/bilboService';
import { entrenamientoService } from '../../services/entrenamientoService';
import { getMuscleColorWithDefault } from '../../constants/muscleColors';
import { calcularProximoPesoBilbo } from '../../utils/bilbo';
import { formatDiaSemana, formatFechaCortaEs } from '../../utils/formatters';

interface EjercicioCardProps {
  ejercicio: EjercicioPlanificado;
  seriesEjecutadas?: SerieEjecutada[];
  usuarioId: string;
  fecha: string;
  onSave?: () => void;
  musculoPrincipal?: string;
  ejerciciosDisponibles: Ejercicio[];
  onDelete?: () => void;
  esEjercicioAdicional?: boolean;
  /** Si el slot en la rutina está marcado como ejercicio Bilbo (checkbox en editor de rutina). */
  esBilboEnRutina?: boolean;
  /** null: Home cargando; mapa listo con null si no hay historial previo a la fecha del día */
  ultimaSesionPorEjercicioId?: Record<string, UltimaSesionEjercicio | null> | null;
  /** Día de rutina (1–7) para la última sesión del mismo día de la semana */
  diaSemanaRutina: number;
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
  esBilboEnRutina = false,
  ultimaSesionPorEjercicioId,
  diaSemanaRutina,
}: EjercicioCardProps) => {
  const [series, setSeries] = useState<SerieEjecutada[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [ejercicioSeleccionadoId, setEjercicioSeleccionadoId] = useState<string>(ejercicio.ejercicioId);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<Ejercicio | undefined>(
    ejerciciosDisponibles.find((e) => e.id === ejercicio.ejercicioId)
  );
  const [ejercicioBilbo, setEjercicioBilbo] = useState<EjercicioMetodoBilbo | null>(null);
  const [ultimoProgreso, setUltimoProgreso] = useState<ProgresoMetodoBilbo | null>(null);

  const [recordPersonal, setRecordPersonal] = useState<{ peso: number; reps: number } | null>(null);
  const [recordPanelAbierto, setRecordPanelAbierto] = useState(false);
  const [recordCargando, setRecordCargando] = useState(false);

  const [maxRepsPesoDia, setMaxRepsPesoDia] = useState<{ peso: number; reps: number } | null>(null);
  const [maxRepsPanelAbierto, setMaxRepsPanelAbierto] = useState(false);
  const [maxRepsCargando, setMaxRepsCargando] = useState(false);

  const [ultimaSesionExtra, setUltimaSesionExtra] = useState<UltimaSesionEjercicio | null | undefined>(undefined);
  const ultimaSesionExtraFetchIdRef = useRef<string | null>(null);

  const { registerExercise, loading } = useEntrenamientoStore();

  const esBilboDelDia = esBilboEnRutina;

  const pesoObjetivoBilbo = useMemo(() => {
    if (!esBilboDelDia || !ejercicioBilbo) return null;
    return calcularProximoPesoBilbo(ejercicioBilbo, ultimoProgreso);
  }, [esBilboDelDia, ejercicioBilbo, ultimoProgreso]);

  const resumenUltimaDesdeHome =
    ultimaSesionPorEjercicioId !== undefined && ultimaSesionPorEjercicioId !== null
      ? Object.prototype.hasOwnProperty.call(ultimaSesionPorEjercicioId, ejercicioSeleccionadoId)
        ? ultimaSesionPorEjercicioId[ejercicioSeleccionadoId]
        : undefined
      : undefined;

  const resumenUltima =
    resumenUltimaDesdeHome !== undefined ? resumenUltimaDesdeHome : ultimaSesionExtra;

  useEffect(() => {
    setUltimaSesionExtra(undefined);
    ultimaSesionExtraFetchIdRef.current = null;
    setRecordPanelAbierto(false);
    setRecordPersonal(null);
    setMaxRepsPanelAbierto(false);
    setMaxRepsPesoDia(null);
  }, [ejercicioSeleccionadoId, fecha, diaSemanaRutina]);

  useEffect(() => {
    if (ultimaSesionPorEjercicioId === null || ultimaSesionPorEjercicioId === undefined) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(ultimaSesionPorEjercicioId, ejercicioSeleccionadoId)) {
      ultimaSesionExtraFetchIdRef.current = null;
      return;
    }
    if (ultimaSesionExtraFetchIdRef.current === ejercicioSeleccionadoId) {
      return;
    }
    ultimaSesionExtraFetchIdRef.current = ejercicioSeleccionadoId;
    let cancelled = false;
    (async () => {
      try {
        const map = await entrenamientoService.getUltimasSesionesMap(
          usuarioId,
          [ejercicioSeleccionadoId],
          fecha,
          diaSemanaRutina
        );
        if (cancelled) return;
        setUltimaSesionExtra(map[ejercicioSeleccionadoId] ?? null);
      } catch (e) {
        console.error('Última sesión (ejercicio cambiado):', e);
        if (!cancelled) setUltimaSesionExtra(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [usuarioId, ejercicioSeleccionadoId, fecha, diaSemanaRutina, ultimaSesionPorEjercicioId]);

  const cargarRecordPersonalDebajo = useCallback(async () => {
    setRecordCargando(true);
    try {
      const record = await entrenamientoService.getRecordPersonal(usuarioId, ejercicioSeleccionadoId);
      setRecordPersonal(record);
    } catch (error) {
      console.error('Error al cargar record personal:', error);
      setRecordPersonal(null);
    } finally {
      setRecordCargando(false);
    }
  }, [usuarioId, ejercicioSeleccionadoId]);

  const toggleRecordPanel = () => {
    if (!recordPanelAbierto) {
      setRecordPanelAbierto(true);
      void cargarRecordPersonalDebajo();
    } else {
      setRecordPanelAbierto(false);
    }
  };

  const cargarMaxRepsEnPesoDelDia = useCallback(async () => {
    if (pesoObjetivoBilbo === null) return;
    setMaxRepsCargando(true);
    try {
      const r = await entrenamientoService.getMaxRepsEnPesoExacto(
        usuarioId,
        ejercicioSeleccionadoId,
        pesoObjetivoBilbo
      );
      setMaxRepsPesoDia(r);
    } catch (e) {
      console.error('Max reps peso del día:', e);
      setMaxRepsPesoDia(null);
    } finally {
      setMaxRepsCargando(false);
    }
  }, [usuarioId, ejercicioSeleccionadoId, pesoObjetivoBilbo]);

  const toggleMaxRepsPanel = () => {
    if (!maxRepsPanelAbierto) {
      setMaxRepsPanelAbierto(true);
      void cargarMaxRepsEnPesoDelDia();
    } else {
      setMaxRepsPanelAbierto(false);
    }
  };

  const habilitarEdicion = () => {
    setIsEditMode(true);
    setUserInteracted(true);
  };

  const cancelarEdicion = () => {
    setIsEditMode(false);
    setUserInteracted(false);
    setSeries(
      seriesEjecutadas.length > 0
        ? seriesEjecutadas
        : ejercicio.seriesPlanificadas.map((sp) => ({
            numeroSerie: sp.numeroSerie,
            pesoReal: sp.pesoPlanificado,
            repeticiones: undefined,
          }))
    );
    setHasChanges(false);
  };

  useEffect(() => {
    const nuevoEjercicio = ejerciciosDisponibles.find((e) => e.id === ejercicioSeleccionadoId);
    setEjercicioSeleccionado(nuevoEjercicio);
    if (nuevoEjercicio) {
      setHasChanges(true);
      setIsSaved(false);
    }

    if (!esBilboDelDia) {
      setEjercicioBilbo(null);
      setUltimoProgreso(null);
      return;
    }

    const loadBilboInfo = async () => {
      try {
        const bilbo = await bilboService.getByEjercicio(usuarioId, ejercicioSeleccionadoId);
        setEjercicioBilbo(bilbo);
        if (bilbo) {
          const progreso = await bilboService.getUltimoProgreso(usuarioId, ejercicioSeleccionadoId);
          setUltimoProgreso(progreso || null);
        } else {
          setUltimoProgreso(null);
        }
      } catch {
        setEjercicioBilbo(null);
        setUltimoProgreso(null);
      }
    };

    void loadBilboInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioSeleccionadoId, usuarioId, esBilboEnRutina]);

  useEffect(() => {
    if (seriesEjecutadas.length > 0) {
      const seriesJson = JSON.stringify(series);
      const nuevasSeriesJson = JSON.stringify(seriesEjecutadas);
      if (seriesJson !== nuevasSeriesJson) {
        setSeries(seriesEjecutadas);
        setIsSaved(true);
        setHasChanges(false);
      }
    } else {
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

  useEffect(() => {
    if (!ejercicioBilbo || !esBilboDelDia) return;
    if (userInteracted || isEditMode) return;

    const target = calcularProximoPesoBilbo(ejercicioBilbo, ultimoProgreso);
    if (target === null) return;

    const s1FromProps = seriesEjecutadas.find((s) => s.numeroSerie === 1);
    if (s1FromProps?.repeticiones != null) return;

    setSeries((prev) => {
      const primera = prev.find((s) => s.numeroSerie === 1);
      if (primera?.repeticiones != null) return prev;
      if (primera?.pesoReal === target) return prev;

      const rest = prev.filter((s) => s.numeroSerie !== 1);
      rest.push({
        numeroSerie: 1,
        pesoReal: target,
        repeticiones: primera?.repeticiones ?? s1FromProps?.repeticiones,
      });
      return rest.sort((a, b) => a.numeroSerie - b.numeroSerie);
    });
  }, [ejercicioBilbo, ultimoProgreso, esBilboDelDia, seriesEjecutadas, userInteracted, isEditMode]);

  const handleSerieUpdate = useCallback(
    (numeroSerie: number, peso?: number, reps?: number) => {
      if (!userInteracted && !isEditMode && (isSaved || seriesEjecutadas.length > 0)) {
        return;
      }
      setSeries((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((s) => s.numeroSerie === numeroSerie);
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
    },
    [userInteracted, isEditMode, isSaved, seriesEjecutadas]
  );

  const handleAddSerie = () => {
    const siguienteNumero =
      series.length > 0
        ? Math.max(...series.map((s) => s.numeroSerie)) + 1
        : ejercicio.seriesPlanificadas.length > 0
          ? Math.max(...ejercicio.seriesPlanificadas.map((sp) => sp.numeroSerie)) + 1
          : 1;
    setSeries((prev) => {
      const nuevas = [...prev, { numeroSerie: siguienteNumero, pesoReal: undefined, repeticiones: undefined }];
      setHasChanges(true);
      setIsSaved(false);
      return nuevas.sort((a, b) => a.numeroSerie - b.numeroSerie);
    });
  };

  const handleRemoveSerie = (numeroSerie: number) => {
    setSeries((prev) => {
      const nuevas = prev.filter((s) => s.numeroSerie !== numeroSerie);
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

  const numerosDeSerie = new Set([
    ...ejercicio.seriesPlanificadas.map((sp) => sp.numeroSerie),
    ...series.map((s) => s.numeroSerie),
  ]);
  const todasLasSeriesNumeros = Array.from(numerosDeSerie).sort((a, b) => a - b);

  const serie1KeyBilbo =
    esBilboDelDia && ejercicioBilbo
      ? `${ejercicioSeleccionadoId}-${ejercicioBilbo.id}-${ultimoProgreso?.id ?? 'np'}-${pesoObjetivoBilbo ?? 'x'}`
      : null;

  return (
    <Card
      className={`mb-4 transition-all duration-300 ${
        isSaved && !hasChanges ? 'bg-dark-surface/50 border-2 border-green-500/50' : ''
      }`}
      style={{
        borderLeftColor: color !== 'transparent' ? color : undefined,
        borderLeftWidth: color !== 'transparent' ? '4px' : undefined,
      }}
    >
      <div className="mb-3 flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <select
              value={ejercicioSeleccionadoId}
              onChange={(e) => setEjercicioSeleccionadoId(e.target.value)}
              className="flex-1 min-w-0 mb-2 px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent"
              disabled={loading || (isSaved && !hasChanges && !isEditMode)}
            >
              {ejerciciosDisponibles.map((ej) => (
                <option key={ej.id} value={ej.id}>
                  {ej.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              title="Ver récord personal"
              onClick={toggleRecordPanel}
              className="mt-1 flex-shrink-0 w-9 h-9 rounded-lg border border-yellow-500/50 bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 flex items-center justify-center transition-colors"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
            {esBilboDelDia && ejercicioBilbo && pesoObjetivoBilbo !== null && (
              <button
                type="button"
                title="Ver tus mejores repeticiones con el peso de hoy"
                onClick={toggleMaxRepsPanel}
                className="mt-1 flex-shrink-0 w-9 h-9 rounded-lg border border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-colors"
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 01-10 0V4zM7 4H5a2 2 0 100 4h2m10-4h2a2 2 0 110 4h-2"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-dark-text-muted">Orden: {ejercicio.orden}</p>
            {esEjercicioAdicional && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Ejercicio adicional</span>
            )}
            {ejercicioBilbo && esBilboDelDia && (
              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Método Bilbo</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isSaved && !hasChanges && (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Guardado</span>
            </div>
          )}
          {isSaved && !hasChanges && !isEditMode && (
            <Button variant="outline" size="sm" onClick={habilitarEdicion} className="ml-2">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </Button>
          )}
          {isEditMode && (
            <Button variant="outline" size="sm" onClick={cancelarEdicion} className="ml-2">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {recordPanelAbierto && (
        <div className="mb-3 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg">
          {recordCargando ? (
            <p className="text-sm text-yellow-200/80">Cargando récord…</p>
          ) : recordPersonal ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide">Récord personal</div>
                <div className="text-base font-semibold">
                  {recordPersonal.peso} kg × {recordPersonal.reps} reps
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-yellow-200/80">No hay récord registrado con peso y repeticiones.</p>
          )}
        </div>
      )}

      {maxRepsPanelAbierto && esBilboDelDia && ejercicioBilbo && (
        <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          {maxRepsCargando ? (
            <p className="text-sm text-emerald-200/80">Cargando…</p>
          ) : maxRepsPesoDia ? (
            <p className="text-sm text-emerald-300">
              Mejor registro a <span className="font-semibold">{maxRepsPesoDia.peso} kg</span>:{' '}
              <span className="font-bold text-emerald-200">{maxRepsPesoDia.reps} reps</span>
            </p>
          ) : (
            <p className="text-sm text-emerald-200/80">No hay series previas con ese peso exacto.</p>
          )}
        </div>
      )}

      <div className="mb-4 rounded-lg border border-dark-border/60 bg-dark-surface/40 px-3 py-2.5">
        <p className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide mb-1.5">
          Última vez en {formatDiaSemana(diaSemanaRutina)} (antes de esta fecha)
        </p>
        {ultimaSesionPorEjercicioId === null ? (
          <p className="text-sm text-dark-text-muted">Cargando historial…</p>
        ) : resumenUltima === undefined ? (
          <p className="text-sm text-dark-text-muted">Cargando…</p>
        ) : resumenUltima === null || resumenUltima.series.length === 0 ? (
          <p className="text-sm text-dark-text-muted">
            Sin entrenamientos previos en {formatDiaSemana(diaSemanaRutina)} para este ejercicio.
          </p>
        ) : (
          <>
            <p className="text-sm text-dark-text mb-2">{formatFechaCortaEs(resumenUltima.fecha)}</p>
            <ul className="space-y-1 text-sm text-dark-text">
              {resumenUltima.series.map((s) => (
                <li key={s.numeroSerie} className="flex gap-2">
                  <span className="text-dark-text-muted w-16">Serie {s.numeroSerie}</span>
                  <span>
                    {s.pesoReal != null ? `${s.pesoReal} kg` : '—'}
                    {s.repeticiones != null ? ` × ${s.repeticiones} reps` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {todasLasSeriesNumeros.map((numeroSerie) => {
          const seriePlanificada = ejercicio.seriesPlanificadas.find((sp) => sp.numeroSerie === numeroSerie);
          const serieEjecutada = series.find((s) => s.numeroSerie === numeroSerie);
          const esSerieAdicional = !seriePlanificada;
          const esMetodoBilboSerie1 = (ejercicioBilbo || esBilboDelDia) && numeroSerie === 1;

          let pesoInicial: number | undefined;
          if (esMetodoBilboSerie1) {
            if (esBilboDelDia && !ejercicioBilbo) {
              pesoInicial = undefined;
            } else if (ejercicioBilbo) {
              if (serieEjecutada?.pesoReal !== undefined) {
                pesoInicial = serieEjecutada.pesoReal;
              } else if (pesoObjetivoBilbo !== null) {
                pesoInicial = pesoObjetivoBilbo;
              }
            } else {
              pesoInicial = serieEjecutada?.pesoReal;
            }
          } else {
            pesoInicial = serieEjecutada?.pesoReal;
          }

          return (
            <div key={numeroSerie} className="flex items-center gap-2">
              <div className="flex-1">
                <SerieInput
                  key={
                    numeroSerie === 1 && serie1KeyBilbo
                      ? `s1-${serie1KeyBilbo}`
                      : `s-${numeroSerie}-${ejercicioSeleccionadoId}`
                  }
                  numeroSerie={numeroSerie}
                  pesoInicial={pesoInicial}
                  repsInicial={serieEjecutada?.repeticiones}
                  onUpdate={(peso, reps) => handleSerieUpdate(numeroSerie, peso, reps)}
                  disabled={loading || (isSaved && !hasChanges && !isEditMode)}
                  hasUserInteracted={userInteracted || isEditMode}
                />
                {esMetodoBilboSerie1 && (esBilboDelDia || ejercicioBilbo) && (
                  <div className="mt-2 space-y-1">
                    {esBilboDelDia && !ejercicioBilbo && (
                      <p className="text-xs text-purple-400">Ejercicio Bilbo del día (configurá el método Bilbo)</p>
                    )}
                    {ejercicioBilbo && pesoObjetivoBilbo !== null && (
                      <p className="text-xs text-blue-300">
                        Peso objetivo hoy: <span className="font-bold">{pesoObjetivoBilbo} kg</span>
                      </p>
                    )}
                  </div>
                )}
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
          <Button variant="danger" size="lg" onClick={onDelete} disabled={loading} className="flex-shrink-0">
            Eliminar
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={loading || (isSaved && !hasChanges && !isEditMode) || !ejercicioSeleccionadoId}
          fullWidth
          size="lg"
          variant={isSaved && !hasChanges ? 'outline' : 'primary'}
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
          ) : hasChanges ? (
            'Guardar Cambios'
          ) : (
            'Guardar Ejercicio'
          )}
        </Button>
      </div>
    </Card>
  );
};
