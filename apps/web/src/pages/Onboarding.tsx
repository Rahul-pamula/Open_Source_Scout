import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowRight, UserCircle, Code2, Rocket } from 'lucide-react';
import { Skills } from './onboarding/Skills';

export function Onboarding() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!session) {
      navigate('/');
    } else {
      checkExistingProfile();
    }
  }, [session, navigate]);

  const checkExistingProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('bio, skills')
        .eq('id', user.id)
        .maybeSingle();
        
      if (!error && data && data.bio) {
        navigate('/');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !bio.trim()) {
      setError('Please tell us a bit about yourself.');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleComplete = () => {
    setStep(3);
    setTimeout(() => navigate('/'), 1200);
  };

  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[70vh] py-12">
      <div className="w-full bg-white border-2 border-zinc-900 shadow-[8px_8px_0px_#18181b] p-8 md:p-12">
        
        {/* Progress indicator */}
        <div className="flex justify-between items-center mb-12 border-b-2 border-zinc-100 pb-8">
          <div className={`flex flex-col items-center gap-2 ${step >= 1 ? 'text-zinc-900' : 'text-zinc-300'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-zinc-900 bg-emerald-300' : 'border-zinc-300'}`}>
              <UserCircle size={20} />
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Profile</span>
          </div>
          
          <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-zinc-900' : 'bg-zinc-100'}`}></div>
          
          <div className={`flex flex-col items-center gap-2 ${step >= 2 ? 'text-zinc-900' : 'text-zinc-300'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-zinc-900 bg-emerald-300' : 'border-zinc-300'}`}>
              <Code2 size={20} />
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Skills</span>
          </div>
          
          <div className={`flex-1 h-0.5 mx-4 ${step >= 3 ? 'bg-zinc-900' : 'bg-zinc-100'}`}></div>
          
          <div className={`flex flex-col items-center gap-2 ${step >= 3 ? 'text-zinc-900' : 'text-zinc-300'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-zinc-900 bg-emerald-300' : 'border-zinc-300'}`}>
              <Rocket size={20} />
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Ready</span>
          </div>
        </div>

        {/* Step 1: Bio */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Who are you?</h1>
              <p className="text-zinc-500 font-mono text-sm">
                Write a short bio. Scout uses this to generate context-aware comments and find relevant issues.
              </p>
            </div>

            {error && (
              <div id="bio-error" role="alert" className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-sm">
                [ERROR] {error}
              </div>
            )}
            
            <textarea
              id="bio-input"
              className="w-full border-2 border-zinc-200 p-4 min-h-[160px] font-mono text-sm focus:border-zinc-900 focus:ring-0 outline-none transition-colors resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              autoFocus
            />
            
            <button
              id="bio-continue"
              onClick={handleNextStep}
              className="self-end bg-zinc-900 text-white font-bold py-3 px-8 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center"
            >
              Continue <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        )}

        {/* Step 2: Skills (new component) */}
        {step === 2 && (
          <Skills
            bio={bio}
            onBack={() => setStep(1)}
            onComplete={handleComplete}
          />
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Rocket size={40} className="text-emerald-500" />
            <h1 className="text-3xl font-bold tracking-tight">You are ready.</h1>
            <p className="text-zinc-500 font-mono text-sm">Redirecting to Radar...</p>
          </div>
        )}
      </div>
    </div>
  );
}
