import re

with open('apps/web/src/pages/Landing.tsx', 'r') as f:
    content = f.read()

# 1. Polish the Hero Typography
old_h1 = r'<h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight mb-8 leading-\[1\.15\]">.*?</h1>'
new_h1 = """<h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight mb-8 leading-[1.2]">
              <span className="text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-0.5 rounded-lg inline-block shadow-sm mb-2">Discovering</span> Issues,<br/>
              <span className="text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-0.5 rounded-lg inline-block shadow-sm mb-2">Evaluating</span> Effort,<br/>
              <span className="text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-0.5 rounded-lg inline-block shadow-sm">Executing</span> Safely.
            </h1>"""
content = re.sub(old_h1, new_h1, content, flags=re.DOTALL)

# 2. Polish Pipeline Animation Card (Fixed height)
content = content.replace(
    'className="w-full bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col font-sans transition-all duration-500"',
    'className="w-full bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col font-sans transition-all duration-500 h-[340px]"'
)

# 3. Polish MCP Animation Card (Fixed height, better terminal look)
content = content.replace(
    'className="w-full bg-[#0d1117] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono transition-all duration-500 h-[280px]"',
    'className="w-full bg-[#0d1117] border border-zinc-800/80 rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono transition-all duration-500 h-[340px]"'
)

# Fix the IDE Terminal header to look more like macOS
content = content.replace(
    '<div className="text-zinc-500 text-[10px] ml-4 flex-1 text-center font-sans tracking-wide">IDE Terminal</div>',
    '<div className="text-zinc-400 text-xs flex-1 text-center font-sans tracking-wide font-medium mr-8">scout-mcp — bash</div>'
)

# 4. Polish the grid layout for the dual engine section to ensure perfect alignment
old_dual_grid = r'\{/\* Dual Engine Animation Section \*/\}.*?<PipelineAnimation />\s*</div>.*?<McpAnimation />\s*</div>\s*</div>\s*</div>'

new_dual_grid = """{/* Dual Engine Animation Section */}
      <div className="max-w-7xl w-full px-6 mb-32 relative z-10 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* V1 Dashboard Side */}
          <div className="flex flex-col">
            <div className="mb-8 min-h-[140px]">
              <h3 className="text-emerald-600 font-mono text-xs tracking-widest uppercase mb-3 font-bold">
                Part 1: The Cloud Dashboard
              </h3>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
                Mission Control Pipeline.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed md:text-base">
                Stop guessing where your contributions are. Scout organizes every issue into a clean, automated Kanban flow from discovery to merge—including dropping issues that aren't a fit.
              </p>
            </div>
            <div className="flex-1 w-full relative">
               {/* Decorative glow */}
               <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full"></div>
               <div className="relative"><PipelineAnimation /></div>
            </div>
          </div>

          {/* V2 MCP Side */}
          <div className="flex flex-col">
            <div className="mb-8 min-h-[140px]">
              <h3 className="text-indigo-600 font-mono text-xs tracking-widest uppercase mb-3 font-bold">
                Part 2: The AI Pivot
              </h3>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
                Local MCP Harness.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed md:text-base">
                An invisible local orchestrator for the AI era. Provisions isolated git worktrees, manages contextual memory, and safely executes code in your IDE to solve the manual copy-paste problem.
              </p>
            </div>
            <div className="flex-1 w-full relative">
               {/* Decorative glow */}
               <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
               <div className="relative"><McpAnimation /></div>
            </div>
          </div>

        </div>
      </div>"""

content = re.sub(old_dual_grid, new_dual_grid, content, flags=re.DOTALL)

with open('apps/web/src/pages/Landing.tsx', 'w') as f:
    f.write(content)

print("Landing page polished")
