import { useParams, Link } from 'react-router-dom';

export function Dossier() {
  const { id } = useParams();
  
  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Back to Radar</Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Issue Dossier {id && `#${id}`}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">GitHub Facts</h2>
          <p className="text-zinc-600">Repository data, exact issue title, labels, and activity.</p>
        </div>
        
        <div className="bg-white border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-emerald-600">Scout Analysis</h2>
          <p className="text-zinc-600">Why this matches your profile, difficulty estimation, and duplicate claimant detection.</p>
        </div>
      </div>
    </div>
  );
}
