import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Uplink() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'Unknown URL';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Uplink</h1>
      <p className="text-zinc-600 mb-8">
        System configuration, API keys, and connections.
      </p>
      
      <div className="bg-white border border-zinc-200 p-6 shadow-sm max-w-2xl mb-8">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900">Decentralized BYOB Connection</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <span className="font-medium text-zinc-900">GitHub OAuth Session</span>
            <span className="text-emerald-600 text-sm font-medium">Active</span>
          </div>
          <div className="flex flex-col border-b border-zinc-100 pb-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-zinc-900">Personal Supabase Instance</span>
              <span className="text-emerald-600 text-sm font-medium">Connected</span>
            </div>
            <code className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded">{supabaseUrl}</code>
          </div>
          <div className="flex items-center justify-between pt-4">
            <span className="font-medium text-zinc-900">Edge Functions</span>
            <span className="text-emerald-600 text-sm font-medium">Operational</span>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSignOut}
        className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Disconnect & Sign Out
      </button>
    </div>
  );
}
