import { supabase } from '../config/supabase';
import type { RegisterRequest, LoginRequest, AuthResponse } from '../types';

export const authService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!authData.user || !authData.session) {
      throw new Error('No se pudo crear la sesión');
    }

    return {
      token: authData.session.access_token,
      usuarioId: authData.user.id,
      email: authData.user.email || data.email,
    };
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!authData.user || !authData.session) {
      throw new Error('No se pudo iniciar sesión');
    }

    return {
      token: authData.session.access_token,
      usuarioId: authData.user.id,
      email: authData.user.email || data.email,
    };
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return session;
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw new Error(error.message);
    }
    return user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  getToken(): string | null {
    // Supabase maneja los tokens automáticamente, pero podemos obtenerlos de la sesión
    return null; // Se obtiene desde la sesión de Supabase
  },

  getUsuario(): { id: string; email: string } | null {
    // Se obtiene desde la sesión de Supabase
    return null;
  },
};

