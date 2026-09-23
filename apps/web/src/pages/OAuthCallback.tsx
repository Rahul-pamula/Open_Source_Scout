import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(error);
        }

        if (!code) {
          throw new Error('No authorization code provided');
        }

        // Normally here we would exchange the code for a token using our backend.
        // e.g. await supabase.functions.invoke('oauth-exchange', { body: { provider, code } })

        // Simulating the backend request delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setStatus('success');
        setMessage(`Successfully connected to ${provider}.`);

        setTimeout(() => {
          navigate('/app/identity');
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Authentication failed');
      }
    }

    handleCallback();
  }, [provider, searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-mono">
      <div className="bg-white border-2 border-zinc-200 p-8 shadow-[4px_4px_0px_#18181b] max-w-md w-full text-center">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-zinc-900 mb-6">
          {provider} Integration
        </h1>

        <div className="flex flex-col items-center justify-center min-h-[120px]">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-zinc-900" />
              <p className="text-zinc-600 text-sm">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="text-emerald-700 text-sm font-bold">{message}</p>
              <p className="text-zinc-500 text-xs mt-2">Redirecting you back...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="w-12 h-12 text-red-500" />
              <p className="text-red-700 text-sm font-bold">Failed to connect</p>
              <p className="text-zinc-500 text-xs bg-zinc-100 p-2 rounded">{message}</p>
              <button
                onClick={() => navigate('/app/identity')}
                className="mt-4 px-4 py-2 bg-zinc-900 text-white text-xs font-bold uppercase tracking-wide border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] hover:translate-y-px hover:translate-x-px hover:shadow-none transition-all"
              >
                Return to Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
