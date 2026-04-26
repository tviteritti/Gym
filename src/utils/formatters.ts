const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` → `Date` en medianoche calendario local (no UTC). */
export const parseFechaIsoLocal = (isoDate: string): Date => {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
};

/** Etiqueta corta en español (ej. "lun, 17 abr") para fechas solo-ISO. */
export const formatFechaCortaEs = (isoDate: string): string => {
  const dt = parseFechaIsoLocal(isoDate);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

/** Formato numérico es-ES para `YYYY-MM-DD` en local. */
export const formatFechaNumericaEs = (isoDate: string, options?: Intl.DateTimeFormatOptions): string => {
  const dt = parseFechaIsoLocal(isoDate);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString(
    'es-ES',
    options ?? { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
};

/** Ordenar fechas `YYYY-MM-DD` descendente (más reciente primero). */
export const compareFechaIsoDesc = (a: string, b: string): number => b.localeCompare(a);

export const formatDiaSemana = (dia: number): string => {  const dias: Record<number, string> = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo',
  };
  return dias[dia] || '';
};

export const formatDate = (date: string | Date): string => {
  if (typeof date === 'string' && ISO_DATE_ONLY.test(date)) {
    return formatFechaNumericaEs(date);
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  if (typeof date === 'string' && ISO_DATE_ONLY.test(date)) {
    return formatFechaNumericaEs(date);
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getDiaSemanaFromDate = (date: Date): number => {
  const day = date.getDay();
  // JavaScript: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  // Nuestro enum: 1 = Lunes, ..., 7 = Domingo
  return day === 0 ? 7 : day;
};

/**
 * Día de semana (1=Lunes … 7=Domingo) desde `YYYY-MM-DD` en calendario local.
 * Evita el bug de `new Date('YYYY-MM-DD')` que interpreta UTC y desplaza el día.
 */
export const diaSemanaDesdeFechaIsoLocal = (isoDate: string): number => {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return 7;
  return getDiaSemanaFromDate(new Date(y, m - 1, d));
};

export const calcularRM = (peso: number, reps: number): number => {
  // Fórmula de Epley: RM = peso × (1 + reps / 30)
  return peso * (1 + reps / 30);
};

/**
 * Calcula la fecha correspondiente al día de la semana.
 * @param diaSemana Número del día de la semana (1=Lunes, 7=Domingo)
 * @param weekOffset Offset de semanas (0 = esta semana, 1 = semana siguiente, etc.)
 * @returns Fecha en formato ISO string (YYYY-MM-DD)
 */
export const getDateForDayOfWeek = (diaSemana: number, weekOffset: number = 0): string => {
  const today = new Date();
  const currentDay = getDiaSemanaFromDate(today); // 1-7
  
  // Calculamos la diferencia respecto al lunes de esta semana
  const diffToMonday = currentDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  
  // Agregamos el offset de semanas
  const targetMonday = new Date(monday);
  targetMonday.setDate(monday.getDate() + (weekOffset * 7));
  
  // Calculamos el día objetivo sumando al lunes
  const targetDate = new Date(targetMonday);
  targetDate.setDate(targetMonday.getDate() + (diaSemana - 1));
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
