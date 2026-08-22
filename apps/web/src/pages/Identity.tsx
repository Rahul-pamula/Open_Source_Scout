export function Identity() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Identity</h1>
      <p className="text-zinc-600 mb-8">
        Your contribution profile, skills, and languages.
      </p>
      
      <div className="bg-white border border-zinc-200 p-6 shadow-sm max-w-2xl">
        <p className="text-zinc-500 italic">Profile loading...</p>
      </div>
    </div>
  );
}
