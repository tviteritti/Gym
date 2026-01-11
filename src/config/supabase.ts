import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. ' +
    'Por favor, configúralas en tu archivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Tipos de base de datos para TypeScript
export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          email: string;
          fecha_creacion: string;
        };
        Insert: {
          id: string;
          email: string;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          email?: string;
          fecha_creacion?: string;
        };
      };
      musculos: {
        Row: {
          id: string;
          nombre: string;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          fecha_creacion?: string;
        };
      };
      ejercicios: {
        Row: {
          id: string;
          nombre: string;
          musculo_principal_id: string;
          descripcion: string | null;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          musculo_principal_id: string;
          descripcion?: string | null;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          musculo_principal_id?: string;
          descripcion?: string | null;
          fecha_creacion?: string;
        };
      };
      ejercicio_musculos_secundarios: {
        Row: {
          ejercicio_id: string;
          musculo_id: string;
        };
        Insert: {
          ejercicio_id: string;
          musculo_id: string;
        };
        Update: {
          ejercicio_id?: string;
          musculo_id?: string;
        };
      };
      rutinas: {
        Row: {
          id: string;
          nombre: string;
          usuario_id: string;
          activa: boolean;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          usuario_id: string;
          activa?: boolean;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          usuario_id?: string;
          activa?: boolean;
          fecha_creacion?: string;
        };
      };
      dias_de_rutina: {
        Row: {
          id: string;
          rutina_id: string;
          dia_semana: number;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          rutina_id: string;
          dia_semana: number;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          rutina_id?: string;
          dia_semana?: number;
          fecha_creacion?: string;
        };
      };
      ejercicios_planificados: {
        Row: {
          id: string;
          dia_de_rutina_id: string;
          ejercicio_id: string;
          orden: number;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          dia_de_rutina_id: string;
          ejercicio_id: string;
          orden: number;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          dia_de_rutina_id?: string;
          ejercicio_id?: string;
          orden?: number;
          fecha_creacion?: string;
        };
      };
      series_planificadas: {
        Row: {
          id: string;
          ejercicio_planificado_id: string;
          numero_serie: number;
          peso_planificado: number | null;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          ejercicio_planificado_id: string;
          numero_serie: number;
          peso_planificado?: number | null;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          ejercicio_planificado_id?: string;
          numero_serie?: number;
          peso_planificado?: number | null;
          fecha_creacion?: string;
        };
      };
      entrenamientos: {
        Row: {
          id: string;
          usuario_id: string;
          fecha: string;
          dia_semana: number;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          fecha: string;
          dia_semana: number;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          fecha?: string;
          dia_semana?: number;
          fecha_creacion?: string;
        };
      };
      ejercicios_ejecutados: {
        Row: {
          id: string;
          entrenamiento_id: string;
          ejercicio_id: string;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          entrenamiento_id: string;
          ejercicio_id: string;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          entrenamiento_id?: string;
          ejercicio_id?: string;
          fecha_creacion?: string;
        };
      };
      series_ejecutadas: {
        Row: {
          id: string;
          ejercicio_ejecutado_id: string;
          numero_serie: number;
          peso_real: number | null;
          repeticiones: number | null;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          ejercicio_ejecutado_id: string;
          numero_serie: number;
          peso_real?: number | null;
          repeticiones?: number | null;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          ejercicio_ejecutado_id?: string;
          numero_serie?: number;
          peso_real?: number | null;
          repeticiones?: number | null;
          fecha_creacion?: string;
        };
      };
      records_por_ejercicio: {
        Row: {
          id: string;
          ejercicio_id: string;
          usuario_id: string;
          max_peso: number;
          reps_max: number;
          fecha: string;
          fecha_creacion: string;
        };
        Insert: {
          id?: string;
          ejercicio_id: string;
          usuario_id: string;
          max_peso: number;
          reps_max: number;
          fecha: string;
          fecha_creacion?: string;
        };
        Update: {
          id?: string;
          ejercicio_id?: string;
          usuario_id?: string;
          max_peso?: number;
          reps_max?: number;
          fecha?: string;
          fecha_creacion?: string;
        };
      };
    };
  };
};
