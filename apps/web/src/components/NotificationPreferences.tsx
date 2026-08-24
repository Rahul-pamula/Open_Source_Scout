import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export interface NotificationPrefs {
  responses: boolean;
  assignments: boolean;
  reviews: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  responses: true,
  assignments: true,
  reviews: false,
};

const STORAGE_KEY = 'oss_notification_prefs';

const PREF_META: {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
}[] = [
  {
    key: 'responses',
    label: 'Issue Responses',
    description: 'Notify when someone comments on an issue you are tracking.',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    description: 'Notify when a maintainer assigns an issue to you.',
  },
  {
    key: 'reviews',
    label: 'PR Reviews',
    description: 'Notify when your pull request receives a review.',
  },
];

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch {
      // ignore malformed data
    }
  }, []);

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const allEnabled = Object.values(prefs).every(Boolean);

  const toggleAll = () => {
    const next = !allEnabled;
    setPrefs({ responses: next, assignments: next, reviews: next });
    setSaved(false);
  };

  return (
    <div className="bg-white border border-zinc-200 p-6 shadow-sm max-w-2xl mt-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
          <Bell size={18} className="text-emerald-500" />
          Notification Preferences
        </h2>
        <button
          id="toggle-all-notifications"
          onClick={toggleAll}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 underline underline-offset-2 transition-colors"
        >
          {allEnabled ? 'Disable all' : 'Enable all'}
        </button>
      </div>
      <p className="text-sm text-zinc-500 mb-5">
        Choose which events Scout should flag for your attention.{' '}
        <span className="text-zinc-400">(Delivery not yet implemented.)</span>
      </p>

      <div className="flex flex-col divide-y divide-zinc-100">
        {PREF_META.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between py-4">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-zinc-900">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
            </div>
            <button
              id={`notif-toggle-${key}`}
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => toggle(key)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                prefs[key]
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'bg-zinc-200 border-zinc-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                  prefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-100">
        <button
          id="save-notification-prefs"
          onClick={handleSave}
          className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
        >
          {saved ? (
            <>
              <span className="text-emerald-400">✓</span> Saved
            </>
          ) : (
            'Save Preferences'
          )}
        </button>
        {!saved && (
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <BellOff size={12} />
            Stored locally in your browser
          </span>
        )}
      </div>
    </div>
  );
}
