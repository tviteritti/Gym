import type { ReactNode } from 'react';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />
      {/* Desktop: margin-left para sidebar */}
      <main className="md:ml-64 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
};

