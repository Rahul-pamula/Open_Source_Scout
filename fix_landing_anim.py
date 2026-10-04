import re

with open('apps/web/src/pages/Landing.tsx', 'r') as f:
    content = f.read()

# Add imports if not there
if "useState" not in content:
    content = "import { useState, useEffect } from 'react';\n" + content

# Define animation component
anim_component = """

const PipelineAnimation = () => {
  const [step, setStep] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 5);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const stages = [
    { label: 'Discovery', tab: 'DISCOVERY', badge: 'UNEVALUATED', badgeColor: 'bg-zinc-100 text-zinc-600', action: 'Evaluate Issue' },
    { label: 'Claimed', tab: 'CLAIMED', badge: 'CLAIMED', badgeColor: 'bg-blue-100 text-blue-700', action: 'Start Coding' },
    { label: 'Assigned', tab: 'ASSIGNED', badge: 'ASSIGNED', badgeColor: 'bg-indigo-100 text-indigo-700', action: 'Mark Under Review' },
    { label: 'Under Review', tab: 'UNDER REVIEW', badge: 'REVIEW', badgeColor: 'bg-amber-100 text-amber-700', action: 'Merge PR' },
    { label: 'Merged', tab: 'MERGED', badge: 'MERGED', badgeColor: 'bg-purple-100 text-purple-700', action: 'Celebrate 🎉' }
  ];

  const current = stages[step];

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col font-sans transition-all duration-500">
      {/* Fake Header/Tabs */}
      <div className="border-b border-zinc-200 px-4 md:px-6 pt-4 flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar">
        {stages.map((s, i) => (
          <div key={s.tab} className={`pb-3 text-[10px] md:text-xs font-bold tracking-wider transition-colors duration-500 whitespace-nowrap ${step === i ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-zinc-400'}`}>
            {s.tab}
          </div>
        ))}
      </div>
      {/* Fake Issue Card */}
      <div className="p-4 md:p-8 bg-zinc-50/50 flex-1 flex items-center justify-center min-h-[250px]">
        <div className="bg-white border border-zinc-200 p-5 md:p-6 rounded-lg shadow-sm w-full max-w-md transform transition-all duration-500 hover:-translate-y-1 hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors duration-500 ${current.badgeColor}`}>
              {current.badge}
            </span>
            <span className="text-zinc-400 text-xs font-mono">#294</span>
          </div>
          <h4 className="font-bold text-zinc-900 mb-2 text-sm md:text-base">Implement Animated Pipeline UI</h4>
          <p className="text-xs text-zinc-500 mb-5 flex items-center gap-1">
            <GitBranch size={12} />
            Rahul-pamula/Open_Source_Scout
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 font-medium">good first issue</span>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 font-medium">enhancement</span>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-all duration-300 hover:bg-emerald-600 flex items-center gap-2">
              {current.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
"""

# Insert component right before export function Landing()
content = content.replace("export function Landing() {", anim_component + "\nexport function Landing() {")

# Replace Evolution section
old_evo = r'\{/\* Evolution Section \*/\}.*?(?=\{/\* The Problem & Workflow \*/\})'

new_evo = """{/* Animated Pipeline Section */}
      <div className="max-w-5xl w-full px-6 mb-32 relative z-10 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight mb-4">
            The Mission Control Pipeline.
          </h2>
          <p className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Stop guessing where your contributions are. Scout organizes every issue into a clean, automated Kanban flow from discovery to merge.
          </p>
        </div>
        
        <PipelineAnimation />
      </div>
      
      """

content = re.sub(old_evo, new_evo, content, flags=re.DOTALL)

with open('apps/web/src/pages/Landing.tsx', 'w') as f:
    f.write(content)

print("Landing page animated pipeline updated")
