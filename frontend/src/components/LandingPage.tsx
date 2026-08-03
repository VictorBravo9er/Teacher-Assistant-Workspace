import React from 'react';
import { Sparkles, ArrowRight, BrainCircuit, Users, BookOpen } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LandingPageProps {
  onNavigate: (view: 'auth' | 'app' | 'landing') => void;
  isLoggedIn?: boolean;
}

export default function LandingPage({ onNavigate, isLoggedIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-primary-text font-sans relative overflow-x-hidden flex flex-col">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-blue-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 backdrop-blur-md border-b border-border-color/50 z-10 sticky top-0">
        <BrandLogo size="md" onClick={() => onNavigate('landing')} />
        <button 
          onClick={() => onNavigate(isLoggedIn ? 'app' : 'auth')}
          className="px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-full transition-all border border-primary/20 hover:border-primary/40 backdrop-blur-sm cursor-pointer"
        >
          {isLoggedIn ? 'Dashboard' : 'Sign In'}
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center z-10 py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border-color backdrop-blur-md mb-8 shadow-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Next-Generation Teaching Workspace</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-6 max-w-4xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-text via-primary-text to-muted-text">
          Supercharge Your Classroom Evaluation & Reporting
        </h1>
        
        <p className="text-lg md:text-xl text-muted-text max-w-2xl mb-12 leading-relaxed">
          Automatically analyze student submissions, track academic progress, and get instant, reliable answers about your classes and materials.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => onNavigate(isLoggedIn ? 'app' : 'auth')}
            className="group px-8 py-4 bg-primary text-white rounded-full font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 cursor-pointer"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mt-20 text-left">
          <div className="p-6 rounded-2xl bg-surface/40 border border-border-color/60 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold mb-3">Student Evaluation & Grading</h3>
            <p className="text-muted-text text-sm">Rate student submissions against your rubrics and track academic growth over time with automated analysis.</p>
          </div>

          <div className="p-6 rounded-2xl bg-surface/40 border border-border-color/60 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Progress Reports</h3>
            <p className="text-muted-text text-sm">Ask natural questions about any student's performance and receive clear, actionable summaries and insights.</p>
          </div>

          <div className="p-6 rounded-2xl bg-surface/40 border border-border-color/60 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold mb-3">Organized Class Resources</h3>
            <p className="text-muted-text text-sm">Keep syllabi, assignments, and student rosters organized in dedicated, easily searchable classes.</p>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-sm text-muted-text border-t border-border-color/30 z-10">
        <p>© 2026 Teach&Learn. All rights reserved.</p>
      </footer>
    </div>
  );
}
