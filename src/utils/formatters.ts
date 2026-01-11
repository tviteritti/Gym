import { DiaSemana } from '../types';

export const formatDiaSemana = (dia: number): string => {
  const dias: Record<number, string> = {
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
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
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
