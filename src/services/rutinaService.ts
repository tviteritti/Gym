import { supabase } from '../config/supabase';
import type { CreateRoutineRequest, Rutina, DiaDeRutina, EjercicioPlanificado, SeriePlanificada } from '../types';

const mapRutinaFromDB = (rutinaData: any): Rutina => {
  const nombresDias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Los datos ya vienen con todas las relaciones anidadas desde getAll/getActive
  const diasDeRutina: DiaDeRutina[] = ((rutinaData.dias_de_rutina as any[]) || []).map((dia) => {
    const ejerciciosPlanificados: EjercicioPlanificado[] = ((dia.ejercicios_planificados as any[]) || []).map((ejPlan) => {
      const seriesPlanificadas: SeriePlanificada[] = ((ejPlan.series_planificadas as any[]) || []).map((serie) => ({
        id: serie.id,
        numeroSerie: serie.numero_serie,
        pesoPlanificado: serie.peso_planificado ? parseFloat(serie.peso_planificado.toString()) : undefined,
      }));

      return {
        id: ejPlan.id,
        ejercicioId: ejPlan.ejercicio_id,
        ejercicioNombre: (ejPlan.ejercicios as any)?.nombre || '',
        orden: ejPlan.orden,
        seriesPlanificadas,
      };
    });

    return {
      id: dia.id,
      diaSemana: dia.dia_semana,
      diaSemanaNombre: nombresDias[dia.dia_semana] || '',
      ejerciciosPlanificados,
    };
  });

  return {
    id: rutinaData.id,
    nombre: rutinaData.nombre,
    usuarioId: rutinaData.usuario_id,
    activa: rutinaData.activa,
    fechaCreacion: rutinaData.fecha_creacion,
    diasDeRutina,
  };
};

export const rutinaService = {
  async create(data: CreateRoutineRequest): Promise<string> {
    // Primero desactivar todas las rutinas activas del usuario
    await supabase
      .from('rutinas')
      .update({ activa: false })
      .eq('usuario_id', data.usuarioId)
      .eq('activa', true);

    // Crear la rutina
    const { data: rutina, error: rutinaError } = await supabase
      .from('rutinas')
      .insert({
        nombre: data.nombre,
        usuario_id: data.usuarioId,
        activa: false, // Por defecto inactiva
      })
      .select('id')
      .single();

    if (rutinaError) {
      throw new Error(`Error al crear rutina: ${rutinaError.message}`);
    }

    // Crear días de rutina y sus ejercicios
    for (const dia of data.dias) {
      const { data: diaRutina, error: diaError } = await supabase
        .from('dias_de_rutina')
        .insert({
          rutina_id: rutina.id,
          dia_semana: dia.diaSemana,
        })
        .select('id')
        .single();

      if (diaError) {
        throw new Error(`Error al crear día de rutina: ${diaError.message}`);
      }

      // Crear ejercicios planificados para este día
      for (const ejercicio of dia.ejercicios) {
        const { data: ejPlan, error: ejPlanError } = await supabase
          .from('ejercicios_planificados')
          .insert({
            dia_de_rutina_id: diaRutina.id,
            ejercicio_id: ejercicio.ejercicioId,
            orden: ejercicio.orden,
          })
          .select('id')
          .single();

        if (ejPlanError) {
          throw new Error(`Error al crear ejercicio planificado: ${ejPlanError.message}`);
        }

        // Crear series planificadas
        if (ejercicio.series && ejercicio.series.length > 0) {
          const series = ejercicio.series.map((serie) => ({
            ejercicio_planificado_id: ejPlan.id,
            numero_serie: serie.numeroSerie,
            peso_planificado: serie.pesoPlanificado || null,
          }));

          const { error: seriesError } = await supabase
            .from('series_planificadas')
            .insert(series);

          if (seriesError) {
            throw new Error(`Error al crear series planificadas: ${seriesError.message}`);
          }
        }
      }
    }

    return rutina.id;
  },

  async activate(rutinaId: string, usuarioId: string): Promise<boolean> {
    // Desactivar todas las rutinas activas del usuario
    await supabase
      .from('rutinas')
      .update({ activa: false })
      .eq('usuario_id', usuarioId)
      .eq('activa', true);

    // Activar la rutina especificada
    const { error } = await supabase
      .from('rutinas')
      .update({ activa: true })
      .eq('id', rutinaId)
      .eq('usuario_id', usuarioId);

    if (error) {
      throw new Error(`Error al activar rutina: ${error.message}`);
    }

    return true;
  },

  async getActive(usuarioId: string): Promise<Rutina | null> {
    // Usar JOINs anidados para obtener toda la estructura en una sola petición
    const { data: rutinaData, error } = await supabase
      .from('rutinas')
      .select(`
        *,
        dias_de_rutina(
          *,
          ejercicios_planificados(
            *,
            ejercicios:ejercicio_id(id, nombre),
            series_planificadas(*)
          )
        )
      `)
      .eq('usuario_id', usuarioId)
      .eq('activa', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No se encontró ninguna rutina activa
        return null;
      }
      throw new Error(`Error al obtener rutina activa: ${error.message}`);
    }

    // Ordenar días de rutina por dia_semana
    if (rutinaData.dias_de_rutina) {
      rutinaData.dias_de_rutina.sort((a: any, b: any) => a.dia_semana - b.dia_semana);
      // Ordenar ejercicios planificados por orden
      rutinaData.dias_de_rutina.forEach((dia: any) => {
        if (dia.ejercicios_planificados) {
          dia.ejercicios_planificados.sort((a: any, b: any) => a.orden - b.orden);
          // Ordenar series planificadas por numero_serie
          dia.ejercicios_planificados.forEach((ej: any) => {
            if (ej.series_planificadas) {
              ej.series_planificadas.sort((a: any, b: any) => a.numero_serie - b.numero_serie);
            }
          });
        }
      });
    }

    return mapRutinaFromDB(rutinaData);
  },

  async getAll(usuarioId: string): Promise<Rutina[]> {
    // Usar JOINs anidados para obtener toda la estructura en una sola petición
    const { data: rutinasData, error } = await supabase
      .from('rutinas')
      .select(`
        *,
        dias_de_rutina(
          *,
          ejercicios_planificados(
            *,
            ejercicios:ejercicio_id(id, nombre),
            series_planificadas(*)
          )
        )
      `)
      .eq('usuario_id', usuarioId)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener rutinas: ${error.message}`);
    }

    // Ordenar datos anidados
    (rutinasData || []).forEach((rutina: any) => {
      if (rutina.dias_de_rutina) {
        rutina.dias_de_rutina.sort((a: any, b: any) => a.dia_semana - b.dia_semana);
        rutina.dias_de_rutina.forEach((dia: any) => {
          if (dia.ejercicios_planificados) {
            dia.ejercicios_planificados.sort((a: any, b: any) => a.orden - b.orden);
            dia.ejercicios_planificados.forEach((ej: any) => {
              if (ej.series_planificadas) {
                ej.series_planificadas.sort((a: any, b: any) => a.numero_serie - b.numero_serie);
              }
            });
          }
        });
      }
    });

    return (rutinasData || []).map(rutina => mapRutinaFromDB(rutina));
  },

  async update(rutinaId: string, data: CreateRoutineRequest): Promise<string> {
    // Actualizar nombre de la rutina
    const { error: rutinaError } = await supabase
      .from('rutinas')
      .update({ nombre: data.nombre })
      .eq('id', rutinaId)
      .eq('usuario_id', data.usuarioId);

    if (rutinaError) {
      throw new Error(`Error al actualizar rutina: ${rutinaError.message}`);
    }

    // Eliminar días de rutina existentes (esto eliminará en cascada ejercicios y series)
    const { error: deleteError } = await supabase
      .from('dias_de_rutina')
      .delete()
      .eq('rutina_id', rutinaId);

    if (deleteError) {
      throw new Error(`Error al eliminar días de rutina: ${deleteError.message}`);
    }

    // Crear los nuevos días de rutina (igual que en create)
    for (const dia of data.dias) {
      const { data: diaRutina, error: diaError } = await supabase
        .from('dias_de_rutina')
        .insert({
          rutina_id: rutinaId,
          dia_semana: dia.diaSemana,
        })
        .select('id')
        .single();

      if (diaError) {
        throw new Error(`Error al crear día de rutina: ${diaError.message}`);
      }

      for (const ejercicio of dia.ejercicios) {
        const { data: ejPlan, error: ejPlanError } = await supabase
          .from('ejercicios_planificados')
          .insert({
            dia_de_rutina_id: diaRutina.id,
            ejercicio_id: ejercicio.ejercicioId,
            orden: ejercicio.orden,
          })
          .select('id')
          .single();

        if (ejPlanError) {
          throw new Error(`Error al crear ejercicio planificado: ${ejPlanError.message}`);
        }

        if (ejercicio.series && ejercicio.series.length > 0) {
          const series = ejercicio.series.map((serie) => ({
            ejercicio_planificado_id: ejPlan.id,
            numero_serie: serie.numeroSerie,
            peso_planificado: serie.pesoPlanificado || null,
          }));

          const { error: seriesError } = await supabase
            .from('series_planificadas')
            .insert(series);

          if (seriesError) {
            throw new Error(`Error al crear series planificadas: ${seriesError.message}`);
          }
        }
      }
    }

    return rutinaId;
  },
};

