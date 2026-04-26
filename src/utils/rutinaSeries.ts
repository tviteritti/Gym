import type { SerieRutinaRequest } from '../types';

const DND_EJERCICIO_MIME = 'application/x-gym-tracker-ejercicio-rutina';

export { DND_EJERCICIO_MIME };

export function setDragDataEjercicioRutina(dataTransfer: DataTransfer, diaIndex: number, ejercicioIndex: number) {
  dataTransfer.setData(DND_EJERCICIO_MIME, JSON.stringify({ diaIndex, ejercicioIndex }));
  dataTransfer.effectAllowed = 'move';
}

export function getDragDataEjercicioRutina(dataTransfer: DataTransfer): {
  diaIndex: number;
  ejercicioIndex: number;
} | null {
  const raw = dataTransfer.getData(DND_EJERCICIO_MIME);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { diaIndex?: number; ejercicioIndex?: number };
    if (typeof o.diaIndex !== 'number' || typeof o.ejercicioIndex !== 'number') return null;
    return { diaIndex: o.diaIndex, ejercicioIndex: o.ejercicioIndex };
  } catch {
    return null;
  }
}

/** Genera filas de series solo con `numeroSerie` (sin peso ni rango). */
export function seriesDesdeCantidad(cantidad: number): SerieRutinaRequest[] {
  const n = Math.max(1, Math.min(99, Math.floor(Number(cantidad)) || 1));
  return Array.from({ length: n }, (_, i) => ({
    numeroSerie: i + 1,
  }));
}
