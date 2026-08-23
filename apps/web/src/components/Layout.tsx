import { Link, Outlet } from 'react-router-dom';
import { Target, Activity, Settings, User as UserIcon, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col md:flex-row">
      <nav className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-zinc-200 flex flex-col p-4">
        <div className="font-bold text-lg mb-8 tracking-tight">Open Source Scout</div>
        
        <div className="flex flex-col space-y-2 flex-1">
          <Link to="/" className="flex items-center space-x-2 p-2 hover:bg-zinc-100 rounded-md">
            <Target size={20} />
            <span>Radar</span>
          </Link>
          <Link to="/operations" className="flex items-center space-x-2 p-2 hover:bg-zinc-100 rounded-md">
            <Activity size={20} />
            <span>Operations</span>
          </Link>
          <Link to="/identity" className="flex items-center space-x-2 p-2 hover:bg-zinc-100 rounded-md">
            <UserIcon size={20} />
            <span>Identity</span>
          </Link>
          <Link to="/uplink" className="flex items-center space-x-2 p-2 hover:bg-zinc-100 rounded-md">
            <Settings size={20} />
            <span>Uplink</span>
          </Link>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-100">
          {user ? (
            <div className="flex flex-col space-y-2">
              <div className="text-sm font-medium text-zinc-600 truncate px-2">
                {user.email}
              </div>
              <button 
                onClick={signOut}
                className="flex items-center space-x-2 p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 rounded-md text-left w-full transition-colors"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="flex items-center space-x-2 p-2 hover:bg-zinc-100 text-zinc-900 rounded-md font-medium">
              <LogIn size={20} />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </nav>
      
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
