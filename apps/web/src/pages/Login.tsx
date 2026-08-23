import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { user, signInWithGithub } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 border border-zinc-200 shadow-sm max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 tracking-tight text-center">Open Source Scout</h1>
        <p className="text-zinc-600 mb-8 text-center">Sign in to track contributions and configure autonomous engagement.</p>
        
        <button 
          onClick={signInWithGithub}
          className="w-full bg-zinc-900 text-white font-bold py-3 px-6 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center space-x-2"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <span>Continue with GitHub</span>
        </button>
      </div>
    </div>
  );
}
