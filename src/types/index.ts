// Enums
export enum DiaSemana {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7
}

// Entidades
export interface Usuario {
  id: string;
  email: string;
  fechaCreacion: string;
}

export interface Musculo {
  id: string;
  nombre: string;
  fechaCreacion: string;
}

export interface Ejercicio {
  id: string;
  nombre: string;
  musculoPrincipal: string;
  musculosSecundarios?: string;
  descripcion?: string;
  fechaCreacion: string;
}

export interface SeriePlanificada {
  id: string;
  numeroSerie: number;
  pesoPlanificado?: number;
}

export interface EjercicioPlanificado {
  id: string;
  ejercicioId: string;
  ejercicioNombre: string;
  orden: number;
  seriesPlanificadas: SeriePlanificada[];
}

export interface DiaDeRutina {
  id: string;
  diaSemana: number;
  diaSemanaNombre: string;
  ejerciciosPlanificados: EjercicioPlanificado[];
}

export interface Rutina {
  id: string;
  nombre: string;
  usuarioId: string;
  activa: boolean;
  fechaCreacion: string;
  diasDeRutina: DiaDeRutina[];
}

export interface SerieEjecutada {
  id?: string;
  numeroSerie: number;
  pesoReal?: number;
  repeticiones?: number;
}

export interface EjercicioEjecutado {
  id?: string;
  ejercicioId: string;
  ejercicioNombre?: string;
  seriesEjecutadas: SerieEjecutada[];
}

export interface Entrenamiento {
  id: string;
  usuarioId: string;
  fecha: string;
  diaSemana: number;
  diaSemanaNombre: string;
  ejerciciosEjecutados: EjercicioEjecutado[];
}

export interface RecordPorEjercicio {
  id: string;
  maxPeso: number;
  repsMax: number;
  fecha: string;
}

export interface EjecucionEjercicio {
  entrenamientoId: string;
  fecha: string;
  seriesEjecutadas: SerieEjecutada[];
}

export interface HistorialEjercicio {
  ejercicioId: string;
  ejercicioNombre: string;
  ejecuciones: EjecucionEjercicio[];
  record?: RecordPorEjercicio;
}

// Requests
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateMusculoRequest {
  nombre: string;
}

export interface CreateExerciseRequest {
  nombre: string;
  musculoPrincipalId: string;
  musculosSecundariosIds?: string[];
  descripcion?: string;
}

export interface CreateRoutineRequest {
  usuarioId: string;
  nombre: string;
  dias: DiaRutinaRequest[];
}

export interface DiaRutinaRequest {
  diaSemana: number;
  ejercicios: EjercicioRutinaRequest[];
}

export interface EjercicioRutinaRequest {
  ejercicioId: string;
  orden: number;
  series: SerieRutinaRequest[];
}

export interface SerieRutinaRequest {
  numeroSerie: number;
  pesoPlanificado?: number;
}

export interface StartTrainingDayRequest {
  usuarioId: string;
  fecha: string;
}

export interface RegisterExerciseExecutionRequest {
  entrenamientoId: string;
  ejercicioId: string;
  series: SerieEjecucionRequest[];
}

export interface SerieEjecucionRequest {
  numeroSerie: number;
  pesoReal?: number;
  repeticiones?: number;
}

// Responses
export interface AuthResponse {
  token: string;
  usuarioId: string;
  email: string;
}

