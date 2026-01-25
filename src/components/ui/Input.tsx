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
      <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-sm font-medium text-dark-text mb-2 transition-colors">
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            className={`
              block w-full px-4 py-3 text-lg rounded-xl
              glass-morphism text-dark-text
              border transition-all duration-300 ease-smooth
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:shadow-glow
              disabled:bg-dark-bg/50 disabled:cursor-not-allowed disabled:text-dark-text-muted
              placeholder:text-dark-text-muted
              hover:bg-dark-hover hover:border-gray-500/50
              ${error 
                ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' 
                : 'border-dark-border/50'
              }
              ${widthClass}
              ${className}
            `}
            {...props}
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400 animate-fade-in flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

