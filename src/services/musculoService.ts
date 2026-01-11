import { supabase } from '../config/supabase';
import type { CreateMusculoRequest, Musculo } from '../types';

export const musculoService = {
  async getAll(): Promise<Musculo[]> {
    const { data, error } = await supabase
      .from('musculos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener músculos: ${error.message}`);
    }

    return (data || []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      fechaCreacion: m.fecha_creacion,
    }));
  },

  async create(data: CreateMusculoRequest): Promise<string> {
    const { data: musculo, error } = await supabase
      .from('musculos')
      .insert({
        nombre: data.nombre,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error al crear músculo: ${error.message}`);
    }

    return musculo.id;
  },
};

