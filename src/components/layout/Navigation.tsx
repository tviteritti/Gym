import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/home', label: 'Entrenamiento', icon: '🏋️' },
  { path: '/rutinas', label: 'Rutinas', icon: '📋' },
  { path: '/ejercicios', label: 'Ejercicios', icon: '💪' },
  { path: '/bilbo', label: 'Método Bilbo', icon: '⚡' },
  { path: '/musculos', label: 'Músculos', icon: '🔬' },
];

export const Navigation = () => {
  const location = useLocation();
  const { logout, usuario } = useAuthStore();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-dark-surface border-r border-dark-border flex-col z-50">
        <div className="p-6 border-b border-dark-border">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Gym Tracker
          </h1>
          {usuario && (
            <p className="text-sm text-dark-text-muted mt-2">{usuario.email}</p>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                           (item.path !== '/home' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive
                    ? 'bg-dark-accent text-white border border-dark-accent'
                    : 'text-dark-text-muted hover:bg-dark-hover hover:text-dark-text border border-transparent hover:border-dark-border'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-dark-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-dark-text-muted hover:bg-dark-hover hover:text-red-400 transition-all border border-transparent hover:border-red-500/30"
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">Salir</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-surface border-t border-dark-border z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center h-16 pt-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                           (item.path !== '/home' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full transition-all
                  ${isActive
                    ? 'text-dark-accent'
                    : 'text-dark-text-muted'
                  }
                `}
              >
                <span className="text-2xl mb-0.5">{item.icon}</span>
                <span className="text-[10px] font-medium leading-tight px-0.5 text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
