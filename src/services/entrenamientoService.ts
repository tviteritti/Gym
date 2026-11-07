import { supabase } from '../config/supabase';
import { diaSemanaDesdeFechaIsoLocal } from '../utils/formatters';
import { elegirEjecutadoPorAparicion, elegirEjecutadosRecientesPorAparicion, type AparicionEjercicio } from '../utils/ultimaSesion';
import type {
  StartTrainingDayRequest,
  RegisterExerciseExecutionRequest,
  Entrenamiento,
  EjercicioEjecutado,
  SerieEjecutada,
  SesionRecienteEjercicio,
  UltimaSesionEjercicio,
} from '../types';

interface FiltroVariante {
  postura?: string;
  accesorio?: string;
  altura?: string;
  unilateral?: boolean;
}

function aplicarVariante<T extends { eq: (col: string, val: unknown) => T }>(query: T, extra?: FiltroVariante): T {
  if (!extra) return query;
  if (extra.postura) query = query.eq('postura', extra.postura);
  if (extra.accesorio) query = query.eq('accesorio', extra.accesorio);
  if (extra.altura) query = query.eq('altura', extra.altura);
  if (extra.unilateral != null) query = query.eq('unilateral', extra.unilateral);
  return query;
}

const mapEntrenamientoFromDB = (entrenamientoData: any): Entrenamiento => {
  const nombresDias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Los datos ya vienen con todas las relaciones anidadas desde getToday
  const ejerciciosEjecutados: EjercicioEjecutado[] = ((entrenamientoData.ejercicios_ejecutados as any[]) || []).map((ejEjec) => {
    const seriesEjecutadas: SerieEjecutada[] = ((ejEjec.series_ejecutadas as any[]) || []).map((serie) => ({
      id: serie.id,
      numeroSerie: serie.numero_serie,
      pesoReal: serie.peso_real ? parseFloat(serie.peso_real.toString()) : undefined,
      repeticiones: serie.repeticiones || undefined,
      ...(serie.es_compleja ? { esCompleja: true } : {}),
    }));

    return {
      id: ejEjec.id,
      ejercicioId: ejEjec.ejercicio_id,
      ejercicioNombre: (ejEjec.ejercicios as any)?.nombre || '',
      ejercicioPlanificadoId: ejEjec.ejercicio_planificado_id || undefined,
      orden: ejEjec.orden ?? undefined,
      esAdicional: !!ejEjec.es_adicional,
      fechaCreacion: ejEjec.fecha_creacion || undefined,
      maquinaId: ejEjec.maquina_id || undefined,
      agarre: ejEjec.agarre || undefined,
      postura: ejEjec.postura || undefined,
      accesorio: ejEjec.accesorio || undefined,
      altura: ejEjec.altura || undefined,
      unilateral: ejEjec.unilateral ?? undefined,
      seriesEjecutadas,
    };
  });

  ejerciciosEjecutados.sort((a, b) =>
    (a.fechaCreacion || '').localeCompare(b.fechaCreacion || '')
  );

  return {
    id: entrenamientoData.id,
    usuarioId: entrenamientoData.usuario_id,
    fecha: entrenamientoData.fecha,
    diaSemana: entrenamientoData.dia_semana,
    diaSemanaNombre: nombresDias[entrenamientoData.dia_semana] || '',
    ejerciciosEjecutados,
  };
};

export const entrenamientoService = {
  async startTrainingDay(data: StartTrainingDayRequest): Promise<string> {
    const diaSemana = diaSemanaDesdeFechaIsoLocal(data.fecha);

    // Verificar si ya existe un entrenamiento para este día
    const { data: existingTraining } = await supabase
      .from('entrenamientos')
      .select('id')
      .eq('usuario_id', data.usuarioId)
      .eq('fecha', data.fecha)
      .single();

    if (existingTraining) {
      return existingTraining.id;
    }

    // Crear nuevo entrenamiento
    const { data: entrenamiento, error } = await supabase
      .from('entrenamientos')
      .insert({
        usuario_id: data.usuarioId,
        fecha: data.fecha,
        dia_semana: diaSemana,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error al iniciar entrenamiento: ${error.message}`);
    }

    return entrenamiento.id;
  },

  async registerExerciseExecution(
    data: RegisterExerciseExecutionRequest
  ): Promise<string> {
    const reemplazarSeries = async (ejercicioEjecutadoId: string) => {
      const { error } = await supabase
        .from('series_ejecutadas')
        .delete()
        .eq('ejercicio_ejecutado_id', ejercicioEjecutadoId);
      if (error) {
        throw new Error(`Error al actualizar series ejecutadas: ${error.message}`);
      }
    };

    let ejercicioEjecutadoId = data.ejercicioEjecutadoId;

    if (!ejercicioEjecutadoId && data.ejercicioPlanificadoId) {
      const { data: porSlot, error: slotError } = await supabase
        .from('ejercicios_ejecutados')
        .select('id')
        .eq('entrenamiento_id', data.entrenamientoId)
        .eq('ejercicio_planificado_id', data.ejercicioPlanificadoId)
        .maybeSingle();

      if (slotError) {
        throw new Error(`Error al buscar el ejercicio del día: ${slotError.message}`);
      }
      ejercicioEjecutadoId = porSlot?.id;
    }

    if (ejercicioEjecutadoId) {
      const patch: {
        ejercicio_id: string;
        ejercicio_planificado_id?: string;
        es_adicional?: boolean;
        orden?: number | null;
        maquina_id?: string | null;
        agarre?: string | null;
        postura?: string | null;
        accesorio?: string | null;
        altura?: string | null;
        unilateral?: boolean | null;
      } = { ejercicio_id: data.ejercicioId };
      if (data.ejercicioPlanificadoId) {
        patch.ejercicio_planificado_id = data.ejercicioPlanificadoId;
      }
      if (data.orden != null) {
        patch.orden = data.orden;
      }
      if (data.esAdicional !== undefined) {
        patch.es_adicional = data.esAdicional;
      }
      if (data.maquinaId !== undefined) {
        patch.maquina_id = data.maquinaId;
      }
      if (data.agarre !== undefined) {
        patch.agarre = data.agarre;
      }
      if (data.postura !== undefined) patch.postura = data.postura;
      if (data.accesorio !== undefined) patch.accesorio = data.accesorio;
      if (data.altura !== undefined) patch.altura = data.altura;
      if (data.unilateral !== undefined) patch.unilateral = data.unilateral;

      const { error: updateError } = await supabase
        .from('ejercicios_ejecutados')
        .update(patch)
        .eq('id', ejercicioEjecutadoId)
        .eq('entrenamiento_id', data.entrenamientoId);

      if (updateError) {
        throw new Error(`Error al actualizar ejercicio ejecutado: ${updateError.message}`);
      }

      await reemplazarSeries(ejercicioEjecutadoId);
    } else {
      const { data: nuevoEjEjec, error: ejError } = await supabase
        .from('ejercicios_ejecutados')
        .insert({
          entrenamiento_id: data.entrenamientoId,
          ejercicio_id: data.ejercicioId,
          ejercicio_planificado_id: data.ejercicioPlanificadoId ?? null,
          es_adicional: data.esAdicional ?? false,
          orden: data.orden ?? null,
          maquina_id: data.maquinaId ?? null,
          agarre: data.agarre ?? null,
          postura: data.postura ?? null,
          accesorio: data.accesorio ?? null,
          altura: data.altura ?? null,
          unilateral: data.unilateral ?? null,
        })
        .select('id')
        .single();

      if (ejError || !nuevoEjEjec) {
        throw new Error(`Error al registrar ejercicio ejecutado: ${ejError?.message ?? 'sin id'}`);
      }

      ejercicioEjecutadoId = nuevoEjEjec.id;
    }

    if (!ejercicioEjecutadoId) {
      throw new Error('Error al registrar ejercicio ejecutado: sin id');
    }

    // Insertar las series ejecutadas
    if (data.series && data.series.length > 0) {
      const series = data.series.map((serie) => ({
        ejercicio_ejecutado_id: ejercicioEjecutadoId,
        numero_serie: serie.numeroSerie,
        peso_real: serie.pesoReal || null,
        repeticiones: serie.repeticiones || null,
        es_compleja: serie.esCompleja ?? false,
      }));

      const { error: seriesError } = await supabase
        .from('series_ejecutadas')
        .insert(series);

      if (seriesError) {
        throw new Error(`Error al registrar series ejecutadas: ${seriesError.message}`);
      }
    }

    return ejercicioEjecutadoId;
  },

  async getToday(usuarioId: string): Promise<Entrenamiento | null> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    return this.getByDate(usuarioId, todayStr);
  },

  async getByDate(usuarioId: string, fecha: string): Promise<Entrenamiento | null> {
    // Usar JOINs anidados para obtener toda la estructura en una sola petición
    // Usar .maybeSingle() en lugar de .single() para evitar 406 cuando no hay resultados
    const { data: entrenamientoData, error } = await supabase
      .from('entrenamientos')
      .select(`
        *,
        ejercicios_ejecutados(
          *,
          ejercicios:ejercicio_id(id, nombre),
          series_ejecutadas(*)
        )
      `)
      .eq('usuario_id', usuarioId)
      .eq('fecha', fecha)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al obtener entrenamiento: ${error.message}`);
    }

    if (!entrenamientoData) {
      return null;
    }

    // Ordenar series ejecutadas: primero las normales, luego las complejas, cada grupo por numero_serie
    if (entrenamientoData.ejercicios_ejecutados) {
      entrenamientoData.ejercicios_ejecutados.forEach((ej: any) => {
        if (ej.series_ejecutadas) {
          ej.series_ejecutadas.sort(
            (a: any, b: any) =>
              Number(!!a.es_compleja) - Number(!!b.es_compleja) || a.numero_serie - b.numero_serie
          );
        }
      });
    }

    return mapEntrenamientoFromDB(entrenamientoData);
  },

  async deleteExerciseExecution(entrenamientoId: string, ejercicioEjecutadoId: string): Promise<void> {
    // Primero eliminar todas las series ejecutadas
    const { error: seriesError } = await supabase
      .from('series_ejecutadas')
      .delete()
      .eq('ejercicio_ejecutado_id', ejercicioEjecutadoId);

    if (seriesError) {
      throw new Error(`Error al eliminar series ejecutadas: ${seriesError.message}`);
    }

    // Luego eliminar el ejercicio ejecutado
    const { error: ejercicioError } = await supabase
      .from('ejercicios_ejecutados')
      .delete()
      .eq('id', ejercicioEjecutadoId)
      .eq('entrenamiento_id', entrenamientoId);

    if (ejercicioError) {
      throw new Error(`Error al eliminar ejercicio ejecutado: ${ejercicioError.message}`);
    }
  },

  /** Mejor serie por peso y luego por repeticiones (misma regla que el record en BD). */
  pickBetterSerie(
    a: { peso: number; reps: number },
    b: { peso: number; reps: number }
  ): { peso: number; reps: number } {
    if (a.peso > b.peso) return a;
    if (a.peso < b.peso) return b;
    return a.reps >= b.reps ? a : b;
  },

  /**
   * Récord personal por ejercicio en pocas queries (evita N+1 por tarjeta).
   */
  async getRecordsPersonalesMap(
    usuarioId: string,
    ejercicioIds: string[],
    maquinaId?: string,
    agarre?: string,
    extra?: FiltroVariante
  ): Promise<Record<string, { peso: number; reps: number } | null>> {
    const unique = [...new Set(ejercicioIds)];
    const out: Record<string, { peso: number; reps: number } | null> = {};
    unique.forEach((id) => {
      out[id] = null;
    });
    if (unique.length === 0) {
      return out;
    }

    const { data: entrenamientos, error: entrenamientosError } = await supabase
      .from('entrenamientos')
      .select('id')
      .eq('usuario_id', usuarioId);

    if (entrenamientosError) {
      throw new Error(`Error al obtener entrenamientos: ${entrenamientosError.message}`);
    }

    const entrenamientoIds = (entrenamientos || []).map((e) => e.id);
    if (entrenamientoIds.length === 0) {
      return out;
    }

    let ejecutadosQuery = supabase
      .from('ejercicios_ejecutados')
      .select('id, ejercicio_id')
      .in('entrenamiento_id', entrenamientoIds)
      .in('ejercicio_id', unique);
    if (maquinaId) ejecutadosQuery = ejecutadosQuery.eq('maquina_id', maquinaId);
    if (agarre) ejecutadosQuery = ejecutadosQuery.eq('agarre', agarre);
    ejecutadosQuery = aplicarVariante(ejecutadosQuery, extra);
    const { data: ejecutados, error: ejecutadosError } = await ejecutadosQuery;

    if (ejecutadosError) {
      throw new Error(`Error al obtener ejecuciones: ${ejecutadosError.message}`);
    }

    const ejecutadoIds = (ejecutados || []).map((e) => e.id);
    if (ejecutadoIds.length === 0) {
      return out;
    }

    const ejecutadoToEjercicio = new Map((ejecutados || []).map((e) => [e.id, e.ejercicio_id]));

    const { data: seriesRows, error: seriesError } = await supabase
      .from('series_ejecutadas')
      .select('ejercicio_ejecutado_id, peso_real, repeticiones')
      .in('ejercicio_ejecutado_id', ejecutadoIds)
      .eq('es_compleja', false)
      .not('peso_real', 'is', null)
      .not('repeticiones', 'is', null);

    if (seriesError) {
      throw new Error(`Error al obtener series: ${seriesError.message}`);
    }

    const bestByEjercicio = new Map<string, { peso: number; reps: number }>();

    for (const row of seriesRows || []) {
      const ejId = ejecutadoToEjercicio.get(row.ejercicio_ejecutado_id);
      if (!ejId) continue;
      const candidate = {
        peso: parseFloat(row.peso_real.toString()),
        reps: row.repeticiones as number,
      };
      const prev = bestByEjercicio.get(ejId);
      if (!prev) {
        bestByEjercicio.set(ejId, candidate);
      } else {
        bestByEjercicio.set(ejId, this.pickBetterSerie(prev, candidate));
      }
    }

    for (const ejId of unique) {
      const best = bestByEjercicio.get(ejId);
      if (best) out[ejId] = best;
    }
    return out;
  },

  /**
   * Última sesión por ejercicio con fecha estrictamente anterior a `fechaAntesDe` (YYYY-MM-DD),
   * sin filtrar por día de la semana.
   */
  async getUltimasSesionesMap(
    usuarioId: string,
    ejercicioIds: string[],
    fechaAntesDe: string
  ): Promise<Record<string, UltimaSesionEjercicio | null>> {
    const unique = [...new Set(ejercicioIds)];
    const out: Record<string, UltimaSesionEjercicio | null> = {};
    unique.forEach((id) => {
      out[id] = null;
    });
    if (unique.length === 0) {
      return out;
    }

    const { data: entrenamientos, error: entErr } = await supabase
      .from('entrenamientos')
      .select('id, fecha')
      .eq('usuario_id', usuarioId)
      .lt('fecha', fechaAntesDe);

    if (entErr) {
      throw new Error(`Error al obtener entrenamientos previos: ${entErr.message}`);
    }

    const entById = new Map((entrenamientos || []).map((e) => [e.id, e.fecha as string]));
    const entIds = [...entById.keys()];
    if (entIds.length === 0) {
      return out;
    }

    const { data: ejecutados, error: ejErr } = await supabase
      .from('ejercicios_ejecutados')
      .select('id, ejercicio_id, entrenamiento_id')
      .in('entrenamiento_id', entIds)
      .in('ejercicio_id', unique);

    if (ejErr) {
      throw new Error(`Error al obtener ejecuciones previas: ${ejErr.message}`);
    }

    type Row = { id: string; ejercicio_id: string; entrenamiento_id: string; fecha: string };
    const rows: Row[] = (ejecutados || [])
      .map((e) => ({
        id: e.id,
        ejercicio_id: e.ejercicio_id,
        entrenamiento_id: e.entrenamiento_id,
        fecha: entById.get(e.entrenamiento_id) || '',
      }))
      .filter((r) => r.fecha);

    rows.sort((a, b) => {
      const c = b.fecha.localeCompare(a.fecha);
      if (c !== 0) return c;
      return b.id.localeCompare(a.id);
    });

    const ejecutadoIdPorEjercicio = new Map<string, string>();
    for (const r of rows) {
      if (!ejecutadoIdPorEjercicio.has(r.ejercicio_id)) {
        ejecutadoIdPorEjercicio.set(r.ejercicio_id, r.id);
      }
    }

    const ejecutadoIds = [...new Set(ejecutadoIdPorEjercicio.values())];
    if (ejecutadoIds.length === 0) {
      return out;
    }

    const { data: seriesRows, error: sErr } = await supabase
      .from('series_ejecutadas')
      .select('ejercicio_ejecutado_id, numero_serie, peso_real, repeticiones, es_compleja')
      .in('ejercicio_ejecutado_id', ejecutadoIds);

    if (sErr) {
      throw new Error(`Error al obtener series de sesión previa: ${sErr.message}`);
    }

    const seriesPorEjecutado = new Map<string, UltimaSesionEjercicio['series']>();
    for (const s of seriesRows || []) {
      const list = seriesPorEjecutado.get(s.ejercicio_ejecutado_id) || [];
      list.push({
        numeroSerie: s.numero_serie,
        pesoReal: s.peso_real != null ? parseFloat(s.peso_real.toString()) : undefined,
        repeticiones: s.repeticiones ?? undefined,
        ...(s.es_compleja ? { esCompleja: true } : {}),
      });
      seriesPorEjecutado.set(s.ejercicio_ejecutado_id, list);
    }
    seriesPorEjecutado.forEach((list) => {
      list.sort(
        (a, b) => Number(!!a.esCompleja) - Number(!!b.esCompleja) || a.numeroSerie - b.numeroSerie
      );
    });

    ejecutadoIdPorEjercicio.forEach((ejecutadoId, ejId) => {
      const fecha = rows.find((r) => r.id === ejecutadoId)?.fecha || '';
      const series = seriesPorEjecutado.get(ejecutadoId) || [];
      if (series.length > 0) {
        out[ejId] = { fecha, series };
      }
    });

    return out;
  },

  /**
   * Última sesión de cada aparición del ejercicio (1ª, 2ª, … en el día),
   * con fecha estrictamente anterior a `fechaAntesDe`.
   */
  async getUltimasSesionesPorAparicion(
    usuarioId: string,
    apariciones: AparicionEjercicio[],
    fechaAntesDe: string
  ): Promise<Record<string, UltimaSesionEjercicio | null>> {
    const out: Record<string, UltimaSesionEjercicio | null> = {};
    for (const a of apariciones) out[a.slotId] = null;
    const ejercicioIds = [...new Set(apariciones.map((a) => a.ejercicioId))];
    if (ejercicioIds.length === 0) return out;

    const { data: entrenamientos, error: entErr } = await supabase
      .from('entrenamientos')
      .select('id, fecha')
      .eq('usuario_id', usuarioId)
      .lt('fecha', fechaAntesDe);

    if (entErr) {
      throw new Error(`Error al obtener entrenamientos previos: ${entErr.message}`);
    }

    const entById = new Map((entrenamientos || []).map((e) => [e.id, e.fecha as string]));
    const entIds = [...entById.keys()];
    if (entIds.length === 0) return out;

    const { data: ejecutados, error: ejErr } = await supabase
      .from('ejercicios_ejecutados')
      .select('id, ejercicio_id, entrenamiento_id, orden, fecha_creacion, maquina_id, agarre, postura, accesorio, altura, unilateral')
      .in('entrenamiento_id', entIds)
      .in('ejercicio_id', ejercicioIds);

    if (ejErr) {
      throw new Error(`Error al obtener ejecuciones previas: ${ejErr.message}`);
    }

    const elegidoPorSlot = elegirEjecutadoPorAparicion(
      (ejecutados || [])
        .map((e) => ({
          id: e.id,
          ejercicioId: e.ejercicio_id,
          fecha: entById.get(e.entrenamiento_id) || '',
          orden: e.orden ?? null,
          fechaCreacion: e.fecha_creacion || '',
          maquinaId: e.maquina_id || null,
          agarre: e.agarre || null,
          postura: e.postura || null,
          accesorio: e.accesorio || null,
          altura: e.altura || null,
          unilateral: e.unilateral ?? null,
        }))
        .filter((r) => r.fecha),
      apariciones
    );

    const ejecutadoIds = [...new Set(Object.values(elegidoPorSlot).filter((id): id is string => !!id))];
    if (ejecutadoIds.length === 0) return out;

    const { data: seriesRows, error: sErr } = await supabase
      .from('series_ejecutadas')
      .select('ejercicio_ejecutado_id, numero_serie, peso_real, repeticiones, es_compleja')
      .in('ejercicio_ejecutado_id', ejecutadoIds);

    if (sErr) {
      throw new Error(`Error al obtener series de sesión previa: ${sErr.message}`);
    }

    const seriesPorEjecutado = new Map<string, UltimaSesionEjercicio['series']>();
    for (const s of seriesRows || []) {
      const list = seriesPorEjecutado.get(s.ejercicio_ejecutado_id) || [];
      list.push({
        numeroSerie: s.numero_serie,
        pesoReal: s.peso_real != null ? parseFloat(s.peso_real.toString()) : undefined,
        repeticiones: s.repeticiones ?? undefined,
        ...(s.es_compleja ? { esCompleja: true } : {}),
      });
      seriesPorEjecutado.set(s.ejercicio_ejecutado_id, list);
    }
    seriesPorEjecutado.forEach((list) => {
      list.sort(
        (a, b) => Number(!!a.esCompleja) - Number(!!b.esCompleja) || a.numeroSerie - b.numeroSerie
      );
    });

    const fechaPorEjecutado = new Map(
      (ejecutados || []).map((e) => [e.id, entById.get(e.entrenamiento_id) || ''])
    );
    const maquinaPorEjecutado = new Map(
      (ejecutados || []).map((e) => [e.id, e.maquina_id || null])
    );
    const agarrePorEjecutado = new Map(
      (ejecutados || []).map((e) => [e.id, e.agarre || null])
    );
    const posturaPorEjecutado = new Map((ejecutados || []).map((e) => [e.id, e.postura || null]));
    const accesorioPorEjecutado = new Map((ejecutados || []).map((e) => [e.id, e.accesorio || null]));
    const alturaPorEjecutado = new Map((ejecutados || []).map((e) => [e.id, e.altura || null]));
    const unilateralPorEjecutado = new Map((ejecutados || []).map((e) => [e.id, e.unilateral ?? null]));
    const maquinaPedida = new Map(apariciones.map((a) => [a.slotId, a.maquinaId]));
    const agarrePedido = new Map(apariciones.map((a) => [a.slotId, a.agarre]));
    const posturaPedida = new Map(apariciones.map((a) => [a.slotId, a.postura]));
    const accesorioPedido = new Map(apariciones.map((a) => [a.slotId, a.accesorio]));
    const alturaPedida = new Map(apariciones.map((a) => [a.slotId, a.altura]));
    const unilateralPedido = new Map(apariciones.map((a) => [a.slotId, a.unilateral]));

    for (const [slotId, ejecutadoId] of Object.entries(elegidoPorSlot)) {
      if (!ejecutadoId) continue;
      const series = seriesPorEjecutado.get(ejecutadoId) || [];
      if (series.length > 0) {
        const pidioMaquina = !!maquinaPedida.get(slotId);
        const sinMaquina = pidioMaquina && !maquinaPorEjecutado.get(ejecutadoId);
        const pidioAgarre = !!agarrePedido.get(slotId);
        const sinAgarre = pidioAgarre && !agarrePorEjecutado.get(ejecutadoId);
        const sinPostura = !!posturaPedida.get(slotId) && !posturaPorEjecutado.get(ejecutadoId);
        const sinAccesorio = !!accesorioPedido.get(slotId) && !accesorioPorEjecutado.get(ejecutadoId);
        const sinAltura = !!alturaPedida.get(slotId) && !alturaPorEjecutado.get(ejecutadoId);
        const pidioUni = unilateralPedido.get(slotId);
        const sinUnilateral = pidioUni != null && unilateralPorEjecutado.get(ejecutadoId) == null;
        out[slotId] = {
          fecha: fechaPorEjecutado.get(ejecutadoId) || '',
          series,
          ...(sinMaquina ? { sinMaquina: true } : {}),
          ...(sinAgarre ? { sinAgarre: true } : {}),
          ...(sinPostura ? { sinPostura: true } : {}),
          ...(sinAccesorio ? { sinAccesorio: true } : {}),
          ...(sinAltura ? { sinAltura: true } : {}),
          ...(sinUnilateral ? { sinUnilateral: true } : {}),
        };
      }
    }

    return out;
  },

  /**
   * Últimas `cantidad` sesiones de cada aparición (más reciente primero),
   * con la misma variante (agarre, postura, accesorio, altura, unilateral).
   */
  async getSesionesRecientesPorAparicion(
    usuarioId: string,
    apariciones: AparicionEjercicio[],
    cantidad: number
  ): Promise<Record<string, SesionRecienteEjercicio[]>> {
    const out: Record<string, SesionRecienteEjercicio[]> = {};
    for (const a of apariciones) out[a.slotId] = [];
    const ejercicioIds = [...new Set(apariciones.map((a) => a.ejercicioId))];
    if (ejercicioIds.length === 0 || cantidad <= 0) return out;

    type SerieRow = {
      numero_serie: number;
      peso_real: number | string | null;
      repeticiones: number | null;
      es_compleja: boolean | null;
    };
    type EjecutadoRow = {
      id: string;
      ejercicio_id: string;
      orden: number | null;
      fecha_creacion: string | null;
      maquina_id: string | null;
      agarre: string | null;
      postura: string | null;
      accesorio: string | null;
      altura: string | null;
      unilateral: boolean | null;
      entrenamientos: { fecha: string } | { fecha: string }[] | null;
      series_ejecutadas: SerieRow[] | null;
    };

    const pageSize = 500;
    const ejecutados: EjecutadoRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('ejercicios_ejecutados')
        .select(`
          id,
          ejercicio_id,
          orden,
          fecha_creacion,
          maquina_id,
          agarre,
          postura,
          accesorio,
          altura,
          unilateral,
          entrenamientos!inner(fecha, usuario_id),
          series_ejecutadas(numero_serie, peso_real, repeticiones, es_compleja)
        `)
        .eq('entrenamientos.usuario_id', usuarioId)
        .in('ejercicio_id', ejercicioIds)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Error al obtener sesiones para exportar: ${error.message}`);
      }
      const page = (data || []) as EjecutadoRow[];
      ejecutados.push(...page);
      if (page.length < pageSize) break;
    }

    const fechaDe = (row: EjecutadoRow): string => {
      const ent = row.entrenamientos;
      if (Array.isArray(ent)) return ent[0]?.fecha || '';
      return ent?.fecha || '';
    };

    const previos = ejecutados
      .map((e) => ({
        id: e.id,
        ejercicioId: e.ejercicio_id,
        fecha: fechaDe(e),
        orden: e.orden ?? null,
        fechaCreacion: e.fecha_creacion || '',
        maquinaId: e.maquina_id || null,
        agarre: e.agarre || null,
        postura: e.postura || null,
        accesorio: e.accesorio || null,
        altura: e.altura || null,
        unilateral: e.unilateral ?? null,
      }))
      .filter((r) => r.fecha);

    const idsPorSlot = elegirEjecutadosRecientesPorAparicion(previos, apariciones, cantidad);
    const porId = new Map(ejecutados.map((e) => [e.id, e]));

    for (const [slotId, ids] of Object.entries(idsPorSlot)) {
      out[slotId] = ids.flatMap((id) => {
        const row = porId.get(id);
        if (!row) return [];
        const series = (row.series_ejecutadas || [])
          .map((s) => ({
            numeroSerie: s.numero_serie,
            pesoReal: s.peso_real != null ? parseFloat(s.peso_real.toString()) : undefined,
            repeticiones: s.repeticiones ?? undefined,
            ...(s.es_compleja ? { esCompleja: true } : {}),
          }))
          .sort(
            (a, b) => Number(!!a.esCompleja) - Number(!!b.esCompleja) || a.numeroSerie - b.numeroSerie
          );
        if (series.length === 0) return [];
        return [{
          fecha: fechaDe(row),
          ...(row.maquina_id ? { maquinaId: row.maquina_id } : {}),
          series,
        }];
      });
    }

    return out;
  },

  async getRecordPersonal(
    usuarioId: string,
    ejercicioId: string,
    maquinaId?: string,
    agarre?: string,
    extra?: FiltroVariante
  ): Promise<{peso: number, reps: number} | null> {
    const map = await this.getRecordsPersonalesMap(usuarioId, [ejercicioId], maquinaId, agarre, extra);
    return map[ejercicioId] ?? null;
  },

  /**
   * Máx. reps en rango ±2.5 kg y en peso exacto; una sola lectura de entrenamientos + series.
   */
  async getMaxRepsBilboBundle(
    usuarioId: string,
    ejercicioId: string,
    pesoObjetivo: number,
    maquinaId?: string,
    agarre?: string,
    extra?: FiltroVariante
  ): Promise<{
    cercano: { peso: number; reps: number } | null;
    exacto: { peso: number; reps: number } | null;
  }> {
    const pesoMin = pesoObjetivo - 2.5;
    const pesoMax = pesoObjetivo + 2.5;

    const { data: entrenamientos, error: entrenamientosError } = await supabase
      .from('entrenamientos')
      .select('id')
      .eq('usuario_id', usuarioId);

    if (entrenamientosError) {
      throw new Error(`Error al obtener entrenamientos: ${entrenamientosError.message}`);
    }

    if (!entrenamientos || entrenamientos.length === 0) {
      return { cercano: null, exacto: null };
    }

    const entrenamientoIds = entrenamientos.map((e) => e.id);

    let ejecutadosQuery = supabase
      .from('ejercicios_ejecutados')
      .select('id')
      .in('entrenamiento_id', entrenamientoIds)
      .eq('ejercicio_id', ejercicioId);
    if (maquinaId) ejecutadosQuery = ejecutadosQuery.eq('maquina_id', maquinaId);
    if (agarre) ejecutadosQuery = ejecutadosQuery.eq('agarre', agarre);
    ejecutadosQuery = aplicarVariante(ejecutadosQuery, extra);
    const { data: ejecutados, error: ejecutadosError } = await ejecutadosQuery;

    if (ejecutadosError) {
      throw new Error(`Error al obtener ejecuciones: ${ejecutadosError.message}`);
    }

    const ejecutadoIds = (ejecutados || []).map((e) => e.id);
    if (ejecutadoIds.length === 0) {
      return { cercano: null, exacto: null };
    }

    const { data: rows, error } = await supabase
      .from('series_ejecutadas')
      .select('peso_real, repeticiones')
      .in('ejercicio_ejecutado_id', ejecutadoIds)
      .eq('es_compleja', false)
      .gte('peso_real', pesoMin)
      .lte('peso_real', pesoMax)
      .not('repeticiones', 'is', null);

    if (error) {
      throw new Error(`Error al obtener series para Bilbo: ${error.message}`);
    }

    let bestCercano: { peso: number; reps: number } | null = null;
    let bestExacto: { peso: number; reps: number } | null = null;

    for (const row of rows || []) {
      const peso = parseFloat(row.peso_real.toString());
      const reps = row.repeticiones as number;
      const cand = { peso, reps };

      if (!bestCercano || reps > bestCercano.reps) {
        bestCercano = cand;
      } else if (bestCercano && reps === bestCercano.reps && peso > bestCercano.peso) {
        bestCercano = cand;
      }

      if (Math.abs(peso - pesoObjetivo) < 0.005) {
        if (!bestExacto || reps > bestExacto.reps) {
          bestExacto = cand;
        } else if (bestExacto && reps === bestExacto.reps) {
          bestExacto = cand;
        }
      }
    }

    return { cercano: bestCercano, exacto: bestExacto };
  },

  async getMaxRepsEnPesoCercano(
    usuarioId: string,
    ejercicioId: string,
    pesoObjetivo: number,
    maquinaId?: string,
    agarre?: string,
    extra?: FiltroVariante
  ): Promise<{ peso: number; reps: number } | null> {
    const { cercano } = await this.getMaxRepsBilboBundle(usuarioId, ejercicioId, pesoObjetivo, maquinaId, agarre, extra);
    return cercano;
  },

  async getMaxRepsEnPesoExacto(
    usuarioId: string,
    ejercicioId: string,
    pesoObjetivo: number,
    maquinaId?: string,
    agarre?: string,
    extra?: FiltroVariante
  ): Promise<{ peso: number; reps: number } | null> {
    const { exacto } = await this.getMaxRepsBilboBundle(usuarioId, ejercicioId, pesoObjetivo, maquinaId, agarre, extra);
    return exacto;
  },
};

