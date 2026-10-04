import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, LogIn, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 bg-white border-r border-zinc-200 flex-col p-4 flex-shrink-0 sticky top-0 h-screen">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-lg mb-8 tracking-tight hover:opacity-80 transition-opacity"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt="Logo"
            className="w-7 h-7 rounded shadow-sm"
          />
          Open Source Scout
        </Link>

        <div className="flex flex-col space-y-1 flex-1">
          <Link
            to="/app/discovery"
            className={`flex items-center space-x-2 p-2 rounded-md font-medium transition-colors ${location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/discovery') || location.pathname.includes('/automation') || location.pathname.includes('/assigned') || location.pathname.includes('/review') || location.pathname.includes('/merged') || location.pathname.includes('/dropped') ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            <LayoutDashboard size={20} />
            <span>Mission Control</span>
          </Link>
          <Link
            to="/app/identity"
            className={`flex items-center space-x-2 p-2 rounded-md font-medium transition-colors ${location.pathname.includes('/identity') ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            <UserCircle size={20} />
            <span>Profile & Settings</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-zinc-100">
          {user ? (
            <div className="flex flex-col space-y-2">
              <div className="text-sm font-medium text-zinc-500 truncate px-2">{user.email}</div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-md text-left w-full transition-colors"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/connect"
              className="flex items-center space-x-2 p-2 hover:bg-zinc-100 text-zinc-900 rounded-md font-medium"
            >
              <LogIn size={20} />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center gap-2 font-bold text-base tracking-tight">
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt="Logo"
            className="w-7 h-7 rounded shadow-sm"
          />
          Open Source Scout
        </Link>
        {user && (
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors p-1.5 rounded"
          >
            <LogOut size={14} />
            Sign out
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-zinc-200 flex">
        <Link
          to="/app/discovery"
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-bold transition-colors ${location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/discovery') || location.pathname.includes('/automation') || location.pathname.includes('/assigned') || location.pathname.includes('/review') || location.pathname.includes('/merged') || location.pathname.includes('/dropped') ? 'text-emerald-600' : 'text-zinc-400'}`}
        >
          <LayoutDashboard size={22} />
          <span>Dashboard</span>
        </Link>
        <Link
          to="/app/identity"
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-bold transition-colors ${location.pathname.includes('/identity') ? 'text-emerald-600' : 'text-zinc-400'}`}
        >
          <UserCircle size={22} />
          <span>Settings</span>
        </Link>
        {!user && (
          <Link
            to="/connect"
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-bold text-zinc-400"
          >
            <LogIn size={22} />
            <span>Sign in</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
