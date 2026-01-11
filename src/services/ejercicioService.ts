import { supabase } from '../config/supabase';
import type { CreateExerciseRequest, HistorialEjercicio, Ejercicio, EjecucionEjercicio, RecordPorEjercicio } from '../types';

export const ejercicioService = {
  async getAll(): Promise<Ejercicio[]> {
    // Obtener todos los ejercicios
    const { data: ejerciciosData, error: ejerciciosError } = await supabase
      .from('ejercicios')
      .select('*')
      .order('nombre', { ascending: true });

    if (ejerciciosError) {
      throw new Error(`Error al obtener ejercicios: ${ejerciciosError.message}`);
    }

    if (!ejerciciosData || ejerciciosData.length === 0) {
      return [];
    }

    // Obtener todos los músculos principales en una sola query usando .in()
    const musculoPrincipalIds = [...new Set(ejerciciosData.map((ej) => ej.musculo_principal_id))];
    const { data: musculosPrincipalesData, error: musculosPrincipalesError } = await supabase
      .from('musculos')
      .select('id, nombre')
      .in('id', musculoPrincipalIds);

    if (musculosPrincipalesError) {
      throw new Error(`Error al obtener músculos principales: ${musculosPrincipalesError.message}`);
    }

    // Crear un mapa de músculos principales
    const musculoPrincipalMap = new Map(
      (musculosPrincipalesData || []).map((m) => [m.id, m.nombre])
    );

    // Obtener todos los músculos secundarios en dos queries optimizadas
    const ejercicioIds = ejerciciosData.map((ej) => ej.id);
    const { data: musculosSecundariosData, error: musculosSecundariosError } = await supabase
      .from('ejercicio_musculos_secundarios')
      .select('ejercicio_id, musculo_id')
      .in('ejercicio_id', ejercicioIds);

    if (musculosSecundariosError) {
      throw new Error(`Error al obtener músculos secundarios: ${musculosSecundariosError.message}`);
    }

    // Obtener todos los nombres de músculos secundarios en una sola query
    let musculoNombresMap = new Map<string, string>();
    if (musculosSecundariosData && musculosSecundariosData.length > 0) {
      const musculoIds = [...new Set(musculosSecundariosData.map((ms) => ms.musculo_id))];
      const { data: musculosData, error: musculosError } = await supabase
        .from('musculos')
        .select('id, nombre')
        .in('id', musculoIds);

      if (musculosError) {
        throw new Error(`Error al obtener nombres de músculos secundarios: ${musculosError.message}`);
      }

      musculoNombresMap = new Map((musculosData || []).map((m) => [m.id, m.nombre]));
    }

    // Agrupar músculos secundarios por ejercicio
    const musculosSecundariosPorEjercicio = new Map<string, string[]>();
    (musculosSecundariosData || []).forEach((ms) => {
      const nombre = musculoNombresMap.get(ms.musculo_id);
      if (nombre) {
        const actual = musculosSecundariosPorEjercicio.get(ms.ejercicio_id) || [];
        actual.push(nombre);
        musculosSecundariosPorEjercicio.set(ms.ejercicio_id, actual);
      }
    });

    // Mapear los datos
    return ejerciciosData.map((ej) => {
      const musculoPrincipal = musculoPrincipalMap.get(ej.musculo_principal_id) || '';
      const musculosSecundarios = musculosSecundariosPorEjercicio.get(ej.id) || [];
      const musculosSecundariosNombres = musculosSecundarios.length > 0
        ? musculosSecundarios.join(', ')
        : undefined;

      return {
        id: ej.id,
        nombre: ej.nombre,
        musculoPrincipal,
        musculosSecundarios: musculosSecundariosNombres,
        descripcion: ej.descripcion || undefined,
        fechaCreacion: ej.fecha_creacion,
      };
    });
  },

  async create(data: CreateExerciseRequest): Promise<string> {
    // Insertar el ejercicio
    const { data: ejercicio, error: ejercicioError } = await supabase
      .from('ejercicios')
      .insert({
        nombre: data.nombre,
        musculo_principal_id: data.musculoPrincipalId,
        descripcion: data.descripcion,
      })
      .select('id')
      .single();

    if (ejercicioError) {
      throw new Error(`Error al crear ejercicio: ${ejercicioError.message}`);
    }

    // Insertar músculos secundarios si existen
    if (data.musculosSecundariosIds && data.musculosSecundariosIds.length > 0) {
      const musculosSecundarios = data.musculosSecundariosIds.map((musculoId) => ({
        ejercicio_id: ejercicio.id,
        musculo_id: musculoId,
      }));

      const { error: musculosError } = await supabase
        .from('ejercicio_musculos_secundarios')
        .insert(musculosSecundarios);

      if (musculosError) {
        throw new Error(`Error al agregar músculos secundarios: ${musculosError.message}`);
      }
    }

    return ejercicio.id;
  },

  async getHistorial(ejercicioId: string, usuarioId: string): Promise<HistorialEjercicio> {
    // Obtener el nombre del ejercicio
    const { data: ejercicio, error: ejercicioError } = await supabase
      .from('ejercicios')
      .select('nombre')
      .eq('id', ejercicioId)
      .single();

    if (ejercicioError) {
      throw new Error(`Error al obtener ejercicio: ${ejercicioError.message}`);
    }

    // Obtener todas las ejecuciones de este ejercicio para este usuario
    // Primero obtenemos los entrenamientos del usuario
    const { data: entrenamientos, error: entrenamientosError } = await supabase
      .from('entrenamientos')
      .select('id, fecha')
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false });

    if (entrenamientosError) {
      throw new Error(`Error al obtener entrenamientos: ${entrenamientosError.message}`);
    }

    const entrenamientoIds = (entrenamientos || []).map((e) => e.id);

    if (entrenamientoIds.length === 0) {
      return {
        ejercicioId,
        ejercicioNombre: ejercicio.nombre,
        ejecuciones: [],
        record: undefined,
      };
    }

    // Luego obtenemos los ejercicios ejecutados
    const { data: ejerciciosEjecutados, error: ejecucionesError } = await supabase
      .from('ejercicios_ejecutados')
      .select('id, entrenamiento_id')
      .eq('ejercicio_id', ejercicioId)
      .in('entrenamiento_id', entrenamientoIds);

    if (ejecucionesError) {
      throw new Error(`Error al obtener ejecuciones: ${ejecucionesError.message}`);
    }

    // Crear un mapa de entrenamiento_id a fecha para acceso rápido
    const entrenamientoFechaMap = new Map(
      (entrenamientos || []).map((e) => [e.id, e.fecha])
    );

    // Para cada ejercicio ejecutado, obtener las series
    const ejecuciones: EjecucionEjercicio[] = await Promise.all(
      (ejerciciosEjecutados || []).map(async (ej) => {
        const fecha = entrenamientoFechaMap.get(ej.entrenamiento_id) || '';
        const { data: series, error: seriesError } = await supabase
          .from('series_ejecutadas')
          .select('*')
          .eq('ejercicio_ejecutado_id', ej.id)
          .order('numero_serie', { ascending: true });

        if (seriesError) {
          throw new Error(`Error al obtener series: ${seriesError.message}`);
        }

        return {
          entrenamientoId: ej.entrenamiento_id,
          fecha,
          seriesEjecutadas: (series || []).map((s) => ({
            id: s.id,
            numeroSerie: s.numero_serie,
            pesoReal: s.peso_real ? parseFloat(s.peso_real.toString()) : undefined,
            repeticiones: s.repeticiones || undefined,
          })),
        };
      })
    );

    // Ordenar ejecuciones por fecha descendente
    ejecuciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Obtener el record del ejercicio
    const { data: record, error: recordError } = await supabase
      .from('records_por_ejercicio')
      .select('*')
      .eq('ejercicio_id', ejercicioId)
      .eq('usuario_id', usuarioId)
      .single();

    let recordObj: RecordPorEjercicio | undefined;
    if (!recordError && record) {
      recordObj = {
        id: record.id,
        maxPeso: parseFloat(record.max_peso.toString()),
        repsMax: record.reps_max,
        fecha: record.fecha,
      };
    }

    return {
      ejercicioId,
      ejercicioNombre: ejercicio.nombre,
      ejecuciones,
      record: recordObj,
    };
  },
};

