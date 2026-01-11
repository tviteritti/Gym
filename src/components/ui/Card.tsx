import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

export const Card = ({ children, className = '', padding = 'md', style }: CardProps) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        bg-dark-card rounded-xl border border-dark-border shadow-lg
        ${paddingClasses[padding]}
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
};

