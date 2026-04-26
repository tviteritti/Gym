import type { Rutina, Ejercicio, DiaRutinaRequest } from '../types';

export interface SeriesPorMusculo {
  musculo: string;
  series: number;
}

export interface SeriesPorDia {
  diaSemana: number;
  diaNombre: string;
  series: number;
}

export interface ResumenSeriesRutina {
  /** Total de series en la semana planificada */
  totalSemanal: number;
  porMusculo: SeriesPorMusculo[];
  porDia: SeriesPorDia[];
}

const nombresDias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Cuenta series planificadas por músculo y por día (según `seriesPlanificadas.length`).
 */
export function calcularResumenSeriesRutina(rutina: Rutina, catalogoEjercicios: Ejercicio[]): ResumenSeriesRutina {
  const porMusculoMap = new Map<string, number>();
  let totalSemanal = 0;
  const porDia: SeriesPorDia[] = [];

  for (const dia of rutina.diasDeRutina) {
    let seriesDia = 0;
    for (const ep of dia.ejerciciosPlanificados) {
      const n = ep.seriesPlanificadas?.length ?? 0;
      seriesDia += n;
      const ej = catalogoEjercicios.find((e) => e.id === ep.ejercicioId);
      const musculo = ej?.musculoPrincipal ?? 'Sin músculo';
      porMusculoMap.set(musculo, (porMusculoMap.get(musculo) ?? 0) + n);
    }
    totalSemanal += seriesDia;
    porDia.push({
      diaSemana: dia.diaSemana,
      diaNombre: dia.diaSemanaNombre || nombresDias[dia.diaSemana] || `Día ${dia.diaSemana}`,
      series: seriesDia,
    });
  }

  const porMusculo = [...porMusculoMap.entries()]
    .map(([musculo, series]) => ({ musculo, series }))
    .sort((a, b) => b.series - a.series);

  return { totalSemanal, porMusculo, porDia };
}

/**
 * Cuenta series planificadas por músculo mientras se arma la rutina (borrador `DiaRutinaRequest`).
 * Ignora filas sin `ejercicioId` seleccionado.
 */
export function calcularSeriesPorMusculoDesdeDias(
  dias: DiaRutinaRequest[],
  catalogoEjercicios: Ejercicio[]
): { total: number; porMusculo: SeriesPorMusculo[] } {
  const porMusculoMap = new Map<string, number>();
  let total = 0;

  for (const dia of dias) {
    for (const ep of dia.ejercicios) {
      if (!ep.ejercicioId) continue;
      const n = ep.series?.length ?? 0;
      if (n === 0) continue;
      total += n;
      const ej = catalogoEjercicios.find((e) => e.id === ep.ejercicioId);
      const musculo = ej?.musculoPrincipal?.trim() ? ej.musculoPrincipal : 'Sin músculo';
      porMusculoMap.set(musculo, (porMusculoMap.get(musculo) ?? 0) + n);
    }
  }

  const porMusculo = [...porMusculoMap.entries()]
    .map(([musculo, series]) => ({ musculo, series }))
    .sort((a, b) => b.series - a.series);

  return { total, porMusculo };
}

/** Suma de `series.length` de todos los ejercicios del día (borrador). */
export function contarSeriesDiaRutina(dia: DiaRutinaRequest): number {
  return dia.ejercicios.reduce((acc, ej) => acc + (ej.series?.length ?? 0), 0);
}
