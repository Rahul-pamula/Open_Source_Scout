export function Operations() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Active Operations</h1>
      <p className="text-zinc-600 mb-8">
        Track your discovered, drafted, and assigned contributions.
      </p>
      
      <div className="bg-white border border-zinc-200 p-6 shadow-sm">
        <p className="text-zinc-500 italic">No active operations.</p>
      </div>
    </div>
  );
}
