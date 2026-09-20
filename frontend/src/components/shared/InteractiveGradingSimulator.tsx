import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Sliders,
  BrainCircuit,
  Play,
  Pause,
  RotateCcw,
  MousePointer2,
  Check,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { Badge } from '@/components/ui';

export interface InteractiveGradingSimulatorProps {
  className?: string;
}

const STEPS = [
  { id: 0, title: 'Ingestion', label: '1. OCR Ingestion' },
  { id: 1, title: 'Scanning', label: '2. Text Extraction' },
  { id: 2, title: 'Rubric Eval', label: '3. AI Rubric Diff' },
  { id: 3, title: 'Diagnosis', label: '4. Gap Diagnosis' },
  { id: 4, title: 'Approval', label: '5. Teacher Approval' },
  { id: 5, title: 'Synced', label: '6. Gradebook Sync' },
];

export default function InteractiveGradingSimulator({
  className = '',
}: InteractiveGradingSimulatorProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: trigger when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Step state-machine timer
  useEffect(() => {
    if (!isPlaying || isHovered || !isInView) return;

    const durations = [2200, 2400, 2800, 2500, 2600, 3000];
    const duration = durations[activeStep] || 2500;

    const timer = setTimeout(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [activeStep, isPlaying, isHovered, isInView]);

  return (
    <div
      ref={containerRef}
      id="grading-simulator-container"
      className={`relative w-full max-w-4xl mx-auto perspective-1200 transition-all ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Tilted Window Chassis */}
      <div
        className="preserve-3d rounded-2xl border border-border-color/90 bg-surface/90 shadow-2xl backdrop-blur-xl overflow-hidden transition-transform duration-500 ease-out sm:hover:rotate-0"
        style={{
          transform: isHovered
            ? 'rotateX(0deg) rotateY(0deg)'
            : 'rotateX(2deg) rotateY(-2deg)',
        }}
      >
        {/* Window Topbar */}
        <div className="flex flex-wrap items-center justify-between border-b border-border-color/70 px-4 py-3 bg-surface/60 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <span className="text-xs font-mono text-muted-text hidden sm:inline">
              teach-and-learn / ap-physics-mechanics / automated-rubric-eval
            </span>
          </div>

          {/* Stepper Navigation Chips & Play Controls */}
          <div className="flex items-center gap-1.5">
            <div className="hidden md:flex items-center gap-1 bg-elevated/70 p-0.5 rounded-lg border border-border-color/40">
              {STEPS.map((step) => {
                const isActive = activeStep === step.id;
                const isPassed = activeStep > step.id;
                return (
                  <button
                    key={step.id}
                    id={`grading-simulator-step-btn-${step.id}`}
                    onClick={() => {
                      setActiveStep(step.id);
                      setIsPlaying(false);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white font-semibold shadow-xs'
                        : isPassed
                        ? 'text-primary hover:bg-surface/80'
                        : 'text-muted-text hover:text-primary-text'
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 pl-2 border-l border-border-color/50">
              <button
                id="grading-simulator-play-toggle-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-md hover:bg-elevated text-muted-text hover:text-primary-text transition-colors cursor-pointer"
                title={isPlaying ? 'Pause Animation' : 'Play Animation'}
                aria-label={isPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                id="grading-simulator-reset-btn"
                onClick={() => {
                  setActiveStep(0);
                  setIsPlaying(true);
                }}
                className="p-1.5 rounded-md hover:bg-elevated text-muted-text hover:text-primary-text transition-colors cursor-pointer"
                title="Restart Simulation"
                aria-label="Restart Simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Step Progress Banner */}
        <div className="px-6 py-2 bg-elevated/30 border-b border-border-color/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="font-medium text-primary-text">
              {activeStep === 0 && 'Step 1: Document Upload & Ingestion'}
              {activeStep === 1 && 'Step 2: Serverless OCR Scanning & Evidence Extraction'}
              {activeStep === 2 && 'Step 3: Multi-Criterion Rubric Scoring in Progress'}
              {activeStep === 3 && 'Step 4: Pedagogical Misconception Diagnosis'}
              {activeStep === 4 && 'Step 5: Teacher-in-the-Loop Verification'}
              {activeStep === 5 && 'Step 6: Realtime Gradebook Matrix Synchronized'}
            </span>
          </div>

          <Badge
            variant={activeStep >= 4 ? 'success' : activeStep >= 2 ? 'primary' : 'neutral'}
            size="sm"
            dot
          >
            {activeStep >= 5
              ? 'Synced (95%)'
              : activeStep >= 4
              ? 'Approved'
              : activeStep >= 2
              ? 'Evaluating'
              : 'Ingesting'}
          </Badge>
        </div>

        {/* 2-Pane Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 items-stretch">
          {/* Left Pane: Student Submission Document Viewer */}
          <div className="rounded-xl border border-border-color/70 bg-elevated/40 p-4 flex flex-col justify-between relative overflow-hidden">
            {/* Laser Scan Line (Active during Step 1) */}
            {activeStep === 1 && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-laser-scan z-20 pointer-events-none"
              />
            )}

            <div>
              {/* Submission Header */}
              <div className="flex items-center justify-between border-b border-border-color/50 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold font-mono text-xs flex items-center justify-center border border-primary/20">
                    MC
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-primary-text">Maya Chen</h5>
                    <span className="text-[10px] text-muted-text font-mono">Roll #PH-2041 · Grade 11</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                    activeStep >= 4
                      ? 'bg-success/15 text-success border-success/30 font-semibold'
                      : activeStep >= 1
                      ? 'bg-primary/15 text-primary border-primary/30 font-semibold animate-pulse'
                      : 'bg-surface text-muted-text border-border-color'
                  }`}
                >
                  {activeStep >= 4 ? 'Graded' : activeStep >= 1 ? 'OCR Parsing' : 'Submitted'}
                </span>
              </div>

              {/* Assignment Title */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-text mb-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Lab Report 03: Conservation of Linear Momentum</span>
              </div>

              {/* Document Text Extract Box */}
              <div className="bg-surface/80 border border-border-color/50 rounded-lg p-3 text-xs leading-relaxed text-secondary-text font-mono space-y-2 relative">
                <p>
                  <span className="text-primary font-bold">1. Hypothesis:</span> The total initial
                  momentum \(\sum \vec{p}_i\) of two isolated gliders will equal the final momentum
                  \(\sum \vec{p}_f\) within a 5% experimental tolerance margin.
                </p>

                <p
                  className={`transition-colors duration-500 rounded px-1 -mx-1 ${
                    activeStep >= 1
                      ? 'bg-primary/10 text-primary-text font-medium'
                      : 'text-muted-text'
                  }`}
                >
                  <span className="font-bold">2. Observations:</span> Photogate timers recorded glider
                  A (\(m_1 = 250\text{g}\)) entering the collision zone at \(1.42\text{ m/s}\).
                  After inelastic coupling with stationary glider B (\(m_2 = 250\text{g}\)), the
                  combined velocity was measured at \(0.68\text{ m/s}\).
                </p>

                <p
                  className={`text-[11px] transition-colors duration-500 rounded px-1 -mx-1 ${
                    activeStep >= 3
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium'
                      : 'text-muted-text/80'
                  }`}
                >
                  <span className="font-bold">3. Error Analysis:</span> Kinetic dissipation of 14.2%
                  was observed due to deformation, though track friction was assumed negligible.
                </p>
              </div>
            </div>

            {/* Document Footer Meta */}
            <div className="mt-3 pt-2.5 border-t border-border-color/40 flex items-center justify-between text-[10px] text-muted-text font-mono">
              <div className="flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-success" />
                <span>4 Pages PDF · OCR Extracted</span>
              </div>
              <span>Plagiarism: 0%</span>
            </div>
          </div>

          {/* Right Pane: AI Diagnostic Diff Workbench */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col justify-between relative overflow-hidden">
            <div>
              {/* Diff Header */}
              <div className="flex items-center justify-between border-b border-primary/15 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    AI Rubric Evaluation Diff
                  </span>
                </div>

                <span className="font-mono font-bold text-xs bg-surface/90 border border-primary/20 px-2.5 py-0.5 rounded-full text-primary-text shadow-xs">
                  {activeStep >= 2 ? (
                    <span className="text-success font-bold">38 / 40 (95%)</span>
                  ) : (
                    <span className="text-muted-text">-- / 40</span>
                  )}
                </span>
              </div>

              {/* Dynamic Criteria Breakdown Cards */}
              <div className="space-y-2.5">
                {/* Criterion 1 */}
                <div className="bg-surface/90 border border-border-color/60 rounded-lg p-2.5 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary-text">
                      1. Hypothesis &amp; Theory
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {activeStep >= 2 ? '10 / 10' : '—'}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-elevated h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-700 ease-out"
                      style={{ width: activeStep >= 2 ? '100%' : '0%' }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-text block">
                    {activeStep >= 2
                      ? 'Theoretical conservation equations correctly established.'
                      : 'Awaiting evaluation...'}
                  </span>
                </div>

                {/* Criterion 2 */}
                <div className="bg-surface/90 border border-border-color/60 rounded-lg p-2.5 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary-text">
                      2. Error Propagation &amp; Calibration
                    </span>
                    <span className="font-mono font-bold text-amber-500">
                      {activeStep >= 2 ? '8 / 10' : '—'}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-elevated h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-700 ease-out"
                      style={{ width: activeStep >= 2 ? '80%' : '0%' }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-text block">
                    {activeStep >= 2
                      ? 'Minor: Air track leveling calibration friction unaddressed (-2 pts).'
                      : 'Awaiting evaluation...'}
                  </span>
                </div>

                {/* Criterion 3 */}
                <div className="bg-surface/90 border border-border-color/60 rounded-lg p-2.5 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary-text">
                      3. Data Integrity &amp; Graphs
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {activeStep >= 2 ? '20 / 20' : '—'}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-elevated h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-700 ease-out"
                      style={{ width: activeStep >= 2 ? '100%' : '0%' }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-text block">
                    {activeStep >= 2
                      ? 'Kinetic energy curves and sensor tables verified.'
                      : 'Awaiting evaluation...'}
                  </span>
                </div>
              </div>

              {/* Diagnostic Misconception Callout (Expands on Step 3+) */}
              <div
                className={`mt-2.5 p-2.5 rounded-lg border text-xs transition-all duration-500 flex items-start gap-2 ${
                  activeStep >= 3
                    ? 'opacity-100 translate-y-0 bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                    : 'opacity-0 translate-y-2 pointer-events-none h-0 p-0 border-transparent overflow-hidden'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <span className="font-bold block">Pedagogical Gap Alert:</span>
                  Student shows sign confusion regarding direction vectors in inelastic collision.
                  Recommend assign Problem Set 4.
                </div>
              </div>
            </div>

            {/* Human-in-the-Loop Confirmation Action (Step 4 & 5) */}
            <div className="mt-3 pt-3 border-t border-primary/15 relative">
              <button
                id="grading-simulator-accept-action-btn"
                onClick={() => setActiveStep(5)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  activeStep >= 4
                    ? 'bg-success text-white shadow-success/20 ring-2 ring-success/30'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {activeStep >= 4 ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Evaluation Approved &amp; Published</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Accept AI Diff &amp; Save Grade</span>
                  </>
                )}
              </button>

              {/* Simulated Mouse Pointer (Appears on Step 4 to demonstrate human control) */}
              {activeStep === 4 && (
                <div className="absolute right-8 -bottom-1 transform translate-x-2 animate-bounce pointer-events-none">
                  <div className="relative">
                    <MousePointer2 className="w-5 h-5 text-slate-900 dark:text-white drop-shadow-md fill-slate-900 dark:fill-white" />
                    <span className="absolute left-4 top-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-bold px-1 rounded shadow">
                      Teacher Click
                    </span>
                  </div>
                </div>
              )}

              {/* Sync confirmation message on Step 5 */}
              {activeStep === 5 && (
                <div className="mt-2 text-center text-[11px] text-success font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Gradebook Matrix &amp; Student Portfolio updated in realtime</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
