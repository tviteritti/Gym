import { supabase } from '../config/supabase';
import type {
  StartTrainingDayRequest,
  RegisterExerciseExecutionRequest,
  Entrenamiento,
  EjercicioEjecutado,
  SerieEjecutada,
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
    const fecha = new Date(data.fecha);
    const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay(); // Ajustar domingo (0) a 7

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

  async getRecordPersonal(usuarioId: string, ejercicioId: string): Promise<{peso: number, reps: number} | null> {
    // Primero obtener los IDs de ejercicios ejecutados para este ejercicio
    const { data: ejerciciosEjecutados, error: ejError } = await supabase
      .from('ejercicios_ejecutados')
      .select('id')
      .eq('ejercicio_id', ejercicioId);

    if (ejError) {
      throw new Error(`Error al obtener ejercicios ejecutados: ${ejError.message}`);
    }

    if (!ejerciciosEjecutados || ejerciciosEjecutados.length === 0) {
      return null;
    }

    const ejerciciosIds = ejerciciosEjecutados.map(ej => ej.id);

    const { data, error } = await supabase
      .from('series_ejecutadas')
      .select('peso_real, repeticiones')
      .in('ejercicio_ejecutado_id', ejerciciosIds)
      .not('peso_real', 'is', null)
      .not('repeticiones', 'is', null)
      .order('peso_real', { ascending: false })
      .order('repeticiones', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error al obtener record personal: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return {
      peso: parseFloat(data[0].peso_real.toString()),
      reps: data[0].repeticiones
    };
  },

  async getMaxRepsEnPesoCercano(usuarioId: string, ejercicioId: string, pesoObjetivo: number): Promise<{peso: number, reps: number} | null> {
    // Primero obtener los IDs de ejercicios ejecutados para este ejercicio
    const { data: ejerciciosEjecutados, error: ejError } = await supabase
      .from('ejercicios_ejecutados')
      .select('id')
      .eq('ejercicio_id', ejercicioId);

    if (ejError) {
      throw new Error(`Error al obtener ejercicios ejecutados: ${ejError.message}`);
    }

    if (!ejerciciosEjecutados || ejerciciosEjecutados.length === 0) {
      return null;
    }

    const ejerciciosIds = ejerciciosEjecutados.map(ej => ej.id);
    
    // Buscar la serie con más repeticiones en un peso cercano (±2.5kg)
    const pesoMin = pesoObjetivo - 2.5;
    const pesoMax = pesoObjetivo + 2.5;

    const { data, error } = await supabase
      .from('series_ejecutadas')
      .select('peso_real, repeticiones')
      .in('ejercicio_ejecutado_id', ejerciciosIds)
      .gte('peso_real', pesoMin)
      .lte('peso_real', pesoMax)
      .not('repeticiones', 'is', null)
      .order('repeticiones', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error al obtener max reps peso cercano: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return {
      peso: parseFloat(data[0].peso_real.toString()),
      reps: data[0].repeticiones
    };
  },

  async getMaxRepsEnPesoExacto(usuarioId: string, ejercicioId: string, pesoObjetivo: number): Promise<{peso: number, reps: number} | null> {
    // Primero obtener los IDs de ejercicios ejecutados para este ejercicio
    const { data: ejerciciosEjecutados, error: ejError } = await supabase
      .from('ejercicios_ejecutados')
      .select('id')
      .eq('ejercicio_id', ejercicioId);

    if (ejError) {
      throw new Error(`Error al obtener ejercicios ejecutados: ${ejError.message}`);
    }

    if (!ejerciciosEjecutados || ejerciciosEjecutados.length === 0) {
      return null;
    }

    const ejerciciosIds = ejerciciosEjecutados.map(ej => ej.id);

    // Buscar el máximo de repeticiones exactamente en el peso objetivo
    const { data, error } = await supabase
      .from('series_ejecutadas')
      .select('peso_real, repeticiones')
      .in('ejercicio_ejecutado_id', ejerciciosIds)
      .eq('peso_real', pesoObjetivo)
      .not('repeticiones', 'is', null)
      .order('repeticiones', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error al obtener max reps peso exacto: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return {
      peso: parseFloat(data[0].peso_real.toString()),
      reps: data[0].repeticiones
    };
  },
};

