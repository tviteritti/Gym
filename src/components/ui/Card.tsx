import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
  hover?: boolean;
  glow?: boolean;
}

export const Card = ({ children, className = '', padding = 'md', style, hover = true, glow = false }: CardProps) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        glass-morphism rounded-2xl border border-dark-border/50
        ${paddingClasses[padding]}
        ${hover ? 'hover-lift hover:bg-dark-hover/80' : ''}
        ${glow ? 'shadow-glow animate-pulse-glow' : 'shadow-glass'}
        transition-all duration-400 ease-smooth
        relative overflow-hidden
        ${className}
      `}
      style={style}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

