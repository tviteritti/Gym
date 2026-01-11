// Colores para los músculos - Centralizado para fácil modificación
// Las claves deben estar sin acentos y en minúsculas para facilitar la búsqueda
const MUSCLE_COLORS_MAP: Record<string, string> = {
  pecho: '#ff0000', // rojo
  espalda: '#ffe598', // amarillo
  biceps: '#ed7d31', // naranja
  triceps: '#b4c6e7', // azul
  cuadriceps: '#7030a0', // violeta
  isquiotibiales: '#7f6000', // dorado
  gemelos: '#525252', // gris
  antebrazos: '#002060', // azul oscuro
  antebrazo: '#002060', // azul oscuro (singular)
  hombro: '#70ad47', // verde oscuro
  hombros: '#70ad47', // verde oscuro (plural)
  trapecio: '#00ff00', // verde más claro
};

/**
 * Normaliza el nombre del músculo para buscar el color
 * Remueve acentos, convierte a minúsculas y maneja variaciones
 */
const normalizeMuscleName = (nombre: string): string => {
  if (!nombre) return '';
  
  let normalized = nombre.toLowerCase().trim();
  
  // Remover acentos comunes
  normalized = normalized
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
  
  return normalized;
};

/**
 * Obtiene el color asociado a un músculo
 * @param musculoNombre - Nombre del músculo (case insensitive, maneja acentos y plural/singular)
 * @returns Color en formato hexadecimal o undefined si no se encuentra
 */
export const getMuscleColor = (musculoNombre: string): string | undefined => {
  if (!musculoNombre) return undefined;
  
  const normalized = normalizeMuscleName(musculoNombre);
  
  // Buscar coincidencia exacta
  if (MUSCLE_COLORS_MAP[normalized]) {
    return MUSCLE_COLORS_MAP[normalized];
  }
  
  // Buscar variaciones (con/sin 's' al final)
  const withS = normalized + 's';
  const withoutS = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
  
  return MUSCLE_COLORS_MAP[withS] || MUSCLE_COLORS_MAP[withoutS];
};

/**
 * Obtiene el color de un músculo con un valor por defecto
 * @param musculoNombre - Nombre del músculo
 * @param defaultColor - Color por defecto si no se encuentra (default: transparente)
 * @returns Color en formato hexadecimal
 */
export const getMuscleColorWithDefault = (
  musculoNombre: string,
  defaultColor: string = 'transparent'
): string => {
  return getMuscleColor(musculoNombre) || defaultColor;
};
