import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/home', label: 'Entrenamiento', icon: '💪' },
  { path: '/rutinas', label: 'Rutinas', icon: '📋' },
  { path: '/ejercicios', label: 'Ejercicios', icon: '🏋️' },
  { path: '/bilbo', label: 'Método Bilbo', icon: '⚡' },
  { path: '/musculos', label: 'Músculos', icon: '🔬' },
];

interface NavigationProps {
  open: boolean;
  onToggle: () => void;
}

export const Navigation = ({ open, onToggle }: NavigationProps) => {
  const location = useLocation();
  const { logout, usuario } = useAuthStore();

  return (
    <>
      {/* Desktop: botón para abrir cuando el menú está cerrado */}
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          title="Abrir menú"
          aria-label="Abrir menú"
          className="hidden md:flex fixed left-3 top-3 z-50 h-10 w-10 items-center justify-center rounded-xl border border-dark-border/50 bg-dark-surface/90 text-dark-text shadow-lg backdrop-blur-sm hover:border-blue-500/40 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 h-full w-72 glass-morphism border-r border-dark-border/50 flex-col z-50 transition-transform duration-300 ease-smooth ${
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div className="p-8 border-b border-dark-border/50">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-3xl font-bold gradient-text animate-float">
              Gym Tracker
            </h1>
            <button
              type="button"
              onClick={onToggle}
              title="Cerrar menú"
              aria-label="Cerrar menú"
              className="mt-1 flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-dark-border/50 text-dark-text-muted hover:text-dark-text hover:border-blue-500/40 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {usuario && (
            <div className="glass-morphism rounded-xl px-4 py-2 border border-dark-border/50">
              <p className="text-sm text-dark-text-muted truncate">{usuario.email}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 p-6 space-y-3">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path ||
                           (item.path !== '/home' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                tabIndex={open ? 0 : -1}
                className={`
                  group relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-400 ease-smooth overflow-hidden
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30 shadow-glow'
                    : 'text-dark-text-muted hover:text-dark-text border border-transparent hover:border-dark-border/50 hover:scale-[1.02]'
                  }
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${isActive ? 'from-blue-500/10 to-purple-500/10' : 'from-transparent to-transparent'} group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-400`}></div>
                <span className="text-2xl relative z-10 transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                <span className="font-medium relative z-10">{item.label}</span>
                {isActive && (
                  <div className="absolute right-2 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse-glow"></div>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-dark-border/50">
          <button
            onClick={logout}
            tabIndex={open ? 0 : -1}
            className="group w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-dark-text-muted hover:text-red-400 transition-all duration-400 ease-smooth border border-transparent hover:border-red-500/30 hover:bg-red-600/10 hover:scale-[1.02]"
          >
            <span className="text-2xl transition-transform duration-300 group-hover:scale-110">🚪</span>
            <span className="font-medium">Salir</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-morphism border-t border-dark-border/50 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center h-20 pt-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path ||
                           (item.path !== '/home' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-400 ease-smooth
                  ${isActive
                    ? 'text-blue-400'
                    : 'text-dark-text-muted'
                  }
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`absolute inset-x-2 bottom-0 h-1 bg-gradient-to-r ${isActive ? 'from-blue-400 to-purple-400' : 'from-transparent to-transparent'} group-hover:from-blue-500/50 group-hover:to-purple-500/50 rounded-full transition-all duration-400`}></div>
                <span className="text-3xl mb-1 transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                <span className="text-[10px] font-medium leading-tight px-1 text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
