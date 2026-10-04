import re

with open('apps/web/src/pages/Landing.tsx', 'r') as f:
    content = f.read()

# 1. Update lucide-react imports to include CheckCircle
if "CheckCircle" not in content:
    content = content.replace("Layers } from 'lucide-react';", "Layers, CheckCircle } from 'lucide-react';")

# 2. Update PipelineAnimation to include DROPPED
old_pipeline = r"const stages = \[.*?\];"
new_pipeline = """const stages = [
    { label: 'Discovery', tab: 'DISCOVERY', badge: 'UNEVALUATED', badgeColor: 'bg-zinc-100 text-zinc-600', action: 'Evaluate Issue' },
    { label: 'Claimed', tab: 'CLAIMED', badge: 'CLAIMED', badgeColor: 'bg-blue-100 text-blue-700', action: 'Start Coding' },
    { label: 'Assigned', tab: 'ASSIGNED', badge: 'ASSIGNED', badgeColor: 'bg-indigo-100 text-indigo-700', action: 'Mark Under Review' },
    { label: 'Under Review', tab: 'UNDER REVIEW', badge: 'REVIEW', badgeColor: 'bg-amber-100 text-amber-700', action: 'Merge PR' },
    { label: 'Merged', tab: 'MERGED', badge: 'MERGED', badgeColor: 'bg-purple-100 text-purple-700', action: 'Celebrate 🎉' },
    { label: 'Dropped', tab: 'DROPPED', badge: 'DROPPED', badgeColor: 'bg-red-100 text-red-700', action: 'Find New Issue' }
  ];"""
content = re.sub(old_pipeline, new_pipeline, content, flags=re.DOTALL)

# Update step modulo from 5 to 6
content = content.replace("setStep((s) => (s + 1) % 5);", "setStep((s) => (s + 1) % 6);")

# 3. Add McpAnimation component
mcp_anim = """
const McpAnimation = () => {
  const [step, setStep] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0d1117] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono transition-all duration-500 h-[280px]">
      <div className="bg-[#161b22] border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        </div>
        <div className="text-zinc-500 text-[10px] ml-4 flex-1 text-center font-sans tracking-wide">IDE Terminal</div>
      </div>
      
      <div className="p-6 text-xs md:text-sm text-zinc-300 flex-1 relative overflow-hidden">
        <div className={`absolute transition-opacity duration-500 ${step === 0 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-zinc-500 mb-2"># 1. Connect IDE to Scout</div>
          <div className="text-emerald-400">{'<System>'} Connecting to Scout MCP Server...</div>
          <div className="text-emerald-400 mt-1">{'<System>'} Validating JSON configuration...</div>
          <div className="text-zinc-300 mt-4 flex items-center gap-2">
             <span className="text-purple-400">{'<You>'}</span> Fix the padding bug in the header.
          </div>
          <div className="text-blue-400 mt-1 animate-pulse">{'<AI Agent>'} Analyzing request...</div>
        </div>

        <div className={`absolute transition-opacity duration-500 ${step === 1 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-zinc-500 mb-2"># 2. Scout provisions isolated worktree</div>
          <div className="text-indigo-400">$ scout worktree create session-a1b2c3</div>
          <div className="text-zinc-400 mt-1">Creating isolated git worktree at .scout-tmp/worktrees/session-a1b2c3</div>
          <div className="text-zinc-400">Head is now at 2438856...</div>
          <div className="text-emerald-400 mt-2 font-bold flex items-center gap-2">
            <CheckCircle size={14} /> Isolation boundary established.
          </div>
        </div>

        <div className={`absolute transition-opacity duration-500 ${step === 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-zinc-500 mb-2"># 3. AI safely executes tests</div>
          <div className="text-indigo-400">$ npm run test</div>
          <div className="text-zinc-400 mt-2">
            <span className="text-emerald-400 bg-emerald-400/10 px-1">PASS</span> src/components/Header.test.tsx
          </div>
          <div className="text-zinc-400 mt-1">
            Test Suites: <span className="text-emerald-400">1 passed</span>, 1 total
          </div>
        </div>

        <div className={`absolute transition-opacity duration-500 ${step === 3 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-zinc-500 mb-2"># 4. Code securely committed</div>
          <div className="text-indigo-400">$ scout commit -m "fix: resolve header padding bug"</div>
          <div className="text-zinc-400 mt-1">[session-a1b2c3 d8f9e0a] fix: resolve header padding bug</div>
          <div className="text-emerald-400 mt-6 text-lg font-bold flex items-center gap-2">
            <CheckCircle size={20} /> Task Completed Perfectly.
          </div>
        </div>
      </div>
    </div>
  );
};
"""

# Insert McpAnimation right after PipelineAnimation
content = content.replace("const PipelineAnimation", mcp_anim + "\nconst PipelineAnimation")

# 4. Insert McpAnimation into the JSX next to PipelineAnimation
# I'll create a 2-column grid: left side is Pipeline Animation, right side is MCP Animation
old_jsx = r'\{/\* Animated Pipeline Section \*/\}.*?<PipelineAnimation />\s*</div>'

new_jsx = """{/* Dual Engine Animation Section */}
      <div className="max-w-7xl w-full px-6 mb-32 relative z-10 mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          {/* V1 Dashboard Side */}
          <div>
            <div className="mb-8">
              <h3 className="text-emerald-600 font-mono text-xs tracking-widest uppercase mb-2">
                Part 1: The Cloud Dashboard
              </h3>
              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-3">
                Mission Control Pipeline.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Stop guessing where your contributions are. Scout organizes every issue into a clean, automated Kanban flow from discovery to merge—including dropping issues that aren't a fit.
              </p>
            </div>
            <PipelineAnimation />
          </div>

          {/* V2 MCP Side */}
          <div>
            <div className="mb-8">
              <h3 className="text-indigo-600 font-mono text-xs tracking-widest uppercase mb-2">
                Part 2: The AI Pivot
              </h3>
              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-3">
                Local MCP Harness.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                An invisible local orchestrator for the AI era. Provisions isolated git worktrees, manages contextual memory, and safely executes code in your IDE to solve the manual copy-paste problem.
              </p>
            </div>
            <McpAnimation />
          </div>

        </div>
      </div>"""

content = re.sub(old_jsx, new_jsx, content, flags=re.DOTALL)

with open('apps/web/src/pages/Landing.tsx', 'w') as f:
    f.write(content)

print("Landing page updated with both animations")
