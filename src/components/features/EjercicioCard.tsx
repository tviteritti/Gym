import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumberInput } from '../ui/NumberInput';
import { SerieInput } from './SerieInput';
import type {
  EjercicioPlanificado,
  SerieEjecutada,
  Ejercicio,
  EjercicioMetodoBilbo,
  ProgresoMetodoBilbo,
  UltimaSesionEjercicio,
  Maquina,
} from '../../types';
import { useEntrenamientoStore } from '../../store/entrenamientoStore';
import { bilboService } from '../../services/bilboService';
import { entrenamientoService } from '../../services/entrenamientoService';
import { getMuscleColorWithDefault } from '../../constants/muscleColors';
import { ExerciseSelect } from './ExerciseSelect';
import { VariantesCampos } from './VariantesCampos';
import { esAgarre } from '../../constants/agarres';
import { faltaVariante, grupoMaquinaDe } from '../../constants/variantes';
import { calcularProximoPesoBilbo } from '../../utils/bilbo';
import { formatFechaCortaEs, parseDecimal } from '../../utils/formatters';
import { TECNICAS_INTENSIDAD, seriesTecnica } from '../../utils/tecnicaIntensidad';

/** Filas de series complejas: tantas como las planificadas o las ya guardadas (la mayor). */
const construirComplejas = (guardadas: SerieEjecutada[], cantidadPlan: number): SerieEjecutada[] => {
  const maxGuardada = guardadas.reduce((m, s) => Math.max(m, s.numeroSerie), 0);
  const total = Math.max(cantidadPlan, maxGuardada);
  return Array.from({ length: total }, (_, i) => {
    const guardada = guardadas.find((s) => s.numeroSerie === i + 1);
    return {
      numeroSerie: i + 1,
      pesoReal: guardada?.pesoReal,
      repeticiones: guardada?.repeticiones,
      esCompleja: true,
    };
  });
};

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
  /** Fila ya guardada de esta aparición. */
  ejercicioEjecutadoId?: string;
  /** Slot de la rutina, para no mezclarlo con otra aparición del mismo ejercicio. */
  ejercicioPlanificadoId?: string;
  /** Posición del slot en el día. */
  ordenSlot?: number;
  /** Si el slot en la rutina está marcado como ejercicio Bilbo (checkbox en editor de rutina). */
  esBilboEnRutina?: boolean;
  /** null: Home cargando. Clave = id del slot, para no mezclar dos apariciones del mismo ejercicio. */
  ultimaSesionPorSlotId?: Record<string, UltimaSesionEjercicio | null> | null;
  maquinas?: Maquina[];
  maquinaIdInicial?: string;
  agarreInicial?: string;
  posturaInicial?: string;
  accesorioInicial?: string;
  alturaInicial?: string;
  unilateralInicial?: boolean;
  indiceAparicion?: number;
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
  ejercicioEjecutadoId,
  ejercicioPlanificadoId,
  ordenSlot,
  esBilboEnRutina = false,
  ultimaSesionPorSlotId,
  maquinas = [],
  maquinaIdInicial,
  agarreInicial,
  posturaInicial,
  accesorioInicial,
  alturaInicial,
  unilateralInicial,
  indiceAparicion = 0,
}: EjercicioCardProps) => {
  const [series, setSeries] = useState<SerieEjecutada[]>([]);
  const [complejas, setComplejas] = useState<SerieEjecutada[]>([]);
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
  const [maquinaId, setMaquinaId] = useState<string | undefined>(maquinaIdInicial);
  const [agarre, setAgarre] = useState<string | undefined>(esAgarre(agarreInicial) ? agarreInicial : undefined);
  const [postura, setPostura] = useState<string | undefined>(posturaInicial);
  const [accesorio, setAccesorio] = useState<string | undefined>(accesorioInicial);
  const [altura, setAltura] = useState<string | undefined>(alturaInicial);
  const [unilateral, setUnilateral] = useState<boolean | undefined>(unilateralInicial);
  const [faltaMaquina, setFaltaMaquina] = useState(false);
  const [errorVariante, setErrorVariante] = useState<string | null>(null);
  const [ultimaMaquina, setUltimaMaquina] = useState<UltimaSesionEjercicio | null | undefined>(undefined);

  const [maxRepsPesoDia, setMaxRepsPesoDia] = useState<{ peso: number; reps: number } | null>(null);
  const [maxRepsPanelAbierto, setMaxRepsPanelAbierto] = useState(false);
  const [maxRepsCargando, setMaxRepsCargando] = useState(false);
  const [pesoConsultaRecord, setPesoConsultaRecord] = useState<number>(0);

  const [ultimaSesionExtra, setUltimaSesionExtra] = useState<UltimaSesionEjercicio | null | undefined>(undefined);
  const ultimaSesionExtraFetchIdRef = useRef<string | null>(null);

  const { registerExercise, loading } = useEntrenamientoStore();

  const esBilboDelDia = esBilboEnRutina;

  const seriesNormalesProp = useMemo(
    () => seriesEjecutadas.filter((s) => !s.esCompleja),
    [seriesEjecutadas]
  );
  const complejasProp = useMemo(
    () => seriesEjecutadas.filter((s) => s.esCompleja),
    [seriesEjecutadas]
  );
  const seriesPropSig = useMemo(
    () =>
      seriesEjecutadas
        .map(
          (s) =>
            `${s.esCompleja ? 'c' : 'n'}${s.numeroSerie}:${s.pesoReal ?? ''}:${s.repeticiones ?? ''}`
        )
        .join('|'),
    [seriesEjecutadas]
  );
  const tecnica = ejercicio.tecnicaIntensidad;
  const tecnicaInfo = tecnica ? TECNICAS_INTENSIDAD[tecnica] : null;
  const cantidadComplejasPlan = seriesTecnica(ejercicio);
  const prefijoCompleja = tecnicaInfo?.prefijo ?? 'E';

  const pesoObjetivoBilbo = useMemo(() => {
    if (!esBilboDelDia || !ejercicioBilbo) return null;
    return calcularProximoPesoBilbo(ejercicioBilbo, ultimoProgreso);
  }, [esBilboDelDia, ejercicioBilbo, ultimoProgreso]);

  const esEjercicioDelSlot = ejercicioSeleccionadoId === ejercicio.ejercicioId;
  const ejercicioActual = ejerciciosDisponibles.find((e) => e.id === ejercicioSeleccionadoId);
  const grupoEquipo = grupoMaquinaDe(ejercicioActual, accesorio);
  const maquinasDelGrupo = grupoEquipo ? maquinas.filter((m) => m.grupo === grupoEquipo) : [];
  const bloqueado = loading || (isSaved && !hasChanges && !isEditMode);

  const resumenUltimaDesdeHome = !esEjercicioDelSlot
    ? undefined
    : ultimaSesionPorSlotId == null
      ? undefined
      : (ultimaSesionPorSlotId[ejercicio.id] ?? null);

  const resumenUltima =
    ultimaMaquina !== undefined
      ? ultimaMaquina
      : esEjercicioDelSlot
        ? resumenUltimaDesdeHome
        : ultimaSesionExtra;

  const pesoDefaultConsulta = useMemo(() => {
    if (esBilboDelDia && pesoObjetivoBilbo !== null) return pesoObjetivoBilbo;
    if (resumenUltima?.series?.length) {
      const s1 = resumenUltima.series.find(
        (s) => s.numeroSerie === 1 && !s.esCompleja && s.pesoReal != null
      );
      if (s1?.pesoReal != null) return s1.pesoReal;
      const conPeso = resumenUltima.series.find((s) => !s.esCompleja && s.pesoReal != null);
      if (conPeso?.pesoReal != null) return conPeso.pesoReal;
    }
    return undefined;
  }, [esBilboDelDia, pesoObjetivoBilbo, resumenUltima]);

  useEffect(() => {
    setUltimaSesionExtra(undefined);
    ultimaSesionExtraFetchIdRef.current = null;
    setRecordPanelAbierto(false);
    setRecordPersonal(null);
    setMaxRepsPanelAbierto(false);
    setMaxRepsPesoDia(null);
    setPesoConsultaRecord(0);
  }, [ejercicioSeleccionadoId, fecha]);

  useEffect(() => {
    if (esEjercicioDelSlot) {
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
          fecha
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
  }, [usuarioId, ejercicioSeleccionadoId, fecha, esEjercicioDelSlot]);

  useEffect(() => {
    if (ejercicioSeleccionadoId === ejercicio.ejercicioId) {
      setMaquinaId(maquinaIdInicial);
      setAgarre(esAgarre(agarreInicial) ? agarreInicial : undefined);
      setPostura(posturaInicial);
      setAccesorio(accesorioInicial);
      setAltura(alturaInicial);
      setUnilateral(unilateralInicial);
    } else {
      setMaquinaId(undefined);
      setAgarre(undefined);
      setPostura(undefined);
      setAccesorio(undefined);
      setAltura(undefined);
      setUnilateral(undefined);
    }
    setFaltaMaquina(false);
    setErrorVariante(null);
  }, [
    ejercicio.id,
    ejercicio.ejercicioId,
    ejercicioSeleccionadoId,
    maquinaIdInicial,
    agarreInicial,
    posturaInicial,
    accesorioInicial,
    alturaInicial,
    unilateralInicial,
  ]);

  useEffect(() => {
    const cambioMaquina = !!grupoEquipo && maquinaId !== maquinaIdInicial;
    const cambioAgarre = agarre !== agarreInicial;
    const cambioPostura = postura !== posturaInicial;
    const cambioAccesorio = accesorio !== accesorioInicial;
    const cambioAltura = altura !== alturaInicial;
    const cambioUni = unilateral !== unilateralInicial;
    const falta = faltaVariante(ejercicioActual, { agarre, postura, accesorio, altura, unilateral });
    if ((!cambioMaquina && !cambioAgarre && !cambioPostura && !cambioAccesorio && !cambioAltura && !cambioUni) || falta) {
      setUltimaMaquina(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const map = await entrenamientoService.getUltimasSesionesPorAparicion(
          usuarioId,
          [
            {
              slotId: ejercicio.id,
              ejercicioId: ejercicioSeleccionadoId,
              indice: indiceAparicion,
              ...(grupoEquipo && maquinaId ? { maquinaId } : {}),
              ...(agarre ? { agarre } : {}),
              ...(postura ? { postura } : {}),
              ...(accesorio ? { accesorio } : {}),
              ...(altura ? { altura } : {}),
              ...(unilateral != null ? { unilateral } : {}),
            },
          ],
          fecha
        );
        if (!cancelled) setUltimaMaquina(map[ejercicio.id] ?? null);
      } catch (e) {
        console.error('Última sesión (máquina):', e);
        if (!cancelled) setUltimaMaquina(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    grupoEquipo,
    maquinaId,
    maquinaIdInicial,
    agarre,
    agarreInicial,
    postura,
    posturaInicial,
    accesorio,
    accesorioInicial,
    altura,
    alturaInicial,
    unilateral,
    unilateralInicial,
    usuarioId,
    ejercicio.id,
    ejercicioSeleccionadoId,
    indiceAparicion,
    fecha,
  ]);

  const cargarRecordPersonalDebajo = useCallback(async () => {
    setRecordCargando(true);
    try {
      const record = await entrenamientoService.getRecordPersonal(
        usuarioId,
        ejercicioSeleccionadoId,
        grupoEquipo ? maquinaId : undefined,
        agarre,
        { postura, accesorio, altura, unilateral }
      );
      setRecordPersonal(record);
    } catch (error) {
      console.error('Error al cargar record personal:', error);
      setRecordPersonal(null);
    } finally {
      setRecordCargando(false);
    }
  }, [usuarioId, ejercicioSeleccionadoId, grupoEquipo, maquinaId, agarre, postura, accesorio, altura, unilateral]);

  const toggleRecordPanel = () => {
    if (!recordPanelAbierto) {
      setRecordPanelAbierto(true);
      void cargarRecordPersonalDebajo();
    } else {
      setRecordPanelAbierto(false);
    }
  };

  const cargarMaxRepsEnPeso = useCallback(
    async (peso: number) => {
      if (!(peso > 0)) {
        setMaxRepsPesoDia(null);
        return;
      }
      setMaxRepsCargando(true);
      try {
        const r = await entrenamientoService.getMaxRepsEnPesoExacto(
          usuarioId,
          ejercicioSeleccionadoId,
          peso,
          grupoEquipo ? maquinaId : undefined,
          agarre,
          { postura, accesorio, altura, unilateral }
        );
        setMaxRepsPesoDia(r);
      } catch (e) {
        console.error('Max reps peso:', e);
        setMaxRepsPesoDia(null);
      } finally {
        setMaxRepsCargando(false);
      }
    },
    [usuarioId, ejercicioSeleccionadoId, grupoEquipo, maquinaId, agarre, postura, accesorio, altura, unilateral]
  );

  const toggleMaxRepsPanel = () => {
    if (!maxRepsPanelAbierto) {
      const inicial = pesoDefaultConsulta ?? 0;
      setPesoConsultaRecord(inicial);
      setMaxRepsPanelAbierto(true);
      void cargarMaxRepsEnPeso(inicial);
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
      seriesNormalesProp.length > 0
        ? seriesNormalesProp
        : ejercicio.seriesPlanificadas.map((sp) => ({
            numeroSerie: sp.numeroSerie,
            pesoReal: sp.pesoPlanificado,
            repeticiones: undefined,
          }))
    );
    setComplejas(construirComplejas(complejasProp, cantidadComplejasPlan));
    setHasChanges(false);
    setMaquinaId(maquinaIdInicial);
    setAgarre(esAgarre(agarreInicial) ? agarreInicial : undefined);
    setPostura(posturaInicial);
    setAccesorio(accesorioInicial);
    setAltura(alturaInicial);
    setUnilateral(unilateralInicial);
    setFaltaMaquina(false);
    setErrorVariante(null);
  };

  useEffect(() => {
    setEjercicioSeleccionadoId(ejercicio.ejercicioId);
  }, [ejercicio.id, ejercicio.ejercicioId]);

  useEffect(() => {
    const nuevoEjercicio = ejerciciosDisponibles.find((e) => e.id === ejercicioSeleccionadoId);
    setEjercicioSeleccionado(nuevoEjercicio);
    if (nuevoEjercicio && ejercicioSeleccionadoId !== ejercicio.ejercicioId) {
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
        const extra = { accesorio, postura, altura };
        const bilbo = await bilboService.getByEjercicio(usuarioId, ejercicioSeleccionadoId, agarre, extra);
        setEjercicioBilbo(bilbo);
        if (bilbo) {
          const progreso = await bilboService.getUltimoProgreso(usuarioId, ejercicioSeleccionadoId, agarre, extra);
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
  }, [ejercicioSeleccionadoId, usuarioId, esBilboEnRutina, agarre, accesorio, postura, altura]);

  useEffect(() => {
    const nuevasComplejas = construirComplejas(complejasProp, cantidadComplejasPlan);
    setComplejas((prev) =>
      JSON.stringify(prev) === JSON.stringify(nuevasComplejas) ? prev : nuevasComplejas
    );

    if (seriesEjecutadas.length > 0) {
      const seriesJson = JSON.stringify(series);
      const nuevasSeriesJson = JSON.stringify(seriesNormalesProp);
      if (seriesJson !== nuevasSeriesJson) {
        setSeries(seriesNormalesProp);
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
  }, [ejercicio.id, ejercicio.ejercicioId, seriesPropSig, ejercicio.seriesPlanificadas.length, cantidadComplejasPlan]);

  useEffect(() => {
    if (!ejercicioBilbo || !esBilboDelDia) return;
    if (userInteracted || isEditMode) return;

    const target = calcularProximoPesoBilbo(ejercicioBilbo, ultimoProgreso);
    if (target === null) return;

    const s1FromProps = seriesEjecutadas.find((s) => s.numeroSerie === 1 && !s.esCompleja);
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

  const handleComplejaUpdate = useCallback(
    (numeroSerie: number, peso?: number, reps?: number) => {
      if (!userInteracted && !isEditMode && (isSaved || seriesEjecutadas.length > 0)) {
        return;
      }
      setComplejas((prev) =>
        prev.map((s) => (s.numeroSerie === numeroSerie ? { ...s, pesoReal: peso, repeticiones: reps } : s))
      );
      setHasChanges(true);
      setIsSaved(false);
    },
    [userInteracted, isEditMode, isSaved, seriesEjecutadas]
  );

  const handleAddCompleja = () => {
    setComplejas((prev) => [
      ...prev,
      { numeroSerie: prev.length + 1, pesoReal: undefined, repeticiones: undefined, esCompleja: true },
    ]);
    setHasChanges(true);
    setIsSaved(false);
  };

  const handleRemoveUltimaCompleja = () => {
    setComplejas((prev) => prev.slice(0, -1));
    setHasChanges(true);
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!ejercicioSeleccionadoId) return;
    const pedido = faltaVariante(ejercicioActual, { agarre, postura, accesorio, altura, unilateral });
    if (grupoEquipo && !maquinaId) {
      setFaltaMaquina(true);
      return;
    }
    if (pedido) {
      setErrorVariante(pedido);
      return;
    }
    setFaltaMaquina(false);
    setErrorVariante(null);
    const complejasConDatos = complejas.filter((s) => s.pesoReal != null || s.repeticiones != null);
    try {
      await registerExercise(
        usuarioId,
        fecha,
        ejercicioSeleccionadoId,
        [...series, ...complejasConDatos],
        {
          ejercicioEjecutadoId,
          ejercicioPlanificadoId,
          orden: ordenSlot,
          esAdicional: esEjercicioAdicional,
          maquinaId: grupoEquipo ? maquinaId ?? null : null,
          agarre: agarre ?? null,
          postura: postura ?? null,
          accesorio: accesorio ?? null,
          altura: altura ?? null,
          unilateral: unilateral ?? null,
        }
      );
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
            <ExerciseSelect
              ejercicios={ejerciciosDisponibles}
              value={ejercicioSeleccionadoId}
              onChange={setEjercicioSeleccionadoId}
              disabled={bloqueado}
              className="min-w-0 flex-1 mb-2"
            />
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
            <button
              type="button"
              title="Ver mejores repeticiones a un peso"
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
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-dark-text-muted">Orden: {ejercicio.orden}</p>
            {esEjercicioAdicional && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Ejercicio adicional</span>
            )}
            {ejercicioBilbo && esBilboDelDia && (
              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Método Bilbo</span>
            )}
            {tecnicaInfo && (
              <span
                className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded"
                title={tecnicaInfo.descripcion}
              >
                {tecnicaInfo.label} ×{cantidadComplejasPlan}
              </span>
            )}
          </div>
          <VariantesCampos
            ejercicio={ejercicioActual}
            agarre={agarre}
            postura={postura}
            accesorio={accesorio}
            altura={altura}
            unilateral={unilateral}
            disabled={bloqueado}
            error={errorVariante}
            onAgarre={(siguiente) => {
              if (siguiente === agarre) return;
              setAgarre(siguiente);
              setErrorVariante(null);
              setHasChanges(true);
              setIsSaved(false);
            }}
            onPostura={(siguiente) => {
              if (siguiente === postura) return;
              setPostura(siguiente);
              setErrorVariante(null);
              setHasChanges(true);
              setIsSaved(false);
            }}
            onAccesorio={(siguiente) => {
              if (siguiente === accesorio) return;
              setAccesorio(siguiente);
              if (!grupoMaquinaDe(ejercicioActual, siguiente)) setMaquinaId(undefined);
              setErrorVariante(null);
              setHasChanges(true);
              setIsSaved(false);
            }}
            onAltura={(siguiente) => {
              if (siguiente === altura) return;
              setAltura(siguiente);
              setErrorVariante(null);
              setHasChanges(true);
              setIsSaved(false);
            }}
            onUnilateral={(siguiente) => {
              if (siguiente === unilateral) return;
              setUnilateral(siguiente);
              setErrorVariante(null);
              setHasChanges(true);
              setIsSaved(false);
            }}
          />
          {maquinasDelGrupo.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide mb-1.5">
                Máquina
              </p>
              <div className="flex flex-wrap gap-1.5">
                {maquinasDelGrupo.map((m) => {
                  const activa = maquinaId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={bloqueado}
                      onClick={() => {
                        if (m.id === maquinaId) return;
                        setMaquinaId(m.id);
                        setFaltaMaquina(false);
                        setHasChanges(true);
                        setIsSaved(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-colors disabled:opacity-50 ${
                        activa
                          ? 'border-violet-400 bg-violet-500/25 text-violet-100'
                          : 'border-dark-border text-dark-text-muted hover:border-violet-400/60'
                      }`}
                    >
                      {m.nombre}
                    </button>
                  );
                })}
              </div>
              {faltaMaquina && (
                <p className="mt-1 text-xs text-red-400">Elegí la máquina para guardar.</p>
              )}
            </div>
          )}
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

      {maxRepsPanelAbierto && (
        <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-28">
              <NumberInput
                label="Peso (kg)"
                value={pesoConsultaRecord || ''}
                onChange={(e) => setPesoConsultaRecord(parseDecimal(e.target.value) ?? 0)}
                step={0.5}
                min={0}
                fullWidth
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void cargarMaxRepsEnPeso(pesoConsultaRecord)}
              disabled={maxRepsCargando || !(pesoConsultaRecord > 0)}
            >
              Consultar
            </Button>
          </div>
          {maxRepsCargando ? (
            <p className="text-sm text-emerald-200/80">Cargando…</p>
          ) : maxRepsPesoDia ? (
            <p className="text-sm text-emerald-300">
              Mejor registro a <span className="font-semibold">{maxRepsPesoDia.peso} kg</span>:{' '}
              <span className="font-bold text-emerald-200">{maxRepsPesoDia.reps} reps</span>
            </p>
          ) : pesoConsultaRecord > 0 ? (
            <p className="text-sm text-emerald-200/80">No hay series previas con ese peso exacto.</p>
          ) : (
            <p className="text-sm text-emerald-200/80">Ingresá un peso para consultar.</p>
          )}
        </div>
      )}

      <div className="mb-4 rounded-lg border border-dark-border/60 bg-dark-surface/40 px-3 py-2.5">
        <p className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide mb-1.5">
          Última vez
        </p>
        {esEjercicioDelSlot && ultimaSesionPorSlotId === null ? (
          <p className="text-sm text-dark-text-muted">Cargando historial…</p>
        ) : resumenUltima === undefined ? (
          <p className="text-sm text-dark-text-muted">Cargando…</p>
        ) : resumenUltima === null || resumenUltima.series.length === 0 ? (
          <p className="text-sm text-dark-text-muted">
            {accesorio || postura || altura || agarre
              ? 'Sin entrenamientos previos con esta variante.'
              : grupoEquipo && maquinaId
              ? 'Sin entrenamientos previos en esta máquina.'
              : 'Sin entrenamientos previos para este ejercicio.'}
          </p>
        ) : (
          <>
            <p className="text-sm text-dark-text mb-2">
              {formatFechaCortaEs(resumenUltima.fecha)}
              {resumenUltima.sinAgarre ? ' · sin agarre cargado' : ''}
              {resumenUltima.sinPostura ? ' · sin postura cargada' : ''}
              {resumenUltima.sinAccesorio ? ' · sin accesorio cargado' : ''}
              {resumenUltima.sinAltura ? ' · sin altura cargada' : ''}
              {resumenUltima.sinUnilateral ? ' · sin unilateral cargado' : ''}
              {resumenUltima.sinMaquina ? ' · sin máquina cargada' : ''}
            </p>
            <ul className="space-y-1 text-sm text-dark-text">
              {resumenUltima.series.map((s) => (
                <li
                  key={`${s.esCompleja ? 'c' : 'n'}-${s.numeroSerie}`}
                  className={`flex gap-2 ${s.esCompleja ? 'text-orange-300' : ''}`}
                >
                  <span className={s.esCompleja ? 'w-20 text-orange-300/80' : 'w-16 text-dark-text-muted'}>
                    {s.esCompleja ? `Extra ${prefijoCompleja}${s.numeroSerie}` : `Serie ${s.numeroSerie}`}
                  </span>
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

      {(tecnicaInfo || complejas.length > 0) && (
        <div className="mb-4 rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 space-y-3">
          <div>
            <p className="text-sm font-semibold text-orange-300">
              {tecnicaInfo ? tecnicaInfo.label : 'Series extra'}
              <span className="ml-2 text-xs font-normal text-orange-200/70">
                No cuentan como series normales
              </span>
            </p>
            {tecnicaInfo && <p className="text-xs text-dark-text-muted">{tecnicaInfo.descripcion}</p>}
          </div>
          {complejas.map((s, idx) => (
            <div key={s.numeroSerie} className="flex items-center gap-2">
              <div className="flex-1">
                <SerieInput
                  key={`c-${s.numeroSerie}-${ejercicioSeleccionadoId}`}
                  numeroSerie={s.numeroSerie}
                  etiqueta={`${prefijoCompleja}${s.numeroSerie}`}
                  esCompleja
                  pesoInicial={s.pesoReal}
                  repsInicial={s.repeticiones}
                  onUpdate={(peso, reps) => handleComplejaUpdate(s.numeroSerie, peso, reps)}
                  disabled={loading || (isSaved && !hasChanges && !isEditMode)}
                  hasUserInteracted={userInteracted || isEditMode}
                />
              </div>
              {idx === complejas.length - 1 && s.numeroSerie > cantidadComplejasPlan && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRemoveUltimaCompleja}
                  disabled={loading || (isSaved && !hasChanges && !isEditMode)}
                  className="flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCompleja}
            disabled={loading || (isSaved && !hasChanges && !isEditMode)}
            fullWidth
          >
            + Agregar serie extra
          </Button>
        </div>
      )}

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
