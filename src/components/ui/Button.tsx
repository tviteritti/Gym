import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'gradient';
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
    font-semibold rounded-xl
    transition-all duration-400 ease-smooth
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.96]
    relative overflow-hidden
    `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0
      hover:from-blue-500 hover:to-purple-500 hover:shadow-glow
      focus-visible:ring-blue-500
      before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100
      before:transition-opacity before:duration-300
    `,
    secondary: `
      glass-morphism text-dark-text border border-dark-border
      hover:bg-dark-hover hover:shadow-glass hover:shadow-inner-glow
      focus-visible:ring-blue-500
      hover:scale-[1.02]
    `,
    danger: `
      bg-gradient-to-r from-red-600/20 to-pink-600/20 text-red-400 border border-red-600/50
      hover:from-red-600/40 hover:to-pink-600/40 hover:border-red-500 hover:shadow-glow
      focus-visible:ring-red-500
      hover:scale-[1.02]
    `,
    outline: `
      border-2 border-dark-border text-dark-text bg-transparent
      hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-purple-600/10 hover:border-blue-500/50 hover:shadow-glow
      focus-visible:ring-blue-500
      hover:scale-[1.02]
    `,
    gradient: `
      bg-gradient-animated bg-300 text-white border-0 animate-gradient-shift
      hover:shadow-glow-lg
      focus-visible:ring-purple-500
    `,
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};
