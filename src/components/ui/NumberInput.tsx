import type { InputHTMLAttributes } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { sanitizeDecimalInput } from '../../utils/formatters';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

const valueToText = (value: InputHTMLAttributes<HTMLInputElement>['value']): string => {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      error,
      fullWidth = false,
      className = '',
      step,
      min,
      max,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [text, setText] = useState(() => valueToText(value));
    const focusedRef = useRef(false);

    useEffect(() => {
      if (!focusedRef.current) {
        setText(valueToText(value));
      }
    }, [value]);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        focusedRef.current = true;
        const scrollY = window.scrollY;
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        });
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        focusedRef.current = false;
        setText(valueToText(value));
        onBlur?.(e);
      },
      [onBlur, value]
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeDecimalInput(e.target.value);
        setText(sanitized);
        const normalized = sanitized.replace(',', '.');
        if (!onChange) return;
        const nextEvent = {
          ...e,
          target: { ...e.target, value: normalized },
          currentTarget: { ...e.currentTarget, value: normalized },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(nextEvent);
      },
      [onChange]
    );

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-dark-text mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          step={step}
          min={min}
          max={max}
          {...props}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
