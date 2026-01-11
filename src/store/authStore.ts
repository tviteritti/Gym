import { create } from 'zustand';
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
import type { Usuario } from '../types';

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const session = await authService.getSession();
      if (session?.user) {
        const user = await authService.getUser();
        if (user) {
          // Obtener datos adicionales del usuario desde la tabla usuarios
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single();

          const usuario: Usuario = {
            id: user.id,
            email: user.email || '',
            fechaCreacion: usuarioData?.fecha_creacion || new Date().toISOString(),
          };

          set({
            usuario,
            token: session.access_token,
            isAuthenticated: true,
            isInitialized: true,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error inicializando autenticación:', error);
    }

    set({
      usuario: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
    });

    // Configurar listener para cambios en el estado de autenticación
    authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = await authService.getUser();
        if (user) {
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single();

          const usuario: Usuario = {
            id: user.id,
            email: user.email || '',
            fechaCreacion: usuarioData?.fecha_creacion || new Date().toISOString(),
          };

          set({
            usuario,
            token: session.access_token,
            isAuthenticated: true,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        set({
          usuario: null,
          token: null,
          isAuthenticated: false,
        });
      }
    });
  },

  login: async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    const user = await authService.getUser();
    
    if (user) {
      // Obtener datos adicionales del usuario
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      const usuario: Usuario = {
        id: user.id,
        email: user.email || email,
        fechaCreacion: usuarioData?.fecha_creacion || new Date().toISOString(),
      };

      set({
        token: response.token,
        usuario,
        isAuthenticated: true,
      });
    }
  },

  register: async (email: string, password: string) => {
    const response = await authService.register({ email, password });
    const user = await authService.getUser();
    
    if (user) {
      // Obtener datos adicionales del usuario (se crea automáticamente por el trigger)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      const usuario: Usuario = {
        id: user.id,
        email: user.email || email,
        fechaCreacion: usuarioData?.fecha_creacion || new Date().toISOString(),
      };

      set({
        token: response.token,
        usuario,
        isAuthenticated: true,
      });
    }
  },

  logout: async () => {
    await authService.logout();
    set({
      usuario: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));

