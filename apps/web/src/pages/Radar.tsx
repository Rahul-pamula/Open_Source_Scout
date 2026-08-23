import { IssueCard } from '../components/IssueCard';
import type { ScoutedIssue } from '../types';

const MOCK_ISSUE: ScoutedIssue = {
  id: '1',
  url: 'https://github.com/facebook/react/issues/1',
  title: 'Add caching layer to the experimental API client',
  body: 'We need to implement a caching layer...',
  repoName: 'facebook/react',
  repoUrl: 'https://github.com/facebook/react',
  state: 'open',
  isAssigned: false,
  labels: ['good first issue', 'enhancement'],
  createdAt: new Date().toISOString(),
  evaluation: {
    matchScore: 92,
    intent: 'Implement caching layer',
    explanation: 'Your extensive experience with Redis and API design makes this a perfect match for your skillset.'
  }
};

export function Radar() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Discover Issues</h1>
      <p className="text-zinc-600 mb-8">
        Find issues that match your skills, interests, and contribution goals.
      </p>
      
      <button className="bg-emerald-500 text-white font-bold py-3 px-6 shadow-[4px_4px_0px_#18181b] border-2 border-zinc-900 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all mb-12">
        Discover Issues
      </button>

      <div className="flex flex-col gap-6">
        <h2 className="font-semibold text-lg border-b border-zinc-200 pb-2">Recommended for you</h2>
        <IssueCard issue={MOCK_ISSUE} onSave={(id) => console.log('Saved', id)} />
      </div>
    </div>
  );
}
