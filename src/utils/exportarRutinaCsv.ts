import { ETIQUETA_ACCESORIO, ETIQUETA_ALTURA, ETIQUETA_POSTURA, etiquetaAgarre } from '../constants/variantes';
import type { Ejercicio, EjercicioPlanificado, Rutina, SesionRecienteEjercicio } from '../types';
import { aparicionesDeSlots } from './ultimaSesion';
import { TECNICAS_INTENSIDAD, seriesTecnica } from './tecnicaIntensidad';

/** Cuántas sesiones recientes van en el CSV (1 = la más nueva). */
export const SESIONES_A_EXPORTAR = 4;

const COLUMNAS = [
  'rutina',
  'dia',
  'orden',
  'ejercicio',
  'musculo',
  'series_planificadas',
  'tecnica',
  'series_de_tecnica',
  'agrupacion',
  'bilbo',
  'agarre',
  'postura',
  'accesorio',
  'altura',
  'unilateral',
  'fecha',
  'sesion_1_mas_reciente',
  'serie',
  'peso_kg',
  'repeticiones',
  'tipo_serie',
  'maquina',
] as const;

function csvCampo(valor: string | number | undefined | null): string {
  if (valor == null) return '';
  const texto = String(valor);
  if (/[",\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

function etiqueta(mapa: Record<string, string>, id?: string): string {
  if (!id) return '';
  return mapa[id] ?? id;
}

function unilateralDe(valor?: boolean): string {
  if (valor == null) return '';
  return valor ? 'unilateral' : 'bilateral';
}

function agrupacionDe(ejercicio: EjercicioPlanificado): string {
  if (!ejercicio.tipoAgrupacion || ejercicio.grupoAgrupacion == null) return '';
  return `${ejercicio.tipoAgrupacion} ${ejercicio.grupoAgrupacion}`;
}

function fila(valores: (string | number | undefined | null)[]): string {
  return valores.map(csvCampo).join(',');
}

export function rutinaACsv(
  rutina: Rutina,
  ejercicios: Ejercicio[],
  sesionesPorSlot: Record<string, SesionRecienteEjercicio[]>,
  maquinaPorId: Map<string, string>
): string {
  const musculoPorEjercicio = new Map(ejercicios.map((e) => [e.id, e.musculoPrincipal]));
  const lineas = [COLUMNAS.join(',')];

  const dias = [...rutina.diasDeRutina].sort((a, b) => a.diaSemana - b.diaSemana);
  for (const dia of dias) {
    const ejerciciosDia = [...dia.ejerciciosPlanificados].sort((a, b) => a.orden - b.orden);
    for (const ejercicio of ejerciciosDia) {
      const comunes = [
        rutina.nombre,
        dia.diaSemanaNombre,
        ejercicio.orden,
        ejercicio.ejercicioNombre,
        musculoPorEjercicio.get(ejercicio.ejercicioId) ?? '',
        ejercicio.seriesPlanificadas.length,
        ejercicio.tecnicaIntensidad ? TECNICAS_INTENSIDAD[ejercicio.tecnicaIntensidad].label : '',
        ejercicio.tecnicaIntensidad ? seriesTecnica(ejercicio) : '',
        agrupacionDe(ejercicio),
        ejercicio.esBilbo ? 'si' : '',
        ejercicio.agarre ? etiquetaAgarre(ejercicio.agarre) : '',
        etiqueta(ETIQUETA_POSTURA, ejercicio.postura),
        etiqueta(ETIQUETA_ACCESORIO, ejercicio.accesorio),
        etiqueta(ETIQUETA_ALTURA, ejercicio.altura),
        unilateralDe(ejercicio.unilateral),
      ];

      const sesiones = sesionesPorSlot[ejercicio.id] ?? [];
      if (sesiones.length === 0) {
        lineas.push(fila([...comunes, '', '', '', '', '', '', '']));
        continue;
      }

      sesiones.forEach((sesion, indice) => {
        const maquina = sesion.maquinaId ? (maquinaPorId.get(sesion.maquinaId) ?? '') : '';
        for (const serie of sesion.series) {
          lineas.push(fila([
            ...comunes,
            sesion.fecha,
            indice + 1,
            serie.numeroSerie,
            serie.pesoReal ?? '',
            serie.repeticiones ?? '',
            serie.esCompleja ? 'compleja' : 'normal',
            maquina,
          ]));
        }
      });
    }
  }

  return `\uFEFF${lineas.join('\r\n')}\r\n`;
}

export function aparicionesDeRutina(rutina: Rutina) {
  return rutina.diasDeRutina.flatMap((dia) =>
    aparicionesDeSlots(
      dia.ejerciciosPlanificados.map((ejercicio) => ({
        id: ejercicio.id,
        ejercicioId: ejercicio.ejercicioId,
        orden: ejercicio.orden,
        agarre: ejercicio.agarre,
        postura: ejercicio.postura,
        accesorio: ejercicio.accesorio,
        altura: ejercicio.altura,
        unilateral: ejercicio.unilateral,
      }))
    )
  );
}

export function nombreArchivoRutina(nombre: string, hoyIso: string): string {
  const slug = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'rutina'}-${hoyIso}.csv`;
}

export function descargarCsv(nombreArchivo: string, contenido: string): void {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
