import React from 'react';
import {
  Sparkles,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  BarChart3,
  Sliders,
  ShieldCheck,
  ExternalLink,
  GraduationCap,
  Target,
  FileCheck,
  Zap,
} from 'lucide-react';
import BrandLogo from '@/components/shared/BrandLogo';
import InteractiveGradingSimulator from '@/components/shared/InteractiveGradingSimulator';
import { Button, Badge } from '@/components/ui';

interface LandingPageProps {
  onNavigate: (view: 'auth' | 'app' | 'landing') => void;
  isLoggedIn?: boolean;
}

export default function LandingPage({ onNavigate, isLoggedIn }: LandingPageProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-primary-text font-sans relative overflow-x-hidden flex flex-col selection:bg-primary/20">
      {/* Background Ambience Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] bg-primary/15 blur-[140px] rounded-full animate-pulse"></div>
        <div className="absolute top-[25%] -right-[15%] w-[45%] h-[65%] bg-blue-500/10 blur-[130px] rounded-full"></div>
        <div className="absolute -bottom-[20%] left-[15%] w-[65%] h-[50%] bg-purple-500/10 blur-[140px] rounded-full"></div>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border-color/60 transition-colors">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <BrandLogo 
              id="landing-nav-logo" 
              size="md" 
              onClick={() => onNavigate('landing')} 
            />
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-text">
              <button
                id="landing-nav-features-link"
                onClick={() => scrollToSection('features')}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                id="landing-nav-workflow-link"
                onClick={() => scrollToSection('workflow')}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Workflow
              </button>
              <button
                id="landing-nav-architecture-link"
                onClick={() => scrollToSection('architecture')}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Architecture
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <a
              id="landing-nav-glipse-link"
              href="https://glipse.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-text hover:text-primary transition-colors px-3 py-1.5 rounded-full border border-border-color/60 hover:border-primary/40 bg-surface/60 backdrop-blur-xs"
            >
              <span>By Glipse Technologies</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <Button
              id="landing-nav-auth-btn"
              variant="primary"
              size="sm"
              className="rounded-full px-5 shadow-sm hover:shadow-primary/20"
              onClick={() => onNavigate(isLoggedIn ? 'app' : 'auth')}
            >
              {isLoggedIn ? 'Open Dashboard' : 'Sign In'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col z-10">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 lg:px-8 text-center max-w-5xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-8 shadow-xs backdrop-blur-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-spin-slow" />
            <span>Next-Gen Classroom Copilot & Multi-Agent Evaluation Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-display tracking-tight mb-6 leading-[1.1] bg-clip-text text-transparent bg-gradient-to-r from-primary-text via-primary-text to-muted-text">
            Supercharge Classroom Evaluation & Pedagogical Diagnostics
          </h1>

          <p className="text-lg sm:text-xl text-muted-text max-w-3xl mb-10 leading-relaxed font-normal">
            Teach&amp;Learn automates granular rubric scoring, diagnoses individual and classroom-wide 
            conceptual gaps, and unifies student portfolios with a conversational AI copilot grounded in your course materials.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Button
              id="landing-hero-get-started-btn"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/25 px-8 py-3.5 text-sm font-semibold"
              onClick={() => onNavigate(isLoggedIn ? 'app' : 'auth')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isLoggedIn ? 'Go to Workspace Dashboard' : 'Get Started Free'}
            </Button>
            <Button
              id="landing-hero-explore-btn"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-full px-7 py-3.5 text-sm font-semibold border-border-color hover:border-primary/40 bg-surface/50 backdrop-blur-sm"
              onClick={() => scrollToSection('features')}
            >
              Explore Capabilities
            </Button>
          </div>

          {/* Interactive 3D Animated Rubric Grading Simulator */}
          <InteractiveGradingSimulator className="mt-16" />

          {/* Value Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full mt-16 pt-10 border-t border-border-color/50 text-center">
            <div>
              <div className="text-3xl font-bold font-display text-primary">&lt; 10s</div>
              <div className="text-xs text-muted-text mt-1 font-medium">Autonomous Rubric Scoring</div>
            </div>
            <div>
              <div className="text-3xl font-bold font-display text-primary">100%</div>
              <div className="text-xs text-muted-text mt-1 font-medium">Teacher Override &amp; Control</div>
            </div>
            <div>
              <div className="text-3xl font-bold font-display text-primary">Multi-Modal</div>
              <div className="text-xs text-muted-text mt-1 font-medium">PDF, Image OCR &amp; Text</div>
            </div>
            <div>
              <div className="text-3xl font-bold font-display text-primary">Isolated RLS</div>
              <div className="text-xs text-muted-text mt-1 font-medium">Enterprise Data Security</div>
            </div>
          </div>
        </section>

        {/* Feature Pillars Section */}
        <section id="features" className="py-24 px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Comprehensive Platform Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-primary-text">
              Engineered to Solve Practical Classroom Challenges
            </h3>
            <p className="mt-4 text-base sm:text-lg text-muted-text leading-relaxed">
              Every feature in Teach&amp;Learn is purpose-built to eliminate repetitive administrative burden 
              while elevating personalized feedback for each student.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-surface/60 border border-border-color/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <FileCheck className="w-6 h-6" />
                </div>
                <Badge variant="primary" size="sm" className="mb-3">
                  Grading Engine
                </Badge>
                <h4 className="text-xl font-bold text-primary-text mb-3">
                  Multi-Criterion Rubric Scoring
                </h4>
                <p className="text-sm text-muted-text leading-relaxed">
                  Design granular rubrics with weights, criterion descriptions, and levels. Our backend analyzes 
                  submissions against your criteria and presents instant, evidence-backed evaluation recommendations.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-surface/60 border border-border-color/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6">
                  <Sliders className="w-6 h-6" />
                </div>
                <Badge variant="secondary" size="sm" className="mb-3">
                  Human-in-the-Loop
                </Badge>
                <h4 className="text-xl font-bold text-primary-text mb-3">
                  Interactive AI Diagnostic Diff
                </h4>
                <p className="text-sm text-muted-text leading-relaxed">
                  Avoid the pitfalls of black-box AI. Review AI evaluations in a side-by-side diff modal. Accept 
                  recommendations with one click or fine-tune sliders before saving to the official gradebook.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-surface/60 border border-border-color/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-6">
                  <Target className="w-6 h-6" />
                </div>
                <Badge variant="warning" size="sm" className="mb-3">
                  Analytics
                </Badge>
                <h4 className="text-xl font-bold text-primary-text mb-3">
                  Pedagogical Gap Analysis
                </h4>
                <p className="text-sm text-muted-text leading-relaxed">
                  Diagnose foundational learning gaps, prerequisite missing links, and recurring student misconceptions. 
                  Address systemic weaknesses before exams with targeted intervention guidance.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl bg-surface/60 border border-border-color/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <Badge variant="success" size="sm" className="mb-3">
                  Classroom Ops
                </Badge>
                <h4 className="text-xl font-bold text-primary-text mb-3">
                  Live Gradebook &amp; Attendance Matrix
                </h4>
                <p className="text-sm text-muted-text leading-relaxed">
                  A high-speed, spreadsheet-style gradebook cross-referencing all enrolled students with assignments, 
                  instant submission states, performance tier filters, and fast daily attendance roll-calls.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-2xl bg-surface/60 border border-border-color/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <Badge variant="neutral" size="sm" className="mb-3">
                  Parent Communication
                </Badge>
                <h4 className="text-xl font-bold text-primary-text mb-3">
                  1-Click Report Cards &amp; Briefings
                </h4>
                <p className="text-sm text-muted-text leading-relaxed">
                  Generate polished, printable student report cards with submission milestones, attendance trajectories, 
                  and personalized, AI-assisted parent briefings formatted for instant PDF export or printing.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-2xl bg-surface/60 border border-border-color/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 mb-6">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <Badge variant="primary" size="sm" className="mb-3">
                  LangGraph Copilot
                </Badge>
                <h4 className="text-xl font-bold text-primary-text mb-3">
                  Syllabus-Grounded RAG Assistant
                </h4>
                <p className="text-sm text-muted-text leading-relaxed">
                  Interact with an AI assistant that understands your uploaded syllabi, lecture slides, and rubric rules. 
                  Draft quiz questions, generate study guides, and export full session transcripts to Markdown.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-24 px-6 lg:px-8 bg-surface/40 border-y border-border-color/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                How It Works
              </h2>
              <h3 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-primary-text">
                From Raw Submissions to Actionable Pedagogical Insight
              </h3>
              <p className="mt-4 text-base sm:text-lg text-muted-text leading-relaxed">
                A seamless 4-step loop that keeps teachers in control while automating time-consuming manual assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-surface border border-border-color/70 shadow-xs relative">
                <div className="text-4xl font-extrabold font-display text-primary/30 mb-4">01</div>
                <h4 className="text-lg font-bold text-primary-text mb-2">Create &amp; Blueprint</h4>
                <p className="text-xs text-muted-text leading-relaxed">
                  Create classes, upload course materials, and define customized scoring rubrics or choose from pre-built academic templates.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-surface border border-border-color/70 shadow-xs relative">
                <div className="text-4xl font-extrabold font-display text-primary/30 mb-4">02</div>
                <h4 className="text-lg font-bold text-primary-text mb-2">Collect Student Work</h4>
                <p className="text-xs text-muted-text leading-relaxed">
                  Students turn in assignments via files (PDF/images), external links, or raw text. Automated edge workers extract clean text.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-surface border border-border-color/70 shadow-xs relative">
                <div className="text-4xl font-extrabold font-display text-primary/30 mb-4">03</div>
                <h4 className="text-lg font-bold text-primary-text mb-2">AI Diagnosis &amp; Diff</h4>
                <p className="text-xs text-muted-text leading-relaxed">
                  The evaluation engine scores each criterion, detects misconceptions, and generates feedback in an interactive review modal.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-surface border border-border-color/70 shadow-xs relative">
                <div className="text-4xl font-extrabold font-display text-primary/30 mb-4">04</div>
                <h4 className="text-lg font-bold text-primary-text mb-2">Publish &amp; Report</h4>
                <p className="text-xs text-muted-text leading-relaxed">
                  Review and accept scores with one click. Real-time gradebook recalculation, attendance syncing, and printable parent briefings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Glipse Technologies Affiliation & Architecture Section */}
        <section id="architecture" className="py-24 px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="rounded-3xl bg-surface/80 border border-border-color/80 p-8 sm:p-12 lg:p-16 shadow-xl relative overflow-hidden">
            <div className="max-w-3xl">
              <Badge variant="primary" size="sm" className="mb-4">
                Architecture &amp; Security
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-bold font-display text-primary-text tracking-tight mb-6">
                Built on Glipse Practical AI Architecture
              </h3>
              <p className="text-base sm:text-lg text-muted-text leading-relaxed mb-8">
                Teach&amp;Learn is built on the engineering principles of{' '}
                <a 
                  id="landing-glipse-about-link"
                  href="https://glipse.tech" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-semibold text-primary underline underline-offset-4 hover:opacity-85"
                >
                  Glipse Technologies Pvt. Ltd.
                </a>
                : creating systems that are <em>"boringly reliable"</em>, where the true value of intelligence lies not in novelty, but in dependable utility.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border-color/60">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary-text mb-1">
                    <ShieldCheck className="w-4 h-4 text-success" />
                    <span>Row-Level Security</span>
                  </div>
                  <p className="text-xs text-muted-text leading-relaxed">
                    Student rosters and grades are safeguarded by PostgreSQL RLS with strict tenant isolation.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary-text mb-1">
                    <Zap className="w-4 h-4 text-warning" />
                    <span>Edge Processing</span>
                  </div>
                  <p className="text-xs text-muted-text leading-relaxed">
                    Serverless Deno edge workers handle high-concurrency document OCR and URL signing.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary-text mb-1">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Deterministic AI</span>
                  </div>
                  <p className="text-xs text-muted-text leading-relaxed">
                    Strict Pydantic v2 schemas and LangGraph state nodes prevent hallucinations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-20 px-6 lg:px-8 text-center bg-primary/5 border-t border-primary/10">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            <h3 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-primary-text mb-4">
              Ready to Upgrade Your Classroom Intelligence?
            </h3>
            <p className="text-base sm:text-lg text-muted-text mb-8 max-w-xl">
              Start configuring classes, crafting interactive rubrics, and evaluating student submissions with ease.
            </p>
            <Button
              id="landing-cta-launch-btn"
              variant="primary"
              size="lg"
              className="rounded-full shadow-xl shadow-primary/25 px-9 py-3.5 text-base font-semibold"
              onClick={() => onNavigate(isLoggedIn ? 'app' : 'auth')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {isLoggedIn ? 'Go to Workspace Dashboard' : 'Get Started Now'}
            </Button>
            <span className="text-xs text-muted-text mt-4">
              Instant setup · No credit card required · Compatible with all modern browsers
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 px-6 lg:px-8 border-t border-border-color/60 bg-surface/50 text-xs text-muted-text z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo id="landing-footer-brand-logo" size="sm" onClick={() => onNavigate('landing')} />
            <span className="text-border-color">|</span>
            <span>
              A product of{' '}
              <a
                id="landing-footer-glipse-link"
                href="https://glipse.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-text hover:underline hover:text-primary inline-flex items-center gap-0.5"
              >
                Glipse Technologies
                <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
              </a>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-muted-text">
            <a
              id="landing-footer-clerko-link"
              href="https://clerko.glipse.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors inline-flex items-center gap-1 font-medium text-primary-text"
            >
              <span>Clerko</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('workflow')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Workflow
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Architecture
            </button>
          </div>

          <p className="text-xs text-muted-text">
            &copy; {new Date().getFullYear()} Teach&amp;Learn &middot; Glipse Technologies.
          </p>
        </div>
      </footer>
    </div>
  );
}
