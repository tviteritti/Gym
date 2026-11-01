import { supabase } from '../config/supabase';
import { esAgarre, ETIQUETA_AGARRE, type Agarre } from '../constants/agarres';
import { ETIQUETA_ACCESORIO, ETIQUETA_POSTURA } from '../constants/variantes';
import type {
  EjercicioMetodoBilbo,
  ProgresoMetodoBilbo,
  CreateEjercicioMetodoBilboRequest,
  UpdateEjercicioMetodoBilboRequest,
} from '../types';

export interface VarianteBilbo {
  accesorio?: string | null;
  postura?: string | null;
  altura?: string | null;
}

function conVariante<Q extends { eq: (c: string, v: string) => Q; is: (c: string, v: null) => Q }>(
  query: Q,
  extra?: VarianteBilbo,
  estricto = false
): Q {
  if (!extra) return query;
  for (const col of ['accesorio', 'postura', 'altura'] as const) {
    const val = extra[col];
    if (val) query = query.eq(col, val);
    else if (estricto) query = query.is(col, null);
  }
  return query;
}

function sufijoBilbo(item: { agarre?: string; accesorio?: string; postura?: string }, agarre?: Agarre): string | undefined {
  const partes: string[] = [];
  if (item.accesorio) partes.push(ETIQUETA_ACCESORIO[item.accesorio] ?? item.accesorio);
  if (item.postura) partes.push(ETIQUETA_POSTURA[item.postura] ?? item.postura);
  if (agarre) partes.push(ETIQUETA_AGARRE[agarre]);
  return partes.length ? partes.join(' · ') : undefined;
}

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

    return (data || []).map((item: any) => {
      const agarre: Agarre | undefined = esAgarre(item.agarre) ? item.agarre : undefined;
      const nombre = item.ejercicios?.nombre as string | undefined;
      const detalle = sufijoBilbo(item, agarre);
      return {
      id: item.id,
      ejercicioId: item.ejercicio_id,
      ejercicioNombre: nombre && detalle ? `${nombre} · ${detalle}` : nombre,
      usuarioId: item.usuario_id,
      pesoInicial: parseFloat(item.peso_inicial.toString()),
      incremento: parseFloat(item.incremento.toString()),
      fechaCreacion: item.fecha_creacion,
      agarre,
      accesorio: item.accesorio || undefined,
      postura: item.postura || undefined,
      altura: item.altura || undefined,
    };
    });
  },

  // Obtener configuración de un ejercicio específico del método Bilbo
  async getByEjercicio(
    usuarioId: string,
    ejercicioId: string,
    agarre?: string | null,
    extra?: VarianteBilbo
  ): Promise<EjercicioMetodoBilbo | null> {
    let query = supabase
      .from('ejercicios_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId);
    if (agarre) query = query.eq('agarre', agarre);
    query = conVariante(query, extra);
    const { data, error } = await query.maybeSingle();

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
      agarre: esAgarre(data.agarre) ? data.agarre : undefined,
      accesorio: data.accesorio || undefined,
      postura: data.postura || undefined,
      altura: data.altura || undefined,
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
  async update(
    usuarioId: string,
    ejercicioId: string,
    data: UpdateEjercicioMetodoBilboRequest,
    agarre?: string | null,
    extra?: VarianteBilbo
  ): Promise<void> {
    const updateData: any = {};
    if (data.pesoInicial !== undefined) {
      updateData.peso_inicial = data.pesoInicial;
    }
    if (data.incremento !== undefined) {
      updateData.incremento = data.incremento;
    }

    let query = supabase
      .from('ejercicios_metodo_bilbo')
      .update(updateData)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId);
    query = agarre ? query.eq('agarre', agarre) : query.is('agarre', null);
    query = conVariante(query, extra, true);
    const { error } = await query;

    if (error) {
      throw new Error(`Error al actualizar ejercicio del método Bilbo: ${error.message}`);
    }
  },

  // Eliminar configuración de ejercicio del método Bilbo
  async delete(usuarioId: string, ejercicioId: string, agarre?: string | null, extra?: VarianteBilbo): Promise<void> {
    let query = supabase
      .from('ejercicios_metodo_bilbo')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId);
    query = agarre ? query.eq('agarre', agarre) : query.is('agarre', null);
    query = conVariante(query, extra, true);
    const { error } = await query;

    if (error) {
      throw new Error(`Error al eliminar ejercicio del método Bilbo: ${error.message}`);
    }
  },

  // Obtener el último progreso de un ejercicio del método Bilbo
  async getUltimoProgreso(
    usuarioId: string,
    ejercicioId: string,
    agarre?: string | null,
    extra?: VarianteBilbo
  ): Promise<ProgresoMetodoBilbo | null> {
    let query = supabase
      .from('progreso_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId);
    if (agarre) query = query.eq('agarre', agarre);
    query = conVariante(query, extra);
    const { data, error } = await query
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
    fecha: string,
    agarre?: string | null,
    extra?: VarianteBilbo
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
        agarre: agarre || null,
        accesorio: extra?.accesorio || null,
        postura: extra?.postura || null,
        altura: extra?.altura || null,
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
    fecha: string,
    agarre?: string | null,
    extra?: VarianteBilbo
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
      fecha,
      agarre,
      extra
    );
  },

  /**
   * Reinicia el ciclo Bilbo sin borrar historial.
   * Inserta un registro con 0 reps en el último peso alcanzado (>=15),
   * de modo que el próximo peso vuelva a ser el peso inicial.
   */
  async reiniciarCiclo(usuarioId: string, ejercicioId: string, agarre?: string | null, extra?: VarianteBilbo): Promise<string> {
    const bilbo = await this.getByEjercicio(usuarioId, ejercicioId, agarre, extra);
    if (!bilbo) {
      throw new Error('El ejercicio no está configurado para el método Bilbo');
    }

    const ultimoProgreso = await this.getUltimoProgreso(usuarioId, ejercicioId, agarre, extra);
    if (!ultimoProgreso || ultimoProgreso.repeticiones < 15) {
      throw new Error('El próximo peso ya es el peso inicial; no hay nada que reiniciar');
    }

    const hoy = new Date().toISOString().slice(0, 10);
    return this.guardarProgresoHistorico(
      usuarioId,
      ejercicioId,
      ultimoProgreso.pesoActual,
      0,
      hoy,
      agarre,
      extra
    );
  },

  // Obtener historial de progreso de un ejercicio
  async getHistorialProgreso(
    usuarioId: string,
    ejercicioId: string,
    agarre?: string | null,
    extra?: VarianteBilbo
  ): Promise<ProgresoMetodoBilbo[]> {
    let query = supabase
      .from('progreso_metodo_bilbo')
      .select(`
        *,
        ejercicios:ejercicio_id(id, nombre)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ejercicio_id', ejercicioId);
    if (agarre) query = query.eq('agarre', agarre);
    query = conVariante(query, extra);
    const { data, error } = await query
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
