import { AGARRES, ETIQUETA_AGARRE, type Agarre } from './agarres';
import type { Ejercicio, GrupoEquipo } from '../types';

export const ETIQUETA_ACCESORIO: Record<string, string> = {
  barra: 'Barra',
  barra_v: 'Barra V',
  soga: 'Soga',
  soga_unilateral: 'Soga unilateral',
  unilateral: 'Unilateral',
  mancuerna: 'Mancuerna',
  mancuernas: 'Mancuernas',
  disco: 'Disco',
  polea: 'Polea',
  maquina: 'Máquina',
  martillo: 'Martillo',
};

export const ETIQUETA_POSTURA: Record<string, string> = {
  parado: 'Parado',
  sentado: 'Sentado',
};

export const ETIQUETA_ALTURA: Record<string, string> = {
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

export interface ValoresVariante {
  agarre?: string;
  postura?: string;
  accesorio?: string;
  altura?: string;
  unilateral?: boolean;
}

export function agarresDe(ejercicio?: Ejercicio): Agarre[] {
  if (!ejercicio?.usaAgarre) return [];
  if (ejercicio.agarres?.length) return ejercicio.agarres;
  return [...AGARRES];
}

export function grupoMaquinaDe(ejercicio?: Ejercicio, accesorio?: string): GrupoEquipo | undefined {
  if (!ejercicio) return undefined;
  if (ejercicio.grupoEquipo) return ejercicio.grupoEquipo;
  if (accesorio && ejercicio.maquinaSi?.includes(accesorio)) return 'polea';
  return undefined;
}

export function faltaVariante(ejercicio: Ejercicio | undefined, valores: ValoresVariante): string | null {
  if (!ejercicio) return null;
  if (agarresDe(ejercicio).length > 0 && !valores.agarre) return 'Elegí el agarre para guardar.';
  if (ejercicio.usaPostura && !valores.postura) return 'Elegí si es parado o sentado.';
  if (ejercicio.accesorios?.length && !valores.accesorio) return 'Elegí el accesorio para guardar.';
  if (ejercicio.usaAltura && !valores.altura) return 'Elegí la altura para guardar.';
  if (ejercicio.usaUnilateral && valores.unilateral == null) return 'Elegí si es unilateral.';
  return null;
}

export function varianteBilboDe(valores: ValoresVariante) {
  return {
    accesorio: valores.accesorio ?? null,
    postura: valores.postura ?? null,
    altura: valores.altura ?? null,
  };
}

export function conservarVariante(ejercicio: Ejercicio | undefined, valores: ValoresVariante): ValoresVariante {
  if (!ejercicio) return {};
  return {
    agarre: agarresDe(ejercicio).some((a) => a === valores.agarre) ? valores.agarre : undefined,
    postura: ejercicio.usaPostura ? valores.postura : undefined,
    accesorio: valores.accesorio && ejercicio.accesorios?.includes(valores.accesorio) ? valores.accesorio : undefined,
    altura: ejercicio.usaAltura ? valores.altura : undefined,
    unilateral: ejercicio.usaUnilateral ? valores.unilateral : undefined,
  };
}
export function etiquetaAgarre(id: string): string {
  return esAgarreLocal(id) ? ETIQUETA_AGARRE[id] : id;
}

function esAgarreLocal(id: string): id is Agarre {
  return (AGARRES as readonly string[]).includes(id);
}
