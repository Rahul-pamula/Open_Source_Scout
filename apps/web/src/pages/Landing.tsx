import { Link, Navigate } from 'react-router-dom';
import { Target, Server, Shield, ArrowRight, GitBranch, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center font-sans overflow-x-hidden">
      {/* Top Navigation */}
      <header className="w-full max-w-6xl px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 font-black text-xl text-zinc-900 tracking-tight">
          <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg text-sm">
             🦅
          </div>
          Scout
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/docs" className="text-zinc-600 hover:text-zinc-900 font-bold text-sm flex items-center gap-2 transition-colors">
            <BookOpen size={16} />
            Documentation
          </Link>
          <a href="https://github.com/Rahul-pamula/Open_Source_Scout" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-900 font-bold text-sm flex items-center gap-2 transition-colors">
            GitHub
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl w-full text-center px-4 pt-16 pb-20 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wider uppercase mb-8 border border-emerald-200 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          AI-Powered Open Source
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter mb-6 leading-[1.1]">
          Your AI Agent for <br/> <span className="text-emerald-600">Crushing Open Source.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-600 mb-10 font-medium max-w-2xl mx-auto leading-relaxed">
          Scout filters the noise, evaluates issue difficulty, and manages your workflow. Built on a 100% decentralized, Bring-Your-Own-Backend architecture.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/setup" 
            className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3.5 px-8 border border-zinc-900 shadow-[4px_4px_0px_#27272a] hover:-translate-y-px hover:shadow-[5px_5px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Sign Up (New Setup)
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link 
            to="/connect" 
            className="w-full sm:w-auto bg-white text-zinc-900 font-bold py-3.5 px-8 border border-zinc-300 shadow-[4px_4px_0px_#d4d4d8] hover:-translate-y-px hover:shadow-[5px_5px_0px_#d4d4d8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center rounded-sm"
          >
            Sign In (Connect)
            <Server className="ml-2 h-5 w-5 text-zinc-500" />
          </Link>
          <Link 
            to="/docs" 
            className="w-full sm:w-auto bg-transparent text-zinc-600 hover:text-zinc-900 font-bold py-3 px-6 hover:bg-zinc-100 transition-colors flex items-center justify-center rounded-md"
          >
            Read Docs
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full px-6 mb-24 relative z-10">
        <div className="bg-white p-8 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-emerald-50 w-12 h-12 flex items-center justify-center rounded-xl mb-6 border border-emerald-100">
            <Target className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-3 tracking-tight">The Radar</h3>
          <p className="text-zinc-600 leading-relaxed font-medium">
            Scout aggressively filters GitHub to find issues that actually match your specific skills, eliminating the "Scroll of Despair."
          </p>
        </div>
        
        <div className="bg-white p-8 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-blue-50 w-12 h-12 flex items-center justify-center rounded-xl mb-6 border border-blue-100">
            <GitBranch className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-3 tracking-tight">The AI Dossier</h3>
          <p className="text-zinc-600 leading-relaxed font-medium">
            For every issue, Scout generates a "Match Score", detects if it is secretly claimed, and estimates true difficulty using Groq LLMs.
          </p>
        </div>
        
        <div className="bg-white p-8 border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-purple-50 w-12 h-12 flex items-center justify-center rounded-xl mb-6 border border-purple-100">
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-3 tracking-tight">Your Own Backend</h3>
          <p className="text-zinc-600 leading-relaxed font-medium">
            Zero central servers. You deploy the backend to your own Supabase instance. Your data, your compute, your API keys.
          </p>
        </div>
      </div>
    </div>
  );
}
