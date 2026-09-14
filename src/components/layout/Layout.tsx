import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Navigation } from './Navigation';

const SIDEBAR_STORAGE_KEY = 'gym-tracker-sidebar-open';

const readSidebarOpen = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
};

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation open={sidebarOpen} onToggle={toggleSidebar} />
      <main
        className={`pb-16 md:pb-0 transition-[margin] duration-300 ease-smooth ${
          sidebarOpen ? 'md:ml-72' : 'md:ml-0'
        }`}
      >
        {children}
      </main>
    </div>
  );
};
