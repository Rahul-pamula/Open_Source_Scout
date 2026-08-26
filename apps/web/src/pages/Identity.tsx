import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { NotificationPreferences } from '../components/NotificationPreferences';

export function Identity() {
  const { user } = useAuth();
  const [bio, setBio] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('users').select('bio, skills').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setBio(data.bio || '');
          setSkillsStr((data.skills || []).join(', '));
        }
        setIsLoading(false);
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const skillsArray = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
    
    const { error } = await supabase
      .from('users')
      .upsert({ id: user.id, bio, skills: skillsArray });
      
    setIsSaving(false);
    if (error) {
      alert('Failed to save profile: ' + error.message);
    } else {
      alert('Profile updated successfully!');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Identity</h1>
      <p className="text-zinc-600 mb-8">
        Your contribution profile, skills, and languages. This data is used by Scout to find issues tailored to you.
      </p>
      
      <div className="bg-white border border-zinc-200 p-6 shadow-sm max-w-2xl">
        {isLoading ? (
          <div className="flex items-center text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading profile...
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-1">Developer Bio</label>
              <textarea 
                className="w-full border border-zinc-200 rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="e.g. I am a frontend developer specializing in React and UI/UX."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-1">Skills & Languages</label>
              <p className="text-xs text-zinc-500 mb-2">Comma separated (e.g. typescript, python, rust)</p>
              <input 
                type="text"
                className="w-full border border-zinc-200 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="typescript, react, node"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
              />
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Profile
            </button>
          </div>
        )}
      </div>
      <NotificationPreferences />
    </div>
  );
}
