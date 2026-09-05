import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Plus, X, Check } from 'lucide-react';
import { NotificationPreferences } from '../components/NotificationPreferences';

const PREDEFINED_SKILLS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c++',
  'c#',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'dart',
  'shell',
  'html',
  'css',
];

export function Identity() {
  const { user } = useAuth();
  const [bio, setBio] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const supabaseUrl =
    localStorage.getItem('OSS_SUPABASE_URL') || import.meta.env.VITE_SUPABASE_URL || 'Unknown URL';

  useEffect(() => {
    if (user) {
      supabase
        .from('users')
        .select('bio, skills')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }: { data: { bio: string; skills: string[] } | null }) => {
          if (data) {
            setBio(data.bio || '');
            setSelectedSkills(data.skills || []);
          }
          setIsLoading(false);
        });
    }
  }, [user]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => prev.filter((s) => s !== skill));
    } else {
      if (selectedSkills.length >= 6) {
        alert('You can select a maximum of 6 skills.');
        return;
      }
      setSelectedSkills((prev) => [...prev, skill]);
    }
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const normalized = customSkill.trim().toLowerCase();
    if (!normalized) return;
    if (selectedSkills.includes(normalized)) {
      setCustomSkill('');
      return;
    }
    if (selectedSkills.length >= 6) {
      alert('You can select a maximum of 6 skills.');
      return;
    }
    setSelectedSkills((prev) => [...prev, normalized]);
    setCustomSkill('');
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const { error } = await supabase
      .from('users')
      .upsert({ id: user.id, bio, skills: selectedSkills });

    setIsSaving(false);
    if (error) {
      alert('Failed to save profile: ' + error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Identity</h1>
      <p className="text-zinc-600 mb-8">
        Your contribution profile, skills, and languages. This data is used by Scout to find issues
        tailored to you.
      </p>

      <div className="bg-white border border-zinc-200 p-6 shadow-sm max-w-2xl mb-8">
        {isLoading ? (
          <div className="flex items-center text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading profile...
          </div>
        ) : (
          <div className="space-y-6">
            {!bio && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-md text-sm">
                <strong>Welcome!</strong> Please fill out your bio and select your skills so Scout
                can find the best issues for you.
              </div>
            )}
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
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-medium text-zinc-900">
                  Skills & Languages
                </label>
                <span className="text-xs text-zinc-500">{selectedSkills.length} / 6 selected</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {PREDEFINED_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                        isSelected
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}

                {selectedSkills
                  .filter((s) => !PREDEFINED_SKILLS.includes(s))
                  .map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className="px-3 py-1.5 rounded-md text-sm font-medium border transition-colors bg-emerald-600 text-white border-emerald-600 shadow-sm flex items-center group"
                      title="Remove skill"
                    >
                      {skill}
                      <X className="w-3 h-3 ml-1.5 opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
              </div>

              <form onSubmit={handleAddCustom} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="flex-1 border border-zinc-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Type another skill (e.g. react, node)..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!customSkill.trim() || selectedSkills.length >= 6}
                  className="bg-zinc-100 text-zinc-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 border border-zinc-200 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </form>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center">
              <button
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className={`px-6 py-2 rounded-md text-sm font-bold flex items-center transition-colors ${
                  saveSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saveSuccess ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : null}
                {saveSuccess ? 'Saved!' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </div>

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

      <NotificationPreferences />
    </div>
  );
}
