import { Link } from 'react-router-dom';
import { Target, Server, Shield, ArrowRight, GitBranch } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center pt-24 px-4 font-sans">
      <div className="max-w-3xl w-full text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tighter mb-6 leading-tight">
          Your AI-Powered Agent for Crushing Open Source.
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 mb-10 font-medium">
          Scout filters the noise, evaluates issue difficulty, and manages your workflow. Built on a 100% decentralized, Bring-Your-Own-Backend architecture.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/setup" 
            className="w-full sm:w-auto bg-zinc-900 text-white font-bold py-3 px-8 border border-zinc-900 shadow-[4px_4px_0px_#27272a] hover:-translate-y-px hover:shadow-[5px_5px_0px_#27272a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center"
          >
            Sign Up (New Setup)
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link 
            to="/connect" 
            className="w-full sm:w-auto bg-white text-zinc-900 font-bold py-3 px-8 border border-zinc-300 shadow-[4px_4px_0px_#d4d4d8] hover:-translate-y-px hover:shadow-[5px_5px_0px_#d4d4d8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center"
          >
            Sign In (Connect)
            <Server className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl w-full mb-24">
        <div className="bg-white p-6 border border-zinc-200">
          <Target className="h-8 w-8 text-emerald-600 mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 mb-2">The Radar</h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Scout aggressively filters GitHub to find issues that actually match your specific skills, eliminating the "Scroll of Despair."
          </p>
        </div>
        <div className="bg-white p-6 border border-zinc-200">
          <GitBranch className="h-8 w-8 text-blue-600 mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 mb-2">The AI Dossier</h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            For every issue, Scout generates a "Match Score", detects if it is secretly claimed, and estimates true difficulty using Groq LLMs.
          </p>
        </div>
        <div className="bg-white p-6 border border-zinc-200">
          <Shield className="h-8 w-8 text-purple-600 mb-4" />
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Bring Your Own Backend</h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Zero central servers. You deploy the backend to your own Supabase instance. Your data, your compute, your API keys.
          </p>
        </div>
      </div>
    </div>
  );
}
