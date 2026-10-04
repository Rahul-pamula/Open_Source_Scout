import re

with open('apps/web/src/pages/Landing.tsx', 'r') as f:
    content = f.read()

# Replace the hero section
old_hero = r'\{/\* Hero Section \*/\}.*?</p>\s*</div>'

new_hero = """{/* Hero Section */}
      <div className="max-w-7xl w-full px-6 pt-20 pb-24 relative z-10 mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column: Typography & CTAs */}
          <div className="text-left">
            <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tight mb-8 leading-[1.15]">
              <span className="text-indigo-700 bg-indigo-100 px-3 py-1 rounded-sm inline-block mb-3 shadow-sm">Discovering</span> Issues,<br/>
              <span className="text-indigo-700 bg-indigo-100 px-3 py-1 rounded-sm inline-block mb-3 shadow-sm">Evaluating</span> Effort,<br/>
              <span className="text-indigo-700 bg-indigo-100 px-3 py-1 rounded-sm inline-block shadow-sm">Executing</span> Safely.
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-600 mb-10 font-medium leading-relaxed">
              Open Source Scout is a dual-engine architecture for the AI era. Use the{' '}
              <strong>v1 Cloud Dashboard</strong> to manage your GitHub contributions, and the{' '}
              <strong>v2 Local MCP</strong> to safely orchestrate AI agents directly in your IDE.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/setup"
                className="w-full sm:w-auto bg-emerald-500 text-white font-bold py-3.5 px-8 hover:bg-emerald-600 transition-colors flex items-center justify-center rounded"
              >
                Open v1 Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/mcp-setup"
                className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-8 hover:bg-zinc-800 transition-colors flex items-center justify-center rounded"
              >
                Scout v2 Setup
                <Server className="ml-2 h-5 w-5 text-zinc-400" />
              </Link>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-6">
              Use the hosted interface. Bring your own backend.
            </p>
          </div>

          {/* Right Column: Realistic Blob Image */}
          <div className="relative hidden md:flex justify-end">
            <div className="relative w-full max-w-lg aspect-square">
              {/* Decorative shadow layer */}
              <div 
                className="absolute inset-0 bg-indigo-500/10 translate-x-4 translate-y-4"
                style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
              ></div>
              
              {/* Main image with blob mask */}
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" 
                alt="Developers collaborating"
                className="absolute inset-0 w-full h-full object-cover shadow-2xl"
                style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
              />
            </div>
          </div>
        </div>
      </div>"""

content = re.sub(old_hero, new_hero, content, flags=re.DOTALL)

with open('apps/web/src/pages/Landing.tsx', 'w') as f:
    f.write(content)

print("Done")
