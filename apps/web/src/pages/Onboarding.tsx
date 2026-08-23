import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2, ArrowRight, UserCircle, Code2, Rocket } from 'lucide-react';

export function Onboarding() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!session) {
      navigate('/');
    } else {
      // Check if user already has a profile
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
        .single();
        
      if (!error && data && data.bio) {
        // If they already have a bio, skip onboarding
        navigate('/radar');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !bio.trim()) {
      setError("Please tell us a bit about yourself.");
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleFinish = async () => {
    if (!skillsText.trim()) {
      setError("Please enter some skills.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
      
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user?.id,
          bio: bio,
          skills: skills,
          updated_at: new Date().toISOString()
        });
        
      if (upsertError) throw new Error(upsertError.message);
      
      // Successfully saved profile
      navigate('/radar');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      setIsLoading(false);
    }
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 mb-6 font-mono text-sm">
            [ERROR] {error}
          </div>
        )}

        {/* Step 1: Bio */}
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Who are you?</h1>
              <p className="text-zinc-500 font-mono text-sm">
                Write a short bio. The Scout AI uses this to find issues that match your background and generate context-aware comments.
              </p>
            </div>
            
            <textarea
              className="w-full border-2 border-zinc-200 p-4 min-h-[160px] font-mono text-sm focus:border-zinc-900 focus:ring-0 outline-none transition-colors resize-y"
              placeholder="E.g., I'm a full-stack developer with 3 years of experience. I love working with React, TypeScript, and Node.js. I'm looking to contribute to developer tools and frontend libraries..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              autoFocus
            />
            
            <button 
              onClick={handleNextStep}
              className="self-end bg-zinc-900 text-white font-bold py-3 px-8 shadow-[4px_4px_0px_#10b981] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#10b981] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center"
            >
              Continue <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        )}

        {/* Step 2: Skills */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">What are your skills?</h1>
              <p className="text-zinc-500 font-mono text-sm">
                Enter your top skills, separated by commas. This helps strictly filter issues based on the languages and frameworks you know.
              </p>
            </div>
            
            <input
              type="text"
              className="w-full border-2 border-zinc-200 p-4 font-mono text-sm focus:border-zinc-900 focus:ring-0 outline-none transition-colors"
              placeholder="e.g., TypeScript, React, Python, Docker"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              autoFocus
            />
            
            <div className="flex justify-between items-center mt-4">
              <button 
                onClick={() => setStep(1)}
                className="text-zinc-500 hover:text-zinc-900 font-bold font-mono text-sm"
              >
                ← Back
              </button>
              
              <button 
                onClick={handleFinish}
                disabled={isLoading}
                className="bg-emerald-500 text-white font-bold py-3 px-8 shadow-[4px_4px_0px_#18181b] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#18181b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {isLoading ? 'Saving...' : 'Finish Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
