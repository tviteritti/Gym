import { supabase } from '../config/supabase';
import type {
  EjercicioMetodoBilbo,
  ProgresoMetodoBilbo,
  CreateEjercicioMetodoBilboRequest,
  UpdateEjercicioMetodoBilboRequest,
} from '../types';

export const bilboService = {
  // Obtener todos los ejercicios del método Bilbo para un usuario
  async getAll(usuarioId: string): Promise<EjercicioMetodoBilbo[]> {
    const { data, error } = await supabase
      .from('ejercicios_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener ejercicios del método Bilbo: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      ejercicioId: item.ejercicio_id,
      ejercicioNombre: item.ejercicios?.nombre,
      usuarioId: item.usuario_id,
      pesoInicial: parseFloat(item.peso_inicial.toString()),
      incremento: parseFloat(item.incremento.toString()),
      fechaCreacion: item.fecha_creacion,
    }));
  },

  // Obtener configuración de un ejercicio específico del método Bilbo
  async getByEjercicio(usuarioId: string, ejercicioId: string): Promise<EjercicioMetodoBilbo | null> {
    const { data, error } = await supabase
      .from('ejercicios_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al obtener ejercicio del método Bilbo: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      ejercicioId: data.ejercicio_id,
      ejercicioNombre: data.ejercicios?.nombre,
      usuarioId: data.usuario_id,
      pesoInicial: parseFloat(data.peso_inicial.toString()),
      incremento: parseFloat(data.incremento.toString()),
      fechaCreacion: data.fecha_creacion,
    };
  },

  // Crear configuración de ejercicio del método Bilbo
  async create(usuarioId: string, data: CreateEjercicioMetodoBilboRequest): Promise<string> {
    const { data: ejercicioBilbo, error } = await supabase
      .from('ejercicios_metodo_bilbo')
      .insert({
        ejercicio_id: data.ejercicioId,
        usuario_id: usuarioId,
        peso_inicial: data.pesoInicial,
        incremento: data.incremento,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error al crear ejercicio del método Bilbo: ${error.message}`);
    }

    return ejercicioBilbo.id;
  },

  // Actualizar configuración de ejercicio del método Bilbo
  async update(usuarioId: string, ejercicioId: string, data: UpdateEjercicioMetodoBilboRequest): Promise<void> {
    const updateData: any = {};
    if (data.pesoInicial !== undefined) {
      updateData.peso_inicial = data.pesoInicial;
    }
    if (data.incremento !== undefined) {
      updateData.incremento = data.incremento;
    }

    const { error } = await supabase
      .from('ejercicios_metodo_bilbo')
      .update(updateData)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId);

    if (error) {
      throw new Error(`Error al actualizar ejercicio del método Bilbo: ${error.message}`);
    }
  },

  // Eliminar configuración de ejercicio del método Bilbo
  async delete(usuarioId: string, ejercicioId: string): Promise<void> {
    const { error } = await supabase
      .from('ejercicios_metodo_bilbo')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId);

    if (error) {
      throw new Error(`Error al eliminar ejercicio del método Bilbo: ${error.message}`);
    }
  },

  // Obtener el último progreso de un ejercicio del método Bilbo
  async getUltimoProgreso(usuarioId: string, ejercicioId: string): Promise<ProgresoMetodoBilbo | null> {
    const { data, error } = await supabase
      .from('progreso_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId)
      .order('fecha', { ascending: false })
      .order('fecha_creacion', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al obtener último progreso: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      ejercicioId: data.ejercicio_id,
      ejercicioNombre: data.ejercicios?.nombre,
      usuarioId: data.usuario_id,
      entrenamientoId: data.entrenamiento_id,
      pesoActual: parseFloat(data.peso_actual.toString()),
      repeticiones: data.repeticiones,
      fecha: data.fecha,
      fechaCreacion: data.fecha_creacion,
    };
  },

  // Guardar progreso del método Bilbo
  async guardarProgreso(
    usuarioId: string,
    ejercicioId: string,
    entrenamientoId: string,
    pesoActual: number,
    repeticiones: number,
    fecha: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('progreso_metodo_bilbo')
      .insert({
        ejercicio_id: ejercicioId,
        usuario_id: usuarioId,
        entrenamiento_id: entrenamientoId,
        peso_actual: pesoActual,
        repeticiones: repeticiones,
        fecha: fecha,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error al guardar progreso: ${error.message}`);
    }

    return data.id;
  },

  // Guardar progreso histórico (crea entrenamiento si no existe)
  async guardarProgresoHistorico(
    usuarioId: string,
    ejercicioId: string,
    pesoActual: number,
    repeticiones: number,
    fecha: string
  ): Promise<string> {
    // Importar entrenamientoService dinámicamente para evitar dependencia circular
    const { entrenamientoService } = await import('./entrenamientoService');
    
    // Crear o obtener entrenamiento para esa fecha
    const entrenamientoId = await entrenamientoService.startTrainingDay({
      usuarioId,
      fecha,
    });

    // Guardar el progreso
    return this.guardarProgreso(
      usuarioId,
      ejercicioId,
      entrenamientoId,
      pesoActual,
      repeticiones,
      fecha
    );
  },

  // Obtener historial de progreso de un ejercicio
  async getHistorialProgreso(usuarioId: string, ejercicioId: string): Promise<ProgresoMetodoBilbo[]> {
    const { data, error } = await supabase
      .from('progreso_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId)
      .order('fecha', { ascending: false })
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener historial de progreso: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      ejercicioId: item.ejercicio_id,
      ejercicioNombre: item.ejercicios?.nombre,
      usuarioId: item.usuario_id,
      entrenamientoId: item.entrenamiento_id,
      pesoActual: parseFloat(item.peso_actual.toString()),
      repeticiones: item.repeticiones,
      fecha: item.fecha,
      fechaCreacion: item.fecha_creacion,
    }));
  },

  // Obtener todos los progresos de todos los ejercicios del método Bilbo para un usuario
  async getAllProgresos(usuarioId: string): Promise<ProgresoMetodoBilbo[]> {
    const { data, error } = await supabase
      .from('progreso_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false })
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener progresos: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      ejercicioId: item.ejercicio_id,
      ejercicioNombre: item.ejercicios?.nombre,
      usuarioId: item.usuario_id,
      entrenamientoId: item.entrenamiento_id,
      pesoActual: parseFloat(item.peso_actual.toString()),
      repeticiones: item.repeticiones,
      fecha: item.fecha,
      fechaCreacion: item.fecha_creacion,
    }));
  },
};
