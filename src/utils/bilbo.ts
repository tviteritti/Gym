import type { EjercicioMetodoBilbo, ProgresoMetodoBilbo } from '../types';

/** Próximo peso sugerido para la primera serie del método Bilbo (misma lógica que en la UI). */
export function calcularProximoPesoBilbo(
  bilbo: EjercicioMetodoBilbo,
  progreso: ProgresoMetodoBilbo | null
): number | null {
  if (!progreso) {
    return bilbo.pesoInicial;
  }
  if (progreso.repeticiones < 15) {
    return bilbo.pesoInicial;
  }
  return progreso.pesoActual + bilbo.incremento;
}
