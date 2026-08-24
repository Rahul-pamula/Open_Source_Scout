import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

// ── Data ────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust',
  'Java', 'C++', 'C', 'Ruby', 'PHP', 'Kotlin', 'Swift',
];

const FRAMEWORKS = [
  'React', 'Next.js', 'Vue', 'Svelte', 'Angular',
  'FastAPI', 'Django', 'Flask', 'Rails', 'Express', 'NestJS', 'Spring',
];

const DOMAINS = [
  'AI/ML', 'DevTools', 'Web3', 'CLI', 'Infrastructure',
  'Mobile', 'Databases', 'Security', 'Compilers', 'Networking',
];

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Senior';

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Senior'];

// ── Types ────────────────────────────────────────────────────────────────────

export interface SkillsFormData {
  languages: string[];
  frameworks: string[];
  domains: string[];
  experience: ExperienceLevel | null;
}

interface SkillsProps {
  onBack: () => void;
  onComplete: () => void;
  bio: string;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  id,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  id: string;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-semibold text-zinc-900 mb-2 uppercase tracking-wide font-mono">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2" id={id}>
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              id={`chip-${id}-${opt.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
              onClick={() => onToggle(opt)}
              aria-pressed={active}
              className={`px-3 py-1.5 text-sm font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
                active
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-900 hover:text-zinc-900'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function Skills({ onBack, onComplete, bio }: SkillsProps) {
  const { user } = useAuth();

  const [languages, setLanguages] = useState<string[]>([]);
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [errors, setErrors] = useState<Partial<Record<'languages' | 'experience', string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const toggle = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ) => {
    setList((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
    );
    // Clear language error on interaction
    if (list === languages || setList === setLanguages) {
      setErrors((e) => ({ ...e, languages: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (languages.length === 0) next.languages = 'Select at least one language.';
    if (!experience) next.experience = 'Experience level is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;

    setIsLoading(true);
    setServerError(null);

    try {
      const allSkills = [...languages, ...frameworks, ...domains];

      const { error } = await supabase.from('users').upsert({
        id: user.id,
        bio,
        skills: allSkills,
        experience_level: experience,
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      onComplete();
    } catch (err) {
      const e = err as Error;
      setServerError(e.message || 'Failed to save profile. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Define your skills.</h1>
        <p className="text-zinc-500 font-mono text-sm">
          Scout uses this to match you with issues you can actually solve.
        </p>
      </div>

      {serverError && (
        <div
          id="skills-server-error"
          role="alert"
          className="bg-red-50 border border-red-200 text-red-600 p-3 font-mono text-sm"
        >
          [ERROR] {serverError}
        </div>
      )}

      {/* Languages */}
      <div className="flex flex-col gap-1">
        <ChipGroup
          id="languages"
          label="Primary Languages *"
          options={LANGUAGES}
          selected={languages}
          onToggle={(v) => toggle(languages, setLanguages, v)}
        />
        {errors.languages && (
          <p id="languages-error" role="alert" className="text-red-500 text-xs font-mono mt-1">
            {errors.languages}
          </p>
        )}
      </div>

      {/* Frameworks */}
      <ChipGroup
        id="frameworks"
        label="Frameworks"
        options={FRAMEWORKS}
        selected={frameworks}
        onToggle={(v) => toggle(frameworks, setFrameworks, v)}
      />

      {/* Domains */}
      <ChipGroup
        id="domains"
        label="Domain Interests"
        options={DOMAINS}
        selected={domains}
        onToggle={(v) => toggle(domains, setDomains, v)}
      />

      {/* Experience Level */}
      <div className="flex flex-col gap-1">
        <fieldset>
          <legend className="block text-sm font-semibold text-zinc-900 mb-2 uppercase tracking-wide font-mono">
            Experience Level *
          </legend>
          <div className="flex gap-3" id="experience-level">
            {EXPERIENCE_LEVELS.map((level) => (
              <label
                key={level}
                htmlFor={`exp-${level.toLowerCase()}`}
                className={`flex items-center gap-2 px-4 py-2 border cursor-pointer font-mono text-sm transition-colors ${
                  experience === level
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900'
                }`}
              >
                <input
                  type="radio"
                  id={`exp-${level.toLowerCase()}`}
                  name="experience"
                  value={level}
                  checked={experience === level}
                  onChange={() => {
                    setExperience(level);
                    setErrors((e) => ({ ...e, experience: undefined }));
                  }}
                  className="sr-only"
                />
                {level}
              </label>
            ))}
          </div>
        </fieldset>
        {errors.experience && (
          <p id="experience-error" role="alert" className="text-red-500 text-xs font-mono mt-1">
            {errors.experience}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
        <button
          id="skills-back"
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-900 font-bold font-mono text-sm flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          id="skills-submit"
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-emerald-500 text-white font-bold py-3 px-8 shadow-[4px_4px_0px_#18181b] border-2 border-zinc-900 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#18181b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          {isLoading ? 'Saving...' : 'Finish Setup'}
        </button>
      </div>
    </div>
  );
}
