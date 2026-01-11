import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = '', ...props }, ref) => {
    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-dark-text mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            block px-4 py-3 text-lg
            border rounded-lg text-black bg-white
            focus:outline-none focus:ring-2 focus:ring-dark-accent focus:border-transparent
            disabled:bg-dark-bg disabled:cursor-not-allowed disabled:text-dark-text-muted
            placeholder:text-dark-text-muted
            ${error ? 'border-red-500' : 'border-dark-border'}
            ${widthClass}
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

Input.displayName = 'Input';

