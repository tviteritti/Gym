import { create } from 'zustand';
import { entrenamientoService } from '../services/entrenamientoService';
import type { Entrenamiento, EjercicioEjecutado, SerieEjecutada } from '../types';

interface EntrenamientoState {
  entrenamiento: Entrenamiento | null;
  loading: boolean;
  error: string | null;
  startTrainingDay: (usuarioId: string, fecha: string) => Promise<void>;
  registerExercise: (
    usuarioId: string,
    fecha: string,
    ejercicioId: string,
    series: SerieEjecutada[]
  ) => Promise<void>;
  loadTodayTraining: (usuarioId: string) => Promise<void>;
  loadTrainingByDate: (usuarioId: string, fecha: string) => Promise<void>;
  updateSerie: (
    ejercicioId: string,
    numeroSerie: number,
    pesoReal?: number,
    repeticiones?: number
  ) => void;
  clearEntrenamiento: () => void;
}

export const useEntrenamientoStore = create<EntrenamientoState>((set, get) => ({
  entrenamiento: null,
  loading: false,
  error: null,

  startTrainingDay: async (usuarioId: string, fecha: string) => {
    set({ loading: true, error: null });
    try {
      const entrenamientoId = await entrenamientoService.startTrainingDay({
        usuarioId,
        fecha,
      });
      // Limpiar entrenamientos cancelados antiguos (más de 7 días)
      const canceledTrainings = JSON.parse(
        localStorage.getItem('canceledTrainings') || '[]'
      ) as string[];
      // Por ahora, simplemente limpiar todos los cancelados cuando se inicia uno nuevo
      // ya que no tenemos información de fecha de cancelación
      localStorage.removeItem('canceledTrainings');
      // Recargar el entrenamiento de la fecha que se inició
      const entrenamiento = await entrenamientoService.getByDate(usuarioId, fecha);
      // Verificar si el entrenamiento fue cancelado
      if (entrenamiento) {
        const canceledTrainingsCheck = JSON.parse(
          localStorage.getItem('canceledTrainings') || '[]'
        ) as string[];
        if (!canceledTrainingsCheck.includes(entrenamiento.id)) {
          set({ entrenamiento });
        } else {
          set({ entrenamiento: null });
        }
      } else {
        set({ entrenamiento: null });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al iniciar entrenamiento',
      });
    } finally {
      set({ loading: false });
    }
  },

  registerExercise: async (
    usuarioId: string,
    fecha: string,
    ejercicioId: string,
    series: SerieEjecutada[]
  ) => {
    set({ loading: true, error: null });
    try {
      // 1. Asegurarnos de que existe un entrenamiento para esa fecha
      const entrenamientoId = await entrenamientoService.startTrainingDay({
        usuarioId,
        fecha,
      });

      // 2. Registrar la ejecución del ejercicio
      await entrenamientoService.registerExerciseExecution({
        entrenamientoId,
        ejercicioId,
        series: series.map((s) => ({
          numeroSerie: s.numeroSerie,
          pesoReal: s.pesoReal,
          repeticiones: s.repeticiones,
        })),
      });

      // 3. Recargar el entrenamiento actual para que se vea reflejado
      await get().loadTrainingByDate(usuarioId, fecha);
      
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al registrar ejercicio',
      });
    } finally {
      set({ loading: false });
    }
  },

  loadTodayTraining: async (usuarioId: string) => {
    set({ loading: true, error: null });
    try {
      const entrenamiento = await entrenamientoService.getToday(usuarioId);
      // Verificar si el entrenamiento fue cancelado
      if (entrenamiento) {
        const canceledTrainings = JSON.parse(
          localStorage.getItem('canceledTrainings') || '[]'
        ) as string[];
        if (canceledTrainings.includes(entrenamiento.id)) {
          set({ entrenamiento: null });
          return;
        }
      }
      set({ entrenamiento });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al cargar entrenamiento',
      });
    } finally {
      set({ loading: false });
    }
  },

  loadTrainingByDate: async (usuarioId: string, fecha: string) => {
    set({ loading: true, error: null });
    try {
      const entrenamiento = await entrenamientoService.getByDate(usuarioId, fecha);
      // Verificar si el entrenamiento fue cancelado
      if (entrenamiento) {
        const canceledTrainings = JSON.parse(
          localStorage.getItem('canceledTrainings') || '[]'
        ) as string[];
        if (canceledTrainings.includes(entrenamiento.id)) {
          set({ entrenamiento: null });
          return;
        }
      }
      set({ entrenamiento });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al cargar entrenamiento',
      });
    } finally {
      set({ loading: false });
    }
  },

  updateSerie: (
    ejercicioId: string,
    numeroSerie: number,
    pesoReal?: number,
    repeticiones?: number
  ) => {
    const { entrenamiento } = get();
    if (!entrenamiento) return;

    const ejerciciosEjecutados = entrenamiento.ejerciciosEjecutados.map((ej) => {
      if (ej.ejercicioId === ejercicioId) {
        const seriesEjecutadas = ej.seriesEjecutadas.map((serie) => {
          if (serie.numeroSerie === numeroSerie) {
            return {
              ...serie,
              pesoReal: pesoReal ?? serie.pesoReal,
              repeticiones: repeticiones ?? serie.repeticiones,
            };
          }
          return serie;
        });

        // Si la serie no existe, agregarla
        const serieExists = seriesEjecutadas.some((s) => s.numeroSerie === numeroSerie);
        if (!serieExists) {
          seriesEjecutadas.push({
            numeroSerie,
            pesoReal,
            repeticiones,
          });
        }

        return {
          ...ej,
          seriesEjecutadas: seriesEjecutadas.sort((a, b) => a.numeroSerie - b.numeroSerie),
        };
      }
      return ej;
    });

    set({
      entrenamiento: {
        ...entrenamiento,
        ejerciciosEjecutados,
      },
    });
  },

  clearEntrenamiento: () => {
    const entrenamiento = get().entrenamiento;
    if (entrenamiento) {
      // Guardar en localStorage que este entrenamiento fue cancelado
      const canceledTrainings = JSON.parse(
        localStorage.getItem('canceledTrainings') || '[]'
      ) as string[];
      if (!canceledTrainings.includes(entrenamiento.id)) {
        canceledTrainings.push(entrenamiento.id);
        localStorage.setItem('canceledTrainings', JSON.stringify(canceledTrainings));
      }
    }
    set({ entrenamiento: null, error: null });
  },
}));

