import { AGARRES, ETIQUETA_AGARRE, type Agarre } from '../../constants/agarres';

interface AgarreSelectProps {
  value?: string;
  onChange: (agarre: Agarre) => void;
  disabled?: boolean;
}

export const AgarreSelect = ({ value, onChange, disabled }: AgarreSelectProps) => (
  <div className="flex flex-wrap gap-1.5">
    {AGARRES.map((id) => {
      const activa = value === id;
      return (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(id)}
          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors disabled:opacity-50 ${
            activa
              ? 'border-violet-400 bg-violet-500/25 text-violet-100'
              : 'border-dark-border text-dark-text-muted hover:border-violet-400/60'
          }`}
        >
          {ETIQUETA_AGARRE[id]}
        </button>
      );
    })}
  </div>
);
