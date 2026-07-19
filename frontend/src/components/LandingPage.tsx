import React from 'react';
import { Sparkles, ArrowRight, BrainCircuit, Users, BookOpen } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'auth') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold font-display tracking-tight">EduRAG Assistant</span>
        </div>
        <button 
          onClick={() => onNavigate('auth')}
          className="px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-full transition-all border border-primary/20 hover:border-primary/40 backdrop-blur-sm cursor-pointer"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center z-10 py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border-color backdrop-blur-md mb-8 shadow-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Next-Generation AI for Educators</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-6 max-w-4xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-text via-primary-text to-muted-text">
          Supercharge Your Classroom with AI
        </h1>
        
        <p className="text-lg md:text-xl text-muted-text max-w-2xl mb-12 leading-relaxed">
          Manage students, organize materials, and generate tailored insights with a context-aware AI teaching assistant designed specifically for modern educators.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => onNavigate('auth')}
            className="group px-8 py-4 bg-primary text-white rounded-full font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 cursor-pointer"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-5xl w-full">
          <div className="flex flex-col items-center p-8 rounded-3xl bg-surface/40 border border-border-color/50 backdrop-blur-xl hover:bg-surface/60 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Context-Aware AI</h3>
            <p className="text-muted-text text-sm">Our AI understands your syllabus, teaching style, and materials to provide highly relevant answers.</p>
          </div>
          
          <div className="flex flex-col items-center p-8 rounded-3xl bg-surface/40 border border-border-color/50 backdrop-blur-xl hover:bg-surface/60 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Student Insights</h3>
            <p className="text-muted-text text-sm">Track progress and get AI-generated personalized interventions for every student in your roster.</p>
          </div>
          
          <div className="flex flex-col items-center p-8 rounded-3xl bg-surface/40 border border-border-color/50 backdrop-blur-xl hover:bg-surface/60 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3">Resource Management</h3>
            <p className="text-muted-text text-sm">Organize documents, syllabi, and custom instructions in dedicated, easily accessible classes.</p>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-sm text-muted-text border-t border-border-color/30 z-10">
        <p>© 2026 EduRAG Assistant. All rights reserved.</p>
      </footer>
    </div>
  );
}
