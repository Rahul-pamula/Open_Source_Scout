import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowRight, ShieldCheck, Database, GitMerge } from 'lucide-react';

const PREDEFINED_SKILLS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c++',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
];

export function Identity() {
  const { user, userProfile, refreshProfile } = useAuth();

  // Local state for editing
  const [bio, setBio] = useState('');
  const [githubHandle, setGithubHandle] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const supabaseUrl =
    localStorage.getItem('OSS_SUPABASE_URL') || import.meta.env.VITE_SUPABASE_URL || 'Unknown URL';

  useEffect(() => {
    if (userProfile) {
      setBio(userProfile.bio || '');
      setGithubHandle(userProfile.github_handle || '');
      setSelectedSkills(userProfile.skills || []);
    }
  }, [userProfile]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => prev.filter((s) => s !== skill));
    } else {
      setSelectedSkills((prev) => [...prev, skill]);
    }
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const normalized = customSkill.trim().toLowerCase();
    if (!normalized) return;
    if (!selectedSkills.includes(normalized)) {
      setSelectedSkills((prev) => [...prev, normalized]);
    }
    setCustomSkill('');
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      bio,
      github_handle: githubHandle,
      skills: selectedSkills,
    });

    if (error) {
      alert('Failed to save profile: ' + error.message);
    } else {
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8 border-b border-zinc-200 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">Settings</h1>
        <p className="text-zinc-500 font-mono text-sm">
          Manage your Scout identity and connections.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Profile Section */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-900 mb-4 font-mono">
            Profile
          </h2>
          <div className="bg-white border-2 border-zinc-200 p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-zinc-900">GitHub Handle</label>
                <div className="flex items-center">
                  <span className="bg-zinc-100 border-2 border-r-0 border-zinc-200 p-2 text-zinc-500 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    className="flex-1 border-2 border-zinc-200 p-2 font-mono text-sm focus:border-zinc-900 focus:ring-0 outline-none transition-colors"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-zinc-900">Developer Bio</label>
                <textarea
                  className="w-full border-2 border-zinc-200 p-3 min-h-[100px] font-mono text-sm focus:border-zinc-900 focus:ring-0 outline-none transition-colors resize-y"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-zinc-900 mb-1">Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PREDEFINED_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 font-mono text-xs uppercase tracking-wide border-2 transition-colors ${
                        selectedSkills.includes(skill)
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-900 hover:text-zinc-900'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                  {selectedSkills
                    .filter((s) => !PREDEFINED_SKILLS.includes(s))
                    .map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className="px-3 py-1 font-mono text-xs uppercase tracking-wide border-2 bg-zinc-900 text-white border-zinc-900"
                        title="Remove skill"
                      >
                        {skill} &times;
                      </button>
                    ))}
                </div>
                <form onSubmit={handleAddCustom} className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 border-2 border-zinc-200 p-2 font-mono text-sm focus:border-zinc-900 focus:ring-0 outline-none transition-colors max-w-xs"
                    placeholder="Custom skill..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!customSkill.trim()}
                    className="bg-zinc-100 text-zinc-900 font-bold px-4 py-2 border-2 border-zinc-200 hover:border-zinc-900 hover:bg-white disabled:opacity-50 transition-colors font-mono text-sm uppercase tracking-wide"
                  >
                    Add
                  </button>
                </form>
              </div>

              <div className="pt-6 mt-2 border-t-2 border-zinc-100">
                <button
                  onClick={handleSave}
                  disabled={isSaving || saveSuccess}
                  className={`px-6 py-2.5 font-bold flex items-center transition-all border-2 ${
                    saveSuccess
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-[4px_4px_0px_#064e3b]'
                      : 'bg-zinc-900 text-white border-zinc-900 shadow-[4px_4px_0px_#18181b] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#18181b] active:translate-x-1 active:translate-y-1 active:shadow-none'
                  } disabled:opacity-50`}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {saveSuccess ? 'Saved' : 'Save Profile'}
                  {!isSaving && !saveSuccess && <ArrowRight className="w-4 h-4 ml-2" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Connections Section */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-900 mb-4 font-mono">
            Connections
          </h2>
          <div className="bg-white border-2 border-zinc-200 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-4">
              <div className="flex items-center gap-3">
                <GitMerge className="text-zinc-400" size={20} />
                <span className="font-bold text-zinc-900">GitHub OAuth</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 border-2 border-emerald-200 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-4 pt-2">
              <div className="flex items-center gap-3">
                <Database className="text-zinc-400" size={20} />
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-900">Supabase Instance</span>
                  <code className="text-[10px] text-zinc-500 font-mono mt-1">{supabaseUrl}</code>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 border-2 border-emerald-200 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-zinc-400" size={20} />
                <span className="font-bold text-zinc-900">Edge Functions</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 border-2 border-emerald-200 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest">
                Operational
              </span>
            </div>
          </div>
        </section>

        {/* Security & Data Section */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-900 mb-4 font-mono">
            Security & Data
          </h2>
          <div className="bg-zinc-50 border-2 border-zinc-200 p-6 text-sm text-zinc-600 font-mono leading-relaxed">
            <p className="mb-4">
              <strong className="text-zinc-900 font-bold uppercase">
                This Scout installation uses your own backend.
              </strong>
            </p>
            <ul className="list-disc list-inside flex flex-col gap-2">
              <li>Scout does not provide a central database for users.</li>
              <li>Your data lives exclusively in your personal Supabase project.</li>
              <li>Authentication is handled directly by your Supabase Auth instance.</li>
              <li>GitHub access is performed securely using your configured GitHub credentials.</li>
              <li>API secrets remain safely stored in your backend environment.</li>
              <li>The hosted frontend is simply an interface; it stores no sensitive data.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
