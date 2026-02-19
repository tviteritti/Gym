import type { InputHTMLAttributes } from 'react';
import { forwardRef, useCallback } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, error, fullWidth = false, className = '', step, min, max, onFocus, ...props }, ref) => {

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      const scrollY = window.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      });
      onFocus?.(e);
    }, [onFocus]);

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-dark-text mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          onFocus={handleFocus}
          className={`
            block px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg text-center
            bg-white border rounded-lg text-black
            focus:outline-none focus:ring-2 focus:ring-dark-accent focus:border-transparent
            disabled:bg-dark-bg disabled:cursor-not-allowed disabled:text-dark-text-muted
            placeholder:text-dark-text-muted
            w-full max-w-full
            ${error ? 'border-red-500' : 'border-dark-border'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';

