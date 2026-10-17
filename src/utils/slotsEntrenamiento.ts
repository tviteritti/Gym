import type { EjercicioEjecutado, EjercicioPlanificado } from '../types';

export interface SlotEntrenamiento {
  /** Ejercicio a mostrar. Si se reemplazó en el día, es el nuevo. */
  ejercicio: EjercicioPlanificado;
  ejecutado?: EjercicioEjecutado;
  esAdicional: boolean;
  esNuevo: boolean;
  /** Slot de la rutina. Vacío en agregados a mano. */
  ejercicioPlanificadoId?: string;
}

const ejecucionAPlanificado = (ee: EjercicioEjecutado, orden: number): EjercicioPlanificado => {
  const seriesNormales = ee.seriesEjecutadas.filter((s) => !s.esCompleja);
  return {
    id: `temp-${ee.id}`,
    ejercicioId: ee.ejercicioId,
    ejercicioNombre: ee.ejercicioNombre || 'Ejercicio',
    orden,
    seriesPlanificadas:
      seriesNormales.length > 0
        ? seriesNormales.map((serie, idx) => ({
            id: `temp-serie-${ee.id}-${idx}`,
            numeroSerie: serie.numeroSerie,
            pesoPlanificado: serie.pesoReal,
          }))
        : [{ id: `temp-1-${ee.id}`, numeroSerie: 1 }],
  };
};

/**
 * Arma la lista del día: cada slot de la rutina conserva sus series,
 * aunque el ejercicio esté repetido o se haya reemplazado.
 * Lo agregado a mano no se fusiona con el plan.
 */
export function armarSlotsEntrenamiento(
  planificados: EjercicioPlanificado[],
  ejecutados: EjercicioEjecutado[],
  nuevos: EjercicioPlanificado[]
): SlotEntrenamiento[] {
  const usados = new Set<string>();

  const porPlanificado = new Map<string, EjercicioEjecutado>();
  for (const ee of ejecutados) {
    if (!ee.id || !ee.ejercicioPlanificadoId) continue;
    if (!porPlanificado.has(ee.ejercicioPlanificadoId)) {
      porPlanificado.set(ee.ejercicioPlanificadoId, ee);
    }
  }

  const legacyPorEjercicio = new Map<string, EjercicioEjecutado[]>();
  const ordenados = [...ejecutados].sort((a, b) =>
    (a.fechaCreacion || '').localeCompare(b.fechaCreacion || '')
  );
  for (const ee of ordenados) {
    if (!ee.id || ee.ejercicioPlanificadoId || ee.esAdicional || ee.orden != null) continue;
    const cola = legacyPorEjercicio.get(ee.ejercicioId) ?? [];
    cola.push(ee);
    legacyPorEjercicio.set(ee.ejercicioId, cola);
  }

  const porOrden = new Map<number, EjercicioEjecutado>();
  for (const ee of ordenados) {
    if (!ee.id || ee.ejercicioPlanificadoId || ee.esAdicional || ee.orden == null) continue;
    if (!porOrden.has(ee.orden)) porOrden.set(ee.orden, ee);
  }

  const slots: SlotEntrenamiento[] = planificados.map((p) => {
    let ee = porPlanificado.get(p.id);
    if (ee?.id && usados.has(ee.id)) ee = undefined;
    if (!ee) {
      const por = porOrden.get(p.orden);
      if (por?.id && !usados.has(por.id)) ee = por;
    }
    if (!ee) {
      const cola = legacyPorEjercicio.get(p.ejercicioId);
      while (cola?.length) {
        const candidato = cola.shift();
        if (candidato?.id && !usados.has(candidato.id)) {
          ee = candidato;
          break;
        }
      }
    }
    if (ee?.id) usados.add(ee.id);

    const reemplazado = Boolean(ee && ee.ejercicioId !== p.ejercicioId);
    const ejercicio: EjercicioPlanificado = reemplazado && ee
      ? {
          ...p,
          ejercicioId: ee.ejercicioId,
          ejercicioNombre: ee.ejercicioNombre || p.ejercicioNombre,
          esBilbo: false,
        }
      : p;

    return {
      ejercicio,
      ejecutado: ee,
      esAdicional: false,
      esNuevo: false,
      ejercicioPlanificadoId: p.id,
    };
  });

  for (const ee of ordenados) {
    if (!ee.id || usados.has(ee.id)) continue;
    slots.push({
      ejercicio: ejecucionAPlanificado(ee, slots.length + 1),
      ejecutado: ee,
      esAdicional: true,
      esNuevo: false,
    });
  }

  for (const nuevo of nuevos) {
    slots.push({
      ejercicio: nuevo,
      esAdicional: true,
      esNuevo: true,
    });
  }

  return slots;
}
