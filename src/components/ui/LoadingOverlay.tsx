interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay = ({ message = 'Cargando...' }: LoadingOverlayProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dark-border bg-dark-surface px-6 py-5 shadow-lg">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-dark-accent border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-dark-text">{message}</p>
      </div>
    </div>
  );
};
