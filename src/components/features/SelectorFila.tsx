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
    <div className="flex w-full flex-wrap items-center gap-1">
      <span className="mr-0.5 shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-dark-text-muted">{titulo}</span>
      {opciones.map((op) => {
        const activa = value === op.id;
        return (
          <button
            key={op.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(op.id)}
            className={`h-7 rounded-md px-2 text-xs border transition-colors disabled:opacity-50 ${
              activa
                ? 'border-violet-400 bg-violet-500/25 text-violet-100'
                : 'border-dark-border bg-dark-bg/60 text-dark-text-muted hover:border-violet-400/60'
            }`}
          >
            {op.label}
          </button>
        );
      })}
    </div>
  );
};
