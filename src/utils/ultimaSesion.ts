export interface AparicionEjercicio {
  slotId: string;
  ejercicioId: string;
  /** 0 = primera vez que ese ejercicio aparece en el día, 1 = la segunda, etc. */
  indice: number;
  /** Si viene, prioriza esa máquina. Si no hay, usa registros viejos sin máquina. */
  maquinaId?: string;
  /** Si viene, prioriza ese agarre. Si no hay, usa registros viejos sin agarre. */
  agarre?: string;
  postura?: string;
  accesorio?: string;
  altura?: string;
  unilateral?: boolean;
}

export interface EjecucionPreviaOrdenada {
  id: string;
  ejercicioId: string;
  fecha: string;
  orden: number | null;
  fechaCreacion: string;
  maquinaId?: string | null;
  agarre?: string | null;
  postura?: string | null;
  accesorio?: string | null;
  altura?: string | null;
  unilateral?: boolean | null;
}

/**
 * Para cada aparición (1ª, 2ª, …) elige la ejecución previa de esa misma posición.
 * No reutiliza la de otra aparición del mismo ejercicio.
 */
export function elegirEjecutadoPorAparicion(
  rows: EjecucionPreviaOrdenada[],
  peticiones: AparicionEjercicio[]
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const p of peticiones) out[p.slotId] = null;

  const porEjercicio = new Map<string, EjecucionPreviaOrdenada[]>();
  for (const r of rows) {
    const list = porEjercicio.get(r.ejercicioId) ?? [];
    list.push(r);
    porEjercicio.set(r.ejercicioId, list);
  }

  for (const pet of peticiones) {
    let base = porEjercicio.get(pet.ejercicioId) ?? [];
    base = acotarTexto(base, pet.agarre, (r) => r.agarre);
    base = acotarTexto(base, pet.postura, (r) => r.postura);
    base = acotarTexto(base, pet.accesorio, (r) => r.accesorio);
    base = acotarTexto(base, pet.altura, (r) => r.altura);
    base = acotarBool(base, pet.unilateral, (r) => r.unilateral);
    const deMaquina = pet.maquinaId ? base.filter((r) => r.maquinaId === pet.maquinaId) : base;
    const pool = pet.maquinaId && deMaquina.length === 0 ? base.filter((r) => !r.maquinaId) : deMaquina;
    out[pet.slotId] = elegirEnPool(pool, pet.indice);
  }

  return out;
}

function acotarTexto(
  rows: EjecucionPreviaOrdenada[],
  pedido: string | undefined,
  leer: (r: EjecucionPreviaOrdenada) => string | null | undefined
): EjecucionPreviaOrdenada[] {
  if (!pedido) return rows;
  const propios = rows.filter((r) => leer(r) === pedido);
  return propios.length > 0 ? propios : rows.filter((r) => !leer(r));
}

function acotarBool(
  rows: EjecucionPreviaOrdenada[],
  pedido: boolean | undefined,
  leer: (r: EjecucionPreviaOrdenada) => boolean | null | undefined
): EjecucionPreviaOrdenada[] {
  if (pedido == null) return rows;
  const propios = rows.filter((r) => leer(r) === pedido);
  return propios.length > 0 ? propios : rows.filter((r) => leer(r) == null);
}

function elegirEnPool(rows: EjecucionPreviaOrdenada[], indice: number): string | null {
  const porFecha = new Map<string, EjecucionPreviaOrdenada[]>();
  for (const r of rows) {
    const list = porFecha.get(r.fecha) ?? [];
    list.push(r);
    porFecha.set(r.fecha, list);
  }

  const fechas = [...porFecha.keys()].sort((a, b) => b.localeCompare(a));
  for (const fecha of fechas) {
    const lista = porFecha.get(fecha)!;
    lista.sort((a, b) => {
      const oa = a.orden ?? Number.MAX_SAFE_INTEGER;
      const ob = b.orden ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      const c = a.fechaCreacion.localeCompare(b.fechaCreacion);
      if (c !== 0) return c;
      return a.id.localeCompare(b.id);
    });
    if (lista[indice]) return lista[indice].id;
  }
  return null;
}

/** Índice de cada slot entre las apariciones del mismo ejercicio, ordenadas por posición en el día. */
export function aparicionesDeSlots(
  slots: {
    id: string;
    ejercicioId: string;
    orden: number;
    agarre?: string;
    postura?: string;
    accesorio?: string;
    altura?: string;
    unilateral?: boolean;
    maquinaId?: string;
  }[]
): AparicionEjercicio[] {
  const grupos = new Map<string, typeof slots>();
  for (const slot of slots) {
    const uni = slot.unilateral === true ? '1' : slot.unilateral === false ? '0' : '';
    const clave = [slot.ejercicioId, slot.agarre ?? '', slot.postura ?? '', slot.accesorio ?? '', slot.altura ?? '', uni].join('|');
    const list = grupos.get(clave) ?? [];
    list.push(slot);
    grupos.set(clave, list);
  }

  const peticiones: AparicionEjercicio[] = [];
  for (const list of grupos.values()) {
    const ordenados = [...list].sort(
      (a, b) => a.orden - b.orden || a.id.localeCompare(b.id)
    );
    ordenados.forEach((slot, indice) => {
      peticiones.push({
        slotId: slot.id,
        ejercicioId: slot.ejercicioId,
        indice,
        ...(slot.maquinaId ? { maquinaId: slot.maquinaId } : {}),
        ...(slot.agarre ? { agarre: slot.agarre } : {}),
        ...(slot.postura ? { postura: slot.postura } : {}),
        ...(slot.accesorio ? { accesorio: slot.accesorio } : {}),
        ...(slot.altura ? { altura: slot.altura } : {}),
        ...(slot.unilateral != null ? { unilateral: slot.unilateral } : {}),
      });
    });
  }
  return peticiones;
}
