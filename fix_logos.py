import re

# --- 1. Fix Landing.tsx ---
with open('apps/web/src/pages/Landing.tsx', 'r') as f:
    landing_content = f.read()

landing_old_header = r'<div className="flex items-center gap-2 font-black text-xl text-zinc-900 tracking-tight">\s*<img src="\./logo\.jpg" alt="Logo" className="w-8 h-8 rounded shadow-sm" />\s*Open Source Scout\s*</div>'
landing_new_header = """<Link to="/" className="flex items-center gap-2 font-black text-xl text-zinc-900 tracking-tight hover:opacity-80 transition-opacity">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Logo" className="w-8 h-8 rounded shadow-sm" />
          Open Source Scout
        </Link>"""

landing_content = re.sub(landing_old_header, landing_new_header, landing_content)
with open('apps/web/src/pages/Landing.tsx', 'w') as f:
    f.write(landing_content)

# --- 2. Fix Docs.tsx ---
with open('apps/web/src/pages/Docs.tsx', 'r') as f:
    docs_content = f.read()

# Replace desktop sidebar header
docs_old_desktop = r'<div className="p-6 hidden md:flex items-center gap-3 border-b border-zinc-200 bg-white sticky top-0 z-10">\s*<div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">\s*<BookOpen size=\{24\} />\s*</div>\s*<h1 className="font-black text-xl tracking-tight text-zinc-900">Scout Docs</h1>\s*</div>'
docs_new_desktop = """<Link to="/" className="p-6 hidden md:flex items-center gap-3 border-b border-zinc-200 bg-white sticky top-0 z-10 hover:bg-zinc-50 transition-colors">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Logo" className="w-8 h-8 rounded shadow-sm" />
          <h1 className="font-black text-xl tracking-tight text-zinc-900">Scout Docs</h1>
        </Link>"""
docs_content = re.sub(docs_old_desktop, docs_new_desktop, docs_content)

# Replace mobile sidebar header
docs_old_mobile = r'<div className="flex items-center gap-2 font-bold text-zinc-900">\s*<BookOpen size=\{20\} className="text-emerald-500" />\s*Scout Docs\s*</div>'
docs_new_mobile = """<Link to="/" className="flex items-center gap-2 font-bold text-zinc-900 hover:opacity-80">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Logo" className="w-6 h-6 rounded shadow-sm" />
          Scout Docs
        </Link>"""
docs_content = re.sub(docs_old_mobile, docs_new_mobile, docs_content)

with open('apps/web/src/pages/Docs.tsx', 'w') as f:
    f.write(docs_content)

# --- 3. Fix Setup.tsx ---
with open('apps/web/src/pages/Setup.tsx', 'r') as f:
    setup_content = f.read()

if "Link" not in setup_content:
    setup_content = "import { Link } from 'react-router-dom';\n" + setup_content

setup_old_container = r'<div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 px-4 font-sans">'
setup_new_container = """<div className="min-h-screen bg-zinc-50 flex flex-col items-center font-sans">
      {/* Universal Header */}
      <header className="w-full bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between mb-8 shadow-sm">
        <Link to="/" className="flex items-center gap-2 font-black text-lg text-zinc-900 tracking-tight hover:opacity-80 transition-opacity">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Logo" className="w-7 h-7 rounded shadow-sm" />
          Open Source Scout
        </Link>
        <Link to="/docs" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Documentation</Link>
      </header>
      
      <div className="flex flex-col items-center w-full px-4 pb-12">"""

setup_content = setup_content.replace(setup_old_container, setup_new_container)
# Close the div at the very end
setup_content = setup_content.replace("    </div>\n  );\n}", "    </div>\n    </div>\n  );\n}")

with open('apps/web/src/pages/Setup.tsx', 'w') as f:
    f.write(setup_content)


# --- 4. Fix McpSetup.tsx ---
with open('apps/web/src/pages/McpSetup.tsx', 'r') as f:
    mcp_content = f.read()

if "Link" not in mcp_content:
    mcp_content = "import { Link } from 'react-router-dom';\n" + mcp_content

mcp_old_container = r'<div className="max-w-4xl mx-auto py-8 font-sans">'
mcp_new_container = """<div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Universal Header */}
      <header className="w-full bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between mb-8 shadow-sm">
        <Link to="/" className="flex items-center gap-2 font-black text-lg text-zinc-900 tracking-tight hover:opacity-80 transition-opacity">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Logo" className="w-7 h-7 rounded shadow-sm" />
          Open Source Scout
        </Link>
        <Link to="/docs" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Documentation</Link>
      </header>
      
      <div className="max-w-4xl w-full mx-auto px-4 pb-12">"""

mcp_content = mcp_content.replace(mcp_old_container, mcp_new_container)
# Close the div at the very end
mcp_content = mcp_content.replace("    </div>\n  );\n}", "    </div>\n    </div>\n  );\n}")

with open('apps/web/src/pages/McpSetup.tsx', 'w') as f:
    f.write(mcp_content)


print("Logos and headers applied everywhere")
