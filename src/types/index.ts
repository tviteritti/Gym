import type { Agarre } from '../constants/agarres';

// Enums - Using const object instead of enum for erasableSyntaxOnly compatibility
export const DiaSemana = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
} as const;

export type DiaSemanaValue = typeof DiaSemana[keyof typeof DiaSemana];

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

export type GrupoEquipo = 'dorsalera' | 'polea';

export interface Maquina {
  id: string;
  nombre: string;
  grupo: GrupoEquipo;
  orden: number;
}

export interface Ejercicio {
  id: string;
  nombre: string;
  musculoPrincipal: string;
  musculosSecundarios?: string;
  descripcion?: string;
  fechaCreacion: string;
  /** Si el peso depende de la máquina: dorsalera o polea. */
  grupoEquipo?: GrupoEquipo;
  /** El mismo ejercicio se trackea aparte por agarre. */
  usaAgarre?: boolean;
  /** Si está, el selector de agarre muestra solo estos. */
  agarres?: Agarre[];
  usaPostura?: boolean;
  usaAltura?: boolean;
  usaUnilateral?: boolean;
  accesorios?: string[];
  /** Accesorios que usan las poleas. */
  maquinaSi?: string[];
}

export interface SeriePlanificada {
  id: string;
  numeroSerie: number;
  pesoPlanificado?: number;
  rangoRepeticionesMin?: number;
  rangoRepeticionesMax?: number;
}

export type TipoAgrupacion = 'superserie' | 'biserie';

/** Técnica de intensidad aplicada al final del ejercicio; sus series no cuentan como series normales. */
export type TecnicaIntensidad = 'dropset' | 'restpause' | 'fst7';

export interface EjercicioPlanificado {
  id: string;
  ejercicioId: string;
  ejercicioNombre: string;
  orden: number;
  esBilbo?: boolean;
  tipoAgrupacion?: TipoAgrupacion;
  grupoAgrupacion?: number;
  tecnicaIntensidad?: TecnicaIntensidad;
  /** Cantidad de series extra de la técnica */
  tecnicaSeries?: number;
  agarre?: string;
  postura?: string;
  accesorio?: string;
  altura?: string;
  unilateral?: boolean;
  seriesPlanificadas: SeriePlanificada[];
}

export interface DiaDeRutina {
  id: string;
  diaSemana: number;
  diaSemanaNombre: string;
  ejercicioBilboId?: string;
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
  /** Serie extra de una técnica de intensidad (drop-set, rest-pause, FST-7). Numeración propia desde 1. */
  esCompleja?: boolean;
}

/** Última sesión registrada antes de una fecha (para comparar progreso). */
export interface UltimaSesionEjercicio {
  fecha: string;
  series: { numeroSerie: number; pesoReal?: number; repeticiones?: number; esCompleja?: boolean }[];
  /** La sesión es anterior a elegir máquina. */
  sinMaquina?: boolean;
  /** La sesión es anterior a elegir agarre. */
  sinAgarre?: boolean;
  sinPostura?: boolean;
  sinAccesorio?: boolean;
  sinAltura?: boolean;
  sinUnilateral?: boolean;
}

export interface EjercicioEjecutado {
  id?: string;
  ejercicioId: string;
  ejercicioNombre?: string;
  /** Slot de la rutina al que pertenece esta carga. */
  ejercicioPlanificadoId?: string;
  /** Posición en el día. Sirve si el slot de la rutina se recrea. */
  orden?: number;
  /** Agregado en el día, fuera del plan. */
  esAdicional?: boolean;
  fechaCreacion?: string;
  maquinaId?: string;
  agarre?: string;
  postura?: string;
  accesorio?: string;
  altura?: string;
  unilateral?: boolean;
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
  ejercicioBilboId?: string;
  ejercicios: EjercicioRutinaRequest[];
}

export interface EjercicioRutinaRequest {
  ejercicioId: string;
  orden: number;
  esBilbo?: boolean;
  tipoAgrupacion?: TipoAgrupacion;
  grupoAgrupacion?: number;
  tecnicaIntensidad?: TecnicaIntensidad;
  tecnicaSeries?: number;
  agarre?: string;
  postura?: string;
  accesorio?: string;
  altura?: string;
  unilateral?: boolean;
  rangoRepeticionesMin?: number;
  rangoRepeticionesMax?: number;
  series: SerieRutinaRequest[];
}

export interface SerieRutinaRequest {
  numeroSerie: number;
  pesoPlanificado?: number;
  rangoRepeticionesMin?: number;
  rangoRepeticionesMax?: number;
}

export interface StartTrainingDayRequest {
  usuarioId: string;
  fecha: string;
}

export interface RegisterExerciseExecutionRequest {
  entrenamientoId: string;
  ejercicioId: string;
  series: SerieEjecucionRequest[];
  /** Fila ya guardada de esta aparición. Si viene, se actualiza esa y no se crea otra. */
  ejercicioEjecutadoId?: string;
  /** Slot de la rutina. Identifica la aparición aunque el ejercicio se reemplace. */
  ejercicioPlanificadoId?: string;
  orden?: number;
  esAdicional?: boolean;
  maquinaId?: string | null;
  agarre?: string | null;
  postura?: string | null;
  accesorio?: string | null;
  altura?: string | null;
  unilateral?: boolean | null;
}

export interface SerieEjecucionRequest {
  numeroSerie: number;
  pesoReal?: number;
  repeticiones?: number;
  esCompleja?: boolean;
}

// Método Bilbo
export interface EjercicioMetodoBilbo {
  id: string;
  ejercicioId: string;
  ejercicioNombre?: string;
  usuarioId: string;
  pesoInicial: number;
  incremento: number;
  fechaCreacion: string;
  agarre?: string;
  postura?: string;
  accesorio?: string;
  altura?: string;
}

export interface ProgresoMetodoBilbo {
  id: string;
  ejercicioId: string;
  ejercicioNombre?: string;
  usuarioId: string;
  entrenamientoId: string;
  pesoActual: number;
  repeticiones: number;
  fecha: string;
  fechaCreacion: string;
}

export interface CreateEjercicioMetodoBilboRequest {
  ejercicioId: string;
  pesoInicial: number;
  incremento: number; // 2.5 o 5 kg
}

export interface UpdateEjercicioMetodoBilboRequest {
  pesoInicial?: number;
  incremento?: number;
}

// Responses
export interface AuthResponse {
  token: string;
  usuarioId: string;
  email: string;
}

