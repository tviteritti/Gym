import { supabase } from '../config/supabase';
import { diaSemanaDesdeFechaIsoLocal } from '../utils/formatters';
import type {
  StartTrainingDayRequest,
  RegisterExerciseExecutionRequest,
  Entrenamiento,
  EjercicioEjecutado,
  SerieEjecutada,
  UltimaSesionEjercicio,
} from '../types';

const mapEntrenamientoFromDB = (entrenamientoData: any): Entrenamiento => {
  const nombresDias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Los datos ya vienen con todas las relaciones anidadas desde getToday
  const ejerciciosEjecutados: EjercicioEjecutado[] = ((entrenamientoData.ejercicios_ejecutados as any[]) || []).map((ejEjec) => {
    const seriesEjecutadas: SerieEjecutada[] = ((ejEjec.series_ejecutadas as any[]) || []).map((serie) => ({
      id: serie.id,
      numeroSerie: serie.numero_serie,
      pesoReal: serie.peso_real ? parseFloat(serie.peso_real.toString()) : undefined,
      repeticiones: serie.repeticiones || undefined,
    }));

    return {
      id: ejEjec.id,
      ejercicioId: ejEjec.ejercicio_id,
      ejercicioNombre: (ejEjec.ejercicios as any)?.nombre || '',
      seriesEjecutadas,
    };
  });

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
    // Verificar si ya existe un ejercicio ejecutado para este entrenamiento y ejercicio
    const { data: existingEjEjec } = await supabase
      .from('ejercicios_ejecutados')
      .select('id')
      .eq('entrenamiento_id', data.entrenamientoId)
      .eq('ejercicio_id', data.ejercicioId)
      .single();

    let ejercicioEjecutadoId: string;

    if (existingEjEjec) {
      ejercicioEjecutadoId = existingEjEjec.id;
      // Eliminar series existentes para reemplazarlas
      await supabase
        .from('series_ejecutadas')
        .delete()
        .eq('ejercicio_ejecutado_id', ejercicioEjecutadoId);
    } else {
      // Crear nuevo ejercicio ejecutado
      const { data: nuevoEjEjec, error: ejError } = await supabase
        .from('ejercicios_ejecutados')
        .insert({
          entrenamiento_id: data.entrenamientoId,
          ejercicio_id: data.ejercicioId,
        })
        .select('id')
        .single();

      if (ejError) {
        throw new Error(`Error al registrar ejercicio ejecutado: ${ejError.message}`);
      }

      ejercicioEjecutadoId = nuevoEjEjec.id;
    }

    // Insertar las series ejecutadas
    if (data.series && data.series.length > 0) {
      const series = data.series.map((serie) => ({
        ejercicio_ejecutado_id: ejercicioEjecutadoId,
        numero_serie: serie.numeroSerie,
        peso_real: serie.pesoReal || null,
        repeticiones: serie.repeticiones || null,
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

    // Ordenar series ejecutadas por numero_serie
    if (entrenamientoData.ejercicios_ejecutados) {
      entrenamientoData.ejercicios_ejecutados.forEach((ej: any) => {
        if (ej.series_ejecutadas) {
          ej.series_ejecutadas.sort((a: any, b: any) => a.numero_serie - b.numero_serie);
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
    ejercicioIds: string[]
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

    const { data: ejecutados, error: ejecutadosError } = await supabase
      .from('ejercicios_ejecutados')
      .select('id, ejercicio_id')
      .in('entrenamiento_id', entrenamientoIds)
      .in('ejercicio_id', unique);

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
   * Última sesión por ejercicio: mismo día de calendario local que `diaSemana` (1–7),
   * con fecha estrictamente anterior a `fechaAntesDe` (YYYY-MM-DD).
   * No usa la columna `dia_semana` de la fila (puede estar mal si se guardó con UTC).
   */
  async getUltimasSesionesMap(
    usuarioId: string,
    ejercicioIds: string[],
    fechaAntesDe: string,
    diaSemana: number
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

    const entFiltrados = (entrenamientos || []).filter(
      (e) => diaSemanaDesdeFechaIsoLocal(e.fecha as string) === diaSemana
    );
    const entById = new Map(entFiltrados.map((e) => [e.id, e.fecha as string]));
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
      .select('ejercicio_ejecutado_id, numero_serie, peso_real, repeticiones')
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
      });
      seriesPorEjecutado.set(s.ejercicio_ejecutado_id, list);
    }
    seriesPorEjecutado.forEach((list) => {
      list.sort((a, b) => a.numeroSerie - b.numeroSerie);
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

  async getRecordPersonal(usuarioId: string, ejercicioId: string): Promise<{peso: number, reps: number} | null> {
    const map = await this.getRecordsPersonalesMap(usuarioId, [ejercicioId]);
    return map[ejercicioId] ?? null;
  },

  /**
   * Máx. reps en rango ±2.5 kg y en peso exacto; una sola lectura de entrenamientos + series.
   */
  async getMaxRepsBilboBundle(
    usuarioId: string,
    ejercicioId: string,
    pesoObjetivo: number
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

    const { data: ejecutados, error: ejecutadosError } = await supabase
      .from('ejercicios_ejecutados')
      .select('id')
      .in('entrenamiento_id', entrenamientoIds)
      .eq('ejercicio_id', ejercicioId);

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
    pesoObjetivo: number
  ): Promise<{ peso: number; reps: number } | null> {
    const { cercano } = await this.getMaxRepsBilboBundle(usuarioId, ejercicioId, pesoObjetivo);
    return cercano;
  },

  async getMaxRepsEnPesoExacto(
    usuarioId: string,
    ejercicioId: string,
    pesoObjetivo: number
  ): Promise<{ peso: number; reps: number } | null> {
    const { exacto } = await this.getMaxRepsBilboBundle(usuarioId, ejercicioId, pesoObjetivo);
    return exacto;
  },
};

