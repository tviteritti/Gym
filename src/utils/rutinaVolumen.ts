import type { Rutina, Ejercicio, DiaRutinaRequest } from '../types';
import { seriesTecnica } from './tecnicaIntensidad';

export interface SeriesPorMusculo {
  musculo: string;
  series: number;
  /** Series extra de técnicas de intensidad (no suman en `series`) */
  complejas: number;
}

export interface SeriesPorDia {
  diaSemana: number;
  diaNombre: string;
  series: number;
  complejas: number;
}

export interface ResumenSeriesRutina {
  /** Total de series en la semana planificada */
  totalSemanal: number;
  totalComplejasSemanal: number;
  porMusculo: SeriesPorMusculo[];
  porDia: SeriesPorDia[];
}

const nombresDias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function acumularMusculo(
  map: Map<string, { series: number; complejas: number }>,
  musculo: string,
  series: number,
  complejas: number
) {
  const prev = map.get(musculo) ?? { series: 0, complejas: 0 };
  map.set(musculo, { series: prev.series + series, complejas: prev.complejas + complejas });
}

function ordenarPorMusculo(map: Map<string, { series: number; complejas: number }>): SeriesPorMusculo[] {
  return [...map.entries()]
    .map(([musculo, v]) => ({ musculo, ...v }))
    .sort((a, b) => b.series - a.series || b.complejas - a.complejas);
}

/**
 * Cuenta series planificadas por músculo y por día (según `seriesPlanificadas.length`).
 * Las series de técnicas de intensidad se cuentan aparte en `complejas`.
 */
export function calcularResumenSeriesRutina(rutina: Rutina, catalogoEjercicios: Ejercicio[]): ResumenSeriesRutina {
  const porMusculoMap = new Map<string, { series: number; complejas: number }>();
  let totalSemanal = 0;
  let totalComplejasSemanal = 0;
  const porDia: SeriesPorDia[] = [];

  for (const dia of rutina.diasDeRutina) {
    let seriesDia = 0;
    let complejasDia = 0;
    for (const ep of dia.ejerciciosPlanificados) {
      const n = ep.seriesPlanificadas?.length ?? 0;
      const c = seriesTecnica(ep);
      seriesDia += n;
      complejasDia += c;
      const ej = catalogoEjercicios.find((e) => e.id === ep.ejercicioId);
      const musculo = ej?.musculoPrincipal ?? 'Sin músculo';
      acumularMusculo(porMusculoMap, musculo, n, c);
    }
    totalSemanal += seriesDia;
    totalComplejasSemanal += complejasDia;
    porDia.push({
      diaSemana: dia.diaSemana,
      diaNombre: dia.diaSemanaNombre || nombresDias[dia.diaSemana] || `Día ${dia.diaSemana}`,
      series: seriesDia,
      complejas: complejasDia,
    });
  }

  return { totalSemanal, totalComplejasSemanal, porMusculo: ordenarPorMusculo(porMusculoMap), porDia };
}

/**
 * Cuenta series planificadas por músculo mientras se arma la rutina (borrador `DiaRutinaRequest`).
 * Ignora filas sin `ejercicioId` seleccionado.
 */
export function calcularSeriesPorMusculoDesdeDias(
  dias: DiaRutinaRequest[],
  catalogoEjercicios: Ejercicio[]
): { total: number; totalComplejas: number; porMusculo: SeriesPorMusculo[] } {
  const porMusculoMap = new Map<string, { series: number; complejas: number }>();
  let total = 0;
  let totalComplejas = 0;

  for (const dia of dias) {
    for (const ep of dia.ejercicios) {
      if (!ep.ejercicioId) continue;
      const n = ep.series?.length ?? 0;
      const c = seriesTecnica(ep);
      if (n === 0 && c === 0) continue;
      total += n;
      totalComplejas += c;
      const ej = catalogoEjercicios.find((e) => e.id === ep.ejercicioId);
      const musculo = ej?.musculoPrincipal?.trim() ? ej.musculoPrincipal : 'Sin músculo';
      acumularMusculo(porMusculoMap, musculo, n, c);
    }
  }

  return { total, totalComplejas, porMusculo: ordenarPorMusculo(porMusculoMap) };
}

/** Suma de `series.length` de todos los ejercicios del día (borrador). */
export function contarSeriesDiaRutina(dia: DiaRutinaRequest): number {
  return dia.ejercicios.reduce((acc, ej) => acc + (ej.series?.length ?? 0), 0);
}

/** Suma de series de técnicas de intensidad del día (borrador). */
export function contarSeriesComplejasDiaRutina(dia: DiaRutinaRequest): number {
  return dia.ejercicios.reduce((acc, ej) => acc + seriesTecnica(ej), 0);
}
