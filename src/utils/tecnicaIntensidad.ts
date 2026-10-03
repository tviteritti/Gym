import type { TecnicaIntensidad } from '../types';

interface TecnicaInfo {
  label: string;
  /** Prefijo corto para numerar las series extra (D1, R1, F1…) */
  prefijo: string;
  seriesPorDefecto: number;
  opcionesSeries: number[];
  descripcion: string;
}

export const TECNICAS_INTENSIDAD: Record<TecnicaIntensidad, TecnicaInfo> = {
  dropset: {
    label: 'Drop-set',
    prefijo: 'D',
    seriesPorDefecto: 2,
    opcionesSeries: [1, 2, 3],
    descripcion: 'Al terminar la última serie, bajá el peso y seguí',
  },
  restpause: {
    label: 'Rest-pause',
    prefijo: 'R',
    seriesPorDefecto: 2,
    opcionesSeries: [1, 2, 3],
    descripcion: 'Mismo peso, descanso muy corto y otra serie',
  },
  fst7: {
    label: 'FST-7',
    prefijo: 'F',
    seriesPorDefecto: 7,
    opcionesSeries: [5, 6, 7, 8],
    descripcion: '7 series con poco descanso',
  },
};

export const TECNICAS_ORDEN: TecnicaIntensidad[] = ['dropset', 'restpause', 'fst7'];

export function esTecnicaIntensidad(valor: unknown): valor is TecnicaIntensidad {
  return typeof valor === 'string' && valor in TECNICAS_INTENSIDAD;
}

/** Series extra planificadas para un ejercicio (0 si no tiene técnica). */
export function seriesTecnica(ej: { tecnicaIntensidad?: TecnicaIntensidad; tecnicaSeries?: number }): number {
  if (!ej.tecnicaIntensidad) return 0;
  return ej.tecnicaSeries ?? TECNICAS_INTENSIDAD[ej.tecnicaIntensidad].seriesPorDefecto;
}

/** "30" o "30 + 7" según haya series complejas. */
export function formatVolumen(series: number, complejas: number): string {
  return complejas > 0 ? `${series} + ${complejas}` : `${series}`;
}
