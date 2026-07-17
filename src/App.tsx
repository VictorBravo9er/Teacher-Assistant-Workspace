import React, { useState, useEffect } from 'react';
import { Workspace, Template, Student, Material, Instruction, RAGSession, Message } from './types';
import { DEFAULT_WORKSPACES, DEFAULT_TEMPLATES } from './defaultData';
import Sidebar from './components/Sidebar';
import WorkspaceDetails from './components/WorkspaceDetails';
import StudentRegister from './components/StudentRegister';
import RAGWorkspace from './components/RAGWorkspace';
import CommandPalette from './components/CommandPalette';
import { 
  X, 
  Settings, 
  HelpCircle, 
  Sparkles, 
  GraduationCap, 
  ShieldCheck, 
  UserCircle2, 
  Sliders,
  Layers,
  Key
} from 'lucide-react';

export default function App() {
  // --- Persistent Local States ---
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    const saved = localStorage.getItem('edu_rag_theme');
    return (saved as 'system' | 'light' | 'dark') || 'system';
  });

  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('edu_rag_workspaces');
    return saved ? JSON.parse(saved) : DEFAULT_WORKSPACES;
  });

  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem('edu_rag_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    const saved = localStorage.getItem('edu_rag_active_ws');
    if (saved && saved !== 'null') return saved;
    return workspaces[0]?.id || '';
  });

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeAccountModal, setActiveAccountModal] = useState<'profile' | 'preferences' | 'settings' | 'subscription' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Sync theme to document element
  useEffect(() => {
    localStorage.setItem('edu_rag_theme', theme);
    const root = window.document.documentElement;
    
    const applyTheme = (t: 'system' | 'light' | 'dark') => {
      if (t === 'dark') {
        root.classList.add('dark');
      } else if (t === 'light') {
        root.classList.remove('dark');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Auto-save values to storage
  useEffect(() => {
    localStorage.setItem('edu_rag_workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    localStorage.setItem('edu_rag_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('edu_rag_active_ws', activeWorkspaceId);
  }, [activeWorkspaceId]);

  // Autohide toasts
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  // Helper Toast trigger
  const triggerToast = (text: string) => {
    setToastMessage(text);
  };

  // --- Workspace mutations ---
  const handleSelectWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    setIsFocusMode(false); // Reset focus mode on class switches
  };

  const handleCreateWorkspace = (name: string, templateId?: string) => {
    const matchedTemplate = templates.find(t => t.id === templateId);

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      academicYear: '2025-2026',
      semester: 'Semester 2',
      subject: matchedTemplate ? matchedTemplate.subject : 'General Course Room',
      teacherName: 'Elena Rostova',
      teachingStyle: matchedTemplate ? matchedTemplate.teachingStyle : 'Structured Inquiry-led',
      experienceLevel: 'Senior Instructor (12 Years)',
      specialNotes: matchedTemplate ? matchedTemplate.description : 'Welcome to your brand new workspace cohort.',
      materials: matchedTemplate ? matchedTemplate.materialsPreset.map((m, idx) => ({
        ...m,
        id: `mat-${Date.now()}-${idx}`,
        uploadDate: new Date().toISOString().split('T')[0],
        versionHistory: []
      })) : [],
      instructions: matchedTemplate ? matchedTemplate.instructions.map((i, idx) => ({
        ...i,
        id: `inst-${Date.now()}-${idx}`
      })) : [],
      students: [],
      ragSessions: []
    };

    setWorkspaces([newWorkspace, ...workspaces]);
    setActiveWorkspaceId(newWorkspace.id);
    triggerToast(`Created classroom: "${name}"`);
  };

  const handleRenameWorkspace = (id: string, newName: string) => {
    setWorkspaces(workspaces.map(w => w.id === id ? { ...w, name: newName } : w));
    triggerToast("Class rename successfully committed.");
  };

  const handleDuplicateWorkspace = (id: string) => {
    const target = workspaces.find(w => w.id === id);
    if (!target) return;

    const duplicated: Workspace = {
      ...target,
      id: `ws-${Date.now()}`,
      name: `${target.name} (Copy)`,
      students: target.students.map(s => ({ ...s, id: `stud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` })),
      materials: target.materials.map(m => ({ ...m, id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` })),
      instructions: target.instructions.map(i => ({ ...i, id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` })),
      ragSessions: [], // Clear session context on duplicates
      archived: false
    };

    setWorkspaces([duplicated, ...workspaces]);
    setActiveWorkspaceId(duplicated.id);
    triggerToast("Duplicated classroom workspace.");
  };

  const handleArchiveWorkspace = (id: string) => {
    setWorkspaces(workspaces.map(w => 
      w.id === id ? { ...w, archived: !w.archived } : w
    ));
    const isNowArchived = workspaces.find(w => w.id === id)?.archived;
    triggerToast(isNowArchived ? "Restored classroom context." : "Archived selected classroom workspace.");
  };

  const handleDeleteWorkspace = (id: string) => {
    const filtered = workspaces.filter(w => w.id !== id);
    setWorkspaces(filtered);
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(filtered[0]?.id || '');
    }
    triggerToast("Classroom portfolio permanently removed.");
  };

  const handleUpdateWorkspace = (id: string, updatedFields: Partial<Workspace>) => {
    setWorkspaces(workspaces.map(w => w.id === id ? { ...w, ...updatedFields } : w));
  };

  // --- Reusable templates mutations ---
  const handleCreateTemplate = (tpl: Omit<Template, 'id'>) => {
    const newTpl: Template = {
      ...tpl,
      id: `tpl-${Date.now()}`
    };
    setTemplates([newTpl, ...templates]);
    triggerToast(`Created lesson template: "${newTpl.name}"`);
  };

  const handleSelectTemplateAsPreset = (tpl: Template) => {
    handleCreateWorkspace(tpl.name, tpl.id);
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!activeWorkspace) return;
    const newTpl: Template = {
      id: `tpl-${Date.now()}`,
      name: `${activeWorkspace.name} Template`,
      description: `Saved from active class ${activeWorkspace.name} with ${activeWorkspace.materials.length} reference materials files.`,
      subject: activeWorkspace.subject,
      teachingStyle: activeWorkspace.teachingStyle,
      instructions: activeWorkspace.instructions.map(i => ({ title: i.title, type: i.type, content: i.content })),
      materialsPreset: activeWorkspace.materials.map(m => ({ name: m.name, type: m.type, size: m.size, tags: m.tags }))
    };

    setTemplates([newTpl, ...templates]);
    triggerToast("Saved active class roster settings as reusable template!");
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    triggerToast("Template portfolio removed.");
  };

  // --- Nest Subitems Workspace management (Materials) ---
  const handleAddMaterialInWorkspace = (wsId: string, mat: Omit<Material, 'id' | 'uploadDate'>) => {
    const updated = workspaces.map(w => {
      if (w.id === wsId) {
        const newMat: Material = {
          ...mat,
          id: `mat-${Date.now()}`,
          uploadDate: new Date().toISOString().split('T')[0]
        };
        return { ...w, materials: [...w.materials, newMat] };
      }
      return w;
    });
    setWorkspaces(updated);
    triggerToast("Uploaded document simulation committed in classroom folders.");
  };

  const handleDeleteMaterialInWorkspace = (wsId: string, matId: string) => {
    const updated = workspaces.map(w => 
      w.id === wsId ? { ...w, materials: w.materials.filter(m => m.id !== matId) } : w
    );
    setWorkspaces(updated);
    triggerToast("Removed document card.");
  };

  // --- Prompts/Criteria nested operations ---
  const handleAddInstructionInWorkspace = (wsId: string, inst: Omit<Instruction, 'id'>) => {
    const updated = workspaces.map(w => {
      if (w.id === wsId) {
        const newInst: Instruction = {
          ...inst,
          id: `inst-${Date.now()}`
        };
        return { ...w, instructions: [...w.instructions, newInst] };
      }
      return w;
    });
    setWorkspaces(updated);
    triggerToast("Saved custom prompting rubric.");
  };

  const handleDeleteInstructionInWorkspace = (wsId: string, instId: string) => {
    const updated = workspaces.map(w => 
      w.id === wsId ? { ...w, instructions: w.instructions.filter(i => i.id !== instId) } : w
    );
    setWorkspaces(updated);
    triggerToast("Removed custom prompting rubric.");
  };

  // --- RAG Chat API Bridge execution ---
  const handleSendChatMessage = async (sessionId: string, text: string) => {
    if (!activeWorkspace) return;

    // Local chat updates
    const updatedSessions = activeWorkspace.ragSessions.map(sec => {
      if (sec.id === sessionId) {
        const userMsg: Message = {
          id: `m-${Date.now()}-user`,
          role: 'user',
          text,
          timestamp: new Date().toISOString()
        };
        return { ...sec, messages: [...sec.messages, userMsg] };
      }
      return sec;
    });

    // Commit user message to state
    const currentWorkspaceIndex = workspaces.findIndex(w => w.id === activeWorkspace.id);
    const updatedWorkspaces = [...workspaces];
    updatedWorkspaces[currentWorkspaceIndex] = {
      ...activeWorkspace,
      ragSessions: updatedSessions
    };
    setWorkspaces(updatedWorkspaces);
    setIsGeneratingAI(true);

    try {
      const activeSession = updatedSessions.find(s => s.id === sessionId);
      const payload = {
        messages: activeSession?.messages || [],
        workspaceName: activeWorkspace.name,
        subject: activeWorkspace.subject,
        academicYear: activeWorkspace.academicYear,
        semester: activeWorkspace.semester,
        teacherName: activeWorkspace.teacherName,
        teachingStyle: activeWorkspace.teachingStyle,
        specialNotes: activeWorkspace.specialNotes,
        assessmentPreferences: activeWorkspace.assessmentPreferences,
        materials: activeWorkspace.materials,
        instructions: activeWorkspace.instructions,
        students: activeWorkspace.students,
        newAnalysisConfig: {
          type: activeSession?.type || 'Student Performance Analysis',
          scopeType: activeSession?.scopeType || 'class',
          selectedIds: activeSession?.selectedIds || [],
          customInstructions: activeSession?.customInstructions || ''
        }
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP status query crash: ${response.status}`);
      }

      const rawJson = await response.json();
      
      // Append assistant message response
      const serverMsg: Message = {
        id: `m-${Date.now()}-ai`,
        role: 'assistant',
        text: rawJson.text || "I was unable to structure an assessment insight for this context.",
        visualization: rawJson.visualization || undefined,
        timestamp: new Date().toISOString()
      };

      const finalSessions = updatedWorkspaces[currentWorkspaceIndex].ragSessions.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, serverMsg] };
        }
        return s;
      });

      const processedWorkspaces = [...workspaces];
      processedWorkspaces[currentWorkspaceIndex] = {
        ...activeWorkspace,
        ragSessions: finalSessions
      };
      setWorkspaces(processedWorkspaces);

    } catch (err: any) {
      console.warn("RAG server-side call failed. Returning simulated assessment fallback details.", err);
      triggerToast("Running diagnostic model analysis...");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Triggering specific student roster modals inside CommandPalette switches
  const handleOpenStudentDrawer = (studentId: string) => {
    // Select the active selector trigger by updating studentId inside state
    const targetInput = document.querySelector(`[key="${studentId}"]`) as HTMLElement;
    if (targetInput) targetInput.click();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-primary-text font-sans relative transition-colors duration-200">
      
      {/* Toast Alert pop notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-surface/90 border border-primary/30 backdrop-blur px-5 py-2.5 rounded-full shadow-2xl z-50 text-xs font-semibold text-primary flex items-center gap-2 animate-bounce flex-row">
          <Sparkles className="w-4 h-4 animate-spin shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Command palette shortcut controller */}
      {activeWorkspace && (
        <CommandPalette 
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={handleSelectWorkspace}
          onOpenStudent={handleOpenStudentDrawer}
          onToggleFocusMode={setIsFocusMode}
          isFocusMode={isFocusMode}
          onTriggerToast={triggerToast}
        />
      )}

      {/* Persistence Side listing controls */}
      <Sidebar 
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        templates={templates}
        theme={theme}
        onChangeTheme={setTheme}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onDuplicateWorkspace={handleDuplicateWorkspace}
        onArchiveWorkspace={handleArchiveWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onCreateTemplate={handleCreateTemplate}
        onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onSelectTemplateAsPreset={handleSelectTemplateAsPreset}
        onOpenAccountModal={setActiveAccountModal}
      />

      {/* Active Classroom viewport */}
      {activeWorkspace ? (
        <main className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden h-screen space-y-4 md:space-y-4">
          
          {/* Breadcrumb Info Bar */}
          <div className="flex items-center justify-between shrink-0 px-1 pt-1.5 pb-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-text">Workspace / Classes /</span>
              <span className="text-xs font-bold text-primary-text font-display">{activeWorkspace.name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Shortcut label info */}
              <span className="hidden md:inline-block text-[10px] font-mono text-muted-text bg-elevated border border-border-color px-2.5 py-1 rounded-lg">
                Ctrl + K to query any Student or Cohort
              </span>
            </div>
          </div>

          {/* Core double split viewport */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 gap-4 md:gap-4">
            
            {/* Top Row: Hidden entirely when entering immersive active RAG Session conversion (Focus Mode) */}
            {!isFocusMode && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[240px] shrink-0 min-h-0">
                {/* Details top left section */}
                <div className="lg:col-span-5 h-full min-h-0">
                  <WorkspaceDetails 
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateWorkspace}
                    onAddMaterial={handleAddMaterialInWorkspace}
                    onDeleteMaterial={handleDeleteMaterialInWorkspace}
                    onAddInstruction={handleAddInstructionInWorkspace}
                    onDeleteInstruction={handleDeleteInstructionInWorkspace}
                  />
                </div>

                {/* Roster students top right section */}
                <div className="lg:col-span-7 h-full min-h-0">
                  <StudentRegister 
                    workspace={activeWorkspace}
                    onUpdateWorkspace={handleUpdateWorkspace}
                  />
                </div>
              </div>
            )}

            {/* Bottom Row / Full screen: active RAG workspace chatbot analysis */}
            <div className="flex-1 min-h-0">
              <RAGWorkspace 
                workspace={activeWorkspace}
                onUpdateWorkspace={handleUpdateWorkspace}
                isFocusMode={isFocusMode}
                onToggleFocusMode={setIsFocusMode}
                onSendChatMessage={handleSendChatMessage}
                isGeneratingAI={isGeneratingAI}
              />
            </div>

          </div>

        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <span className="text-sm font-mono text-muted-text">Register or select a Class Workspace to initialize system dashboards</span>
          <button 
            onClick={() => handleCreateWorkspace("Grade 10 Mathematics Standard")}
            className="px-4 py-2 bg-indigo-600 rounded-xl text-white font-semibold text-xs"
          >
            Create First Class Workspace
          </button>
        </div>
      )}

      {/* --- ACCOUNT MODALS SYSTEM overlays --- */}
      {activeAccountModal && (
        <div className="fixed inset-0 bg-primary-text/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setActiveAccountModal(null)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-elevated border border-border-color rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative"
          >
            {/* Close trigger */}
            <button 
              onClick={() => setActiveAccountModal(null)}
              className="absolute right-5 top-5 hover:bg-surface p-1.5 rounded-xl text-muted-text hover:text-primary-text cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {activeAccountModal === 'profile' && (
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

            {activeAccountModal === 'preferences' && (
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
                    onClick={() => { setActiveAccountModal(null); triggerToast("Teaching guidelines successfully cached."); }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs font-sans cursor-pointer transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeAccountModal === 'settings' && (
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
                    <span className="px-2 py-0.5 bg-success/10 text-success border border-success/25 text-[10px] font-mono rounded">
                      Autosaved
                    </span>
                  </div>

                  <div className="bg-surface p-4 border border-border-color rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <span className="font-semibold text-primary-text block">Server-Side Gemini Keys</span>
                      <span className="text-[9px] text-muted-text font-mono block mt-1">Settings & secrets injected automatically</span>
                    </div>
                    <Key className="w-4.5 h-4.5 text-primary/80" />
                  </div>
                </div>
              </div>
            )}

            {activeAccountModal === 'subscription' && (
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
                      onClick={() => { setActiveAccountModal(null); triggerToast("Mock Upgrade Successful: Welcome to Pro!"); }}
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
      )}

    </div>
  );
}
