# Solution for Issue #54

## 🛠️ Proposed Solution (by Aditya Waghamare)

### Analysis
We need to create the `apps/web/src/pages/Settings.tsx` page for Open_Source_Scout to manage autonomy settings (L1, L2, L3) and the Autonomous Allowlist (`owner/repo` strings) with clean, minimal technical styling adhering to the 'Light. Precise. Technical. Quiet.' design philosophy, including localStorage persistence, an explicit L3 confirmation modal, and clear loading/empty states.

### Fix
Created `apps/web/src/pages/Settings.tsx` with full state management, allowlist input validation, autonomy level selection cards with clear explanations, and L3 confirmation dialog.

### Implementation
```tsx
import React, { useState, useEffect } from 'react';

type AutonomyLevel = 'L1' | 'L2' | 'L3';

interface SettingsState {
  autonomyLevel: AutonomyLevel;
  allowlist: string[];
  newRepoInput: string;
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('scout_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          autonomyLevel: parsed.autonomyLevel || 'L1',
          allowlist: parsed.allowlist || [],
          newRepoInput: '',
        };
      } catch (e) {
        // fallback
      }
    }
    return {
      autonomyLevel: 'L1',
      allowlist: ['Rahul-pamula/Open_Source_Scout'],
      newRepoInput: '',
    };
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingLevel, setPendingLevel] = useState<AutonomyLevel>('L1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'scout_settings',
      JSON.stringify({
        autonomyLevel: settings.autonomyLevel,
        allowlist: settings.allowlist,
      })
    );
  }, [settings.autonomyLevel, settings.allowlist]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddRepo = (e: React.FormEvent) => {
    e.preventDefault();
    const repo = settings.newRepoInput.trim();
    if (!repo) return;

    if (!repo.includes('/') || repo.split('/').length !== 2) {
      showToast('Error: Repository must be in format owner/repo');
      return;
    }

    if (settings.allowlist.includes(repo)) {
      showToast('Repository already in allowlist');
      return;
    }

    setSettings((prev) => ({
      ...prev,
      allowlist: [...prev.allowlist, repo],
      newRepoInput: '',
    }));
    showToast(`Added ${repo} to allowlist`);
  };

  const handleRemoveRepo = (repoToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      allowlist: prev.allowlist.filter((r) => r !== repoToRemove),
    }));
    showToast(`Removed ${repoToRemove} from allowlist`);
  };

  const handleLevelSelect = (level: AutonomyLevel) => {
    if (level === 'L3' && settings.autonomyLevel !== 'L3') {
      setPendingLevel('L3');
      setShowConfirmModal(true);
    } else {
      setSettings((prev) => ({ ...prev, autonomyLevel: level }));
      showToast(`Autonomy level updated to ${level}`);
    }
  };

  const confirmL3 = () => {
    setSettings((prev) => ({ ...prev, autonomyLevel: 'L3' }));
    setShowConfirmModal(false);
    showToast('Autonomy level updated to L3 (Auto-Post)');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-200 p-8 font-mono flex items-center justify-center">
        <div className="text-sm tracking-widest text-neutral-500 animate-pulse">
          LOADING SETTINGS...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 font-sans selection:bg-neutral-800">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="border-b border-neutral-800 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
              Scout Settings
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Configure autonomy boundaries and repository allowlists.
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-500 border border-neutral-800 px-3 py-1.5 rounded-md bg-neutral-900">
            SYSTEM: ACTIVE
          </div>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs px-4 py-3 rounded shadow-lg font-mono">
            {toastMessage}
          </div>
        )}

        {/* Autonomy Level Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
              Autonomy Level
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Determine how independently Scout interacts with your repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* L1 */}
            <button
              onClick={() => handleLevelSelect('L1')}
              className={`text-left p-4 rounded-lg border transition-all ${
                settings.autonomyLevel === 'L1'
                  ? 'bg-neutral-900 border-neutral-400 text-neutral-100 shadow-sm'
                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-neutral-300">L1</span>
                <span className="text-xs font-mono text-neutral-500">Manual</span>
              </div>
              <h3 className="font-medium text-sm mb-1 text-neutral-200">Manual Approval</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Scout suggests patches. Every action requires explicit human confirmation.
              </p>
            </button>

            {/* L2 */}
            <button
              onClick={() => handleLevelSelect('L2')}
              className={`text-left p-4 rounded-lg border transition-all ${
                settings.autonomyLevel === 'L2'
                  ? 'bg-neutral-900 border-neutral-400 text-neutral-100 shadow-sm'
                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-neutral-300">L2</span>
                <span className="text-xs font-mono text-neutral-500">Auto-Draft</span>
              </div>
              <h3 className="font-medium text-sm mb-1 text-neutral-200">Draft Creation</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Scout automatically prepares PRs and issues as drafts for review.
              </p>
            </button>

            {/* L3 */}
            <button
              onClick={() => handleLevelSelect('L3')}
              className={`text-left p-4 rounded-lg border transition-all ${
                settings.autonomyLevel === 'L3'
                  ? 'bg-neutral-900 border-neutral-400 text-neutral-100 shadow-sm'
                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-neutral-300">L3</span>
                <span className="text-xs font-mono text-neutral-500">Auto-Post</span>
              </div>
              <h3 className="font-medium text-sm mb-1 text-neutral-200">Full Autonomy</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Scout executes tasks and publishes comments/PRs without human gating.
              </p>
            </button>

          </div>
        </section>

        {/* Autonomous Allowlist Section */}
        <section className="space-y-4 pt-4 border-t border-neutral-800">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
              Autonomous Allowlist
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Repositories where Scout is permitted to operate autonomously.
            </p>
          </div>

          <form onSubmit={handleAddRepo} className="flex gap-2">
            <input
              type="text"
              placeholder="owner/repo (e.g., torvalds/linux)"
              value={settings.newRepoInput}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, newRepoInput: e.target.value }))
              }
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 font-mono"
            />
            <button
              type="submit"
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium px-4 py-2 rounded-md transition-colors font-mono"
            >
              Add Repository
            </button>
          </form>

          <div className="border border-neutral-800 rounded-lg bg-neutral-900/50 divide-y divide-neutral-800">
            {settings.allowlist.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-mono">
                No repositories configured in allowlist.
              </div>
            ) : (
              settings.allowlist.map((repo) => (
                <div
                  key={repo}
                  className="flex items-center justify-between px-4 py-3 text-xs font-mono"
                >
                  <span className="text-neutral-300">{repo}</span>
                  <button
                    onClick={() => handleRemoveRepo(repo)}
                    className="text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* L3 Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-700 max-w-md w-full p-6 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-neutral-100 font-mono tracking-wide">
              CONFIRM L3 AUTONOMY ACTIVATION
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Enabling Level 3 Autonomy allows Scout to execute actions and post pull requests or comments directly to GitHub repositories on your allowlist without manual gatekeeping.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmL3}
                className="px-4 py-2 text-xs bg-neutral-100 text-neutral-900 hover:bg-white font-mono font-medium rounded transition-colors"
              >
                I Understand, Enable L3
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Testing
1. Verified navigation rendering and initial loading state.
2. Tested allowlist addition and removal with format validation (`owner/repo`).
3. Tested L1, L2, and L3 selection workflow including explicit L3 confirmation modal.
4. Verified localStorage state persistence across reloads.


---
*Submitted by Aditya Waghamare*
💰 **Payout Address (Base L2 / EVM):** `0xb61dBcdBc3407F71EaCb64D4CBFAcf9FFfe2415C`