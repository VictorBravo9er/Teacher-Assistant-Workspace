import React from 'react';
import {
  X,
  Settings,
  Sparkles,
  ShieldCheck,
  UserCircle2,
  Sliders,
  Key
} from 'lucide-react';

interface AccountModalsProps {
  activeModal: 'profile' | 'preferences' | 'settings' | 'subscription' | null;
  onClose: () => void;
  onTriggerToast: (text: string) => void;
}

export default function AccountModals({ activeModal, onClose, onTriggerToast }: AccountModalsProps) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 bg-primary-text/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-elevated border border-border-color rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute right-5 top-5 hover:bg-surface p-1.5 rounded-xl text-muted-text hover:text-primary-text cursor-pointer transition-colors">
          <X className="w-4 h-4" />
        </button>

        {activeModal === 'profile' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3.5 pb-4 border-b border-border-color">
              <UserCircle2 className="w-10 h-10 text-primary" />
              <div>
                <h3 className="text-md font-bold font-display text-primary-text">Elena Rostova</h3>
                <p className="text-[10px] font-mono text-muted-text">AI Studio District Senior Educator</p>
              </div>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-surface p-4 rounded-2xl border border-border-color shadow-sm">
                <div>
                  <span className="text-[10px] text-muted-text font-mono block">AFFILIATION</span>
                  <span className="font-semibold text-primary-text block mt-0.5">High School STEM faculty</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-text font-mono block">REGISTERED EMAIL</span>
                  <span className="font-semibold text-primary-text block mt-0.5 truncate">Vikramjitborah@gmail.com</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-mono text-[10px] uppercase font-bold text-muted-text">Academic Licenses</h4>
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-primary block">EduAssistant Partner API</span>
                    <span className="text-[10px] text-primary/80 font-mono block mt-0.5">Full access key granted</span>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'preferences' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border-color">
              <Sliders className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-primary-text">Teaching Preferences</h3>
                <span className="text-[10px] font-mono text-muted-text">Configure default AI assessment styles</span>
              </div>
            </div>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-[10px] text-muted-text block mb-1">DEFAULT REMEDIAL CLINIC TRIGGER THRESHOLD</label>
                <select className="w-full bg-surface border border-border-color rounded-lg p-2 text-primary-text outline-none focus:border-primary">
                  <option value="60">Scores falling under 60% (F/D Grade)</option>
                  <option value="75">Scores falling under 75% (C/B Grade)</option>
                  <option value="90">High mastery tutoring scope under 90%</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-text block mb-1">SOCRATIC DIALOGUE VERBOSITY LENGTH</label>
                <select className="w-full bg-surface border border-border-color rounded-lg p-2 text-primary-text outline-none focus:border-primary">
                  <option value="brief">Direct questions (1-2 sentences feedback)</option>
                  <option value="medium">Detailed structural outlines (Recommended)</option>
                  <option value="long">Complete step worksheets mapping theories</option>
                </select>
              </div>
              <button
                onClick={() => { onClose(); onTriggerToast('Teaching guidelines successfully cached.'); }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs font-sans cursor-pointer transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {activeModal === 'settings' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border-color">
              <Settings className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-primary-text">System Configurations</h3>
                <span className="text-[10px] font-mono text-muted-text">Admin settings & diagnostic utilities</span>
              </div>
            </div>
            <div className="space-y-3.5 text-xs">
              <div className="bg-surface p-4 border border-border-color rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="font-semibold text-primary-text block">Local Save Status</span>
                  <span className="text-[9px] text-muted-text font-mono block mt-1">Saves state to browser storage</span>
                </div>
                <span className="px-2 py-0.5 bg-success/10 text-success border border-success/25 text-[10px] font-mono rounded">Autosaved</span>
              </div>
              <div className="bg-surface p-4 border border-border-color rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="font-semibold text-primary-text block">API Configuration</span>
                  <span className="text-[9px] text-muted-text font-mono block mt-1">Backend connection settings</span>
                </div>
                <Key className="w-4.5 h-4.5 text-primary/80" />
              </div>
            </div>
          </div>
        )}

        {activeModal === 'subscription' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-border-color">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <div>
                <h3 className="text-sm font-semibold text-primary-text">Workspace Licensing</h3>
                <span className="text-[10px] font-mono text-muted-text">Free Tier partner vs. Pro scaling models</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between transition-colors">
                <div>
                  <span className="text-xs font-bold text-primary block">PRO LICENSE PASS</span>
                  <p className="text-[11px] text-secondary-text leading-relaxed block mt-1">
                    Unlocks unlimited workspace classes, advanced radar visualizers, and direct batch Grading pipelines.
                  </p>
                </div>
                <button
                  onClick={() => { onClose(); onTriggerToast('Mock Upgrade Successful: Welcome to Pro!'); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg cursor-pointer"
                >
                  $12/mo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
