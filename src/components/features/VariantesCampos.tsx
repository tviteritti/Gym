import {
  ETIQUETA_ACCESORIO,
  ETIQUETA_ALTURA,
  ETIQUETA_POSTURA,
  agarresDe,
  etiquetaAgarre,
} from '../../constants/variantes';
import type { Ejercicio } from '../../types';
import { SelectorFila } from './SelectorFila';

interface VariantesCamposProps {
  ejercicio?: Ejercicio;
  agarre?: string;
  postura?: string;
  accesorio?: string;
  altura?: string;
  unilateral?: boolean;
  disabled?: boolean;
  error?: string | null;
  onAgarre: (valor: string) => void;
  onPostura: (valor: string) => void;
  onAccesorio: (valor: string) => void;
  onAltura: (valor: string) => void;
  onUnilateral: (valor: boolean) => void;
}

export const VariantesCampos = ({
  ejercicio,
  agarre,
  postura,
  accesorio,
  altura,
  unilateral,
  disabled,
  error,
  onAgarre,
  onPostura,
  onAccesorio,
  onAltura,
  onUnilateral,
}: VariantesCamposProps) => {
  if (!ejercicio) return null;
  const agarres = agarresDe(ejercicio);
  const hay =
    agarres.length > 0 ||
    !!ejercicio.usaPostura ||
    !!ejercicio.accesorios?.length ||
    !!ejercicio.usaAltura ||
    !!ejercicio.usaUnilateral;
  if (!hay) return null;

  return (
    <div>
      <SelectorFila
        titulo="Agarre"
        opciones={agarres.map((id) => ({ id, label: etiquetaAgarre(id) }))}
        value={agarre}
        onChange={onAgarre}
        disabled={disabled}
      />
      {ejercicio.usaPostura && (
        <SelectorFila
          titulo="Postura"
          opciones={['parado', 'sentado'].map((id) => ({ id, label: ETIQUETA_POSTURA[id] }))}
          value={postura}
          onChange={onPostura}
          disabled={disabled}
        />
      )}
      <SelectorFila
        titulo="Accesorio"
        opciones={(ejercicio.accesorios ?? []).map((id) => ({ id, label: ETIQUETA_ACCESORIO[id] ?? id }))}
        value={accesorio}
        onChange={onAccesorio}
        disabled={disabled}
      />
      <SelectorFila
        titulo="Altura"
        opciones={
          ejercicio.usaAltura
            ? ['alto', 'medio', 'bajo'].map((id) => ({ id, label: ETIQUETA_ALTURA[id] }))
            : []
        }
        value={altura}
        onChange={onAltura}
        disabled={disabled}
      />
      <SelectorFila
        titulo="Unilateral"
        opciones={
          ejercicio.usaUnilateral
            ? [
                { id: 'no', label: 'No' },
                { id: 'si', label: 'Sí' },
              ]
            : []
        }
        value={unilateral == null ? undefined : unilateral ? 'si' : 'no'}
        onChange={(id) => onUnilateral(id === 'si')}
        disabled={disabled}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};
