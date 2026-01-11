import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const baseClasses =
    `
    font-semibold rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
    `;

  const variantClasses = {
    primary: `
      bg-dark-accent text-white border border-dark-accent
      hover:bg-blue-500 hover:border-blue-400
      focus-visible:ring-dark-accent
    `,
    secondary: `
      bg-dark-card text-dark-text border border-dark-border
      hover:bg-dark-hover hover:border-gray-500
      focus-visible:ring-dark-border
    `,
    danger: `
      bg-red-600/20 text-red-400 border border-red-600/50
      hover:bg-red-600/40 hover:border-red-500
      focus-visible:ring-red-500
    `,
    outline: `
      border-2 border-dark-border text-dark-text bg-transparent
      hover:bg-dark-hover hover:border-gray-500
      focus-visible:ring-dark-border
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
