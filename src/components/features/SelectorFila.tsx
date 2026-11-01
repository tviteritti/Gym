interface SelectorFilaProps {
  titulo: string;
  opciones: { id: string; label: string }[];
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export const SelectorFila = ({ titulo, opciones, value, onChange, disabled }: SelectorFilaProps) => {
  if (opciones.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-dark-text-muted uppercase tracking-wide mb-1.5">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((op) => {
          const activa = value === op.id;
          return (
            <button
              key={op.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(op.id)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors disabled:opacity-50 ${
                activa
                  ? 'border-violet-400 bg-violet-500/25 text-violet-100'
                  : 'border-dark-border text-dark-text-muted hover:border-violet-400/60'
              }`}
            >
              {op.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
