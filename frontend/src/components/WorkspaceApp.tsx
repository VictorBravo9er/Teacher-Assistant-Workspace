import React, { useState, useEffect } from 'react';
import { Workspace, Template, Student, Material, Instruction, RAGSession, Message } from '../types';
import { DEFAULT_WORKSPACES, DEFAULT_TEMPLATES } from '../defaultData';
import Sidebar from './Sidebar';
import WorkspaceDetails from './WorkspaceDetails';
import StudentRegister from './StudentRegister';
import RAGWorkspace from './RAGWorkspace';
import CommandPalette from './CommandPalette';
import AccountModals from './AccountModals';
import { getMockChatResponse } from '../mockChat';
import { 
  Sparkles, 
  X,
  UserCircle2,
  ShieldCheck,
  Sliders,
  Settings,
  Key,
  Maximize2,
  Minimize2,
  ChevronDown
} from 'lucide-react';

export default function WorkspaceApp() {
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

  const [layoutMode, setLayoutMode] = useState<'split' | 'chat-only' | 'details-only'>('split');
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
    setLayoutMode('split'); // Reset focus mode on class switches
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

  // --- Client-side Mock Chat execution ---
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

      let resJson;
      if (response.ok) {
        resJson = await response.json();
      } else {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }
      
      const serverMsg: Message = {
        id: `m-${Date.now()}-ai`,
        role: 'assistant',
        text: resJson.text || "I was unable to structure an assessment insight.",
        visualization: resJson.visualization || undefined,
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
      console.warn("FastAPI backend call failed. Falling back to client mock simulation...", err);
      // Fallback
      const mockCtx = {
        prompt: text,
        students: activeWorkspace.students,
        materials: activeWorkspace.materials,
        instructions: activeWorkspace.instructions
      };
      const mockResponse = await getMockChatResponse(mockCtx);
      
      const serverMsg: Message = {
        id: `m-${Date.now()}-ai`,
        role: 'assistant',
        text: mockResponse.text,
        visualization: mockResponse.visualization,
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
      triggerToast("Running diagnostic model analysis...");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleOpenStudentDrawer = (studentId: string) => {
    setSelectedStudentIdState(studentId);
  };

  // State bridge to communicate command palette selections to StudentRegister modal open
  const setSelectedStudentIdState = (studentId: string) => {
    const studentCard = document.querySelector(`[key="${studentId}"]`) as HTMLElement;
    if (studentCard) {
      studentCard.click();
    }
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
          onToggleFocusMode={(focus) => setLayoutMode(focus ? 'chat-only' : 'split')}
          isFocusMode={layoutMode === 'chat-only'}
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
        <main className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden h-screen space-y-4 md:space-y-4 relative">
          
          {/* Breadcrumb Info Bar */}
          <div className="flex items-center justify-between shrink-0 px-1 pt-1.5 pb-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-text">Workspace / Classes /</span>
              <span className="text-xs font-bold text-primary-text font-display">{activeWorkspace.name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-block text-[10px] font-mono text-muted-text bg-elevated border border-border-color px-2.5 py-1 rounded-lg">
                Ctrl + K to query any Student or Cohort
              </span>
            </div>
          </div>

          {/* Core double split viewport */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 gap-4 md:gap-4 relative">
            
            {/* Top Row: Hidden entirely when 'chat-only', full screen when 'details-only' */}
            {layoutMode !== 'chat-only' && (
              <div className={`flex flex-col min-h-0 transition-all ${layoutMode === 'details-only' ? 'flex-1' : 'h-[240px] shrink-0'}`}>
                {/* Upper section layout controls */}
                <div className="flex items-center justify-end gap-2 mb-2">
                   {layoutMode === 'split' ? (
                     <>
                       <button 
                         onClick={() => setLayoutMode('chat-only')}
                         className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-muted-text hover:text-primary-text bg-elevated/50 hover:bg-elevated border border-border-color rounded-lg transition-colors cursor-pointer"
                         title="Collapse Details"
                       >
                         <ChevronDown className="w-3.5 h-3.5" />
                         Collapse Details
                       </button>
                       <button 
                         onClick={() => setLayoutMode('details-only')}
                         className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-primary hover:text-primary/80 bg-primary/10 border border-primary/20 rounded-lg transition-colors cursor-pointer"
                         title="Expand Details to Full Screen"
                       >
                         <Maximize2 className="w-3.5 h-3.5" />
                         Expand Details
                       </button>
                     </>
                   ) : (
                     <button 
                       onClick={() => setLayoutMode('split')}
                       className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-muted-text hover:text-primary-text bg-elevated/50 hover:bg-elevated border border-border-color rounded-lg transition-colors cursor-pointer"
                     >
                       <Minimize2 className="w-3.5 h-3.5" />
                       Restore Split View
                     </button>
                   )}
                </div>

                <div className={`grid gap-4 flex-1 min-h-0 ${layoutMode === 'details-only' ? 'grid-cols-1 grid-rows-[auto_1fr]' : 'grid-cols-1 lg:grid-cols-12'}`}>
                  {layoutMode === 'details-only' ? (
                    <>
                      {/* Roster students top row */}
                      <div className="w-full">
                        <StudentRegister 
                          workspace={activeWorkspace}
                          onUpdateWorkspace={handleUpdateWorkspace}
                        />
                      </div>
                      
                      {/* Details bottom row */}
                      <div className="w-full h-full min-h-0">
                        <WorkspaceDetails 
                          workspace={activeWorkspace}
                          onUpdateWorkspace={handleUpdateWorkspace}
                          onAddMaterial={handleAddMaterialInWorkspace}
                          onDeleteMaterial={handleDeleteMaterialInWorkspace}
                          onAddInstruction={handleAddInstructionInWorkspace}
                          onDeleteInstruction={handleDeleteInstructionInWorkspace}
                        />
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Row / Chat workspace */}
            {layoutMode !== 'details-only' && (
              <div className="flex-1 min-h-0 relative">
                <RAGWorkspace 
                  workspace={activeWorkspace}
                  onUpdateWorkspace={handleUpdateWorkspace}
                  layoutMode={layoutMode}
                  onToggleLayoutMode={setLayoutMode}
                  onSendChatMessage={handleSendChatMessage}
                  isGeneratingAI={isGeneratingAI}
                />
              </div>
            )}

          </div>

        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <span className="text-sm font-mono text-muted-text">Register or select a Class Workspace to initialize system dashboards</span>
          <button 
            onClick={() => handleCreateWorkspace("Grade 10 Mathematics Standard")}
            className="px-4 py-2 bg-primary rounded-xl text-white font-semibold text-xs cursor-pointer"
          >
            Create First Class Workspace
          </button>
        </div>
      )}

      {/* Account settings and utility modals */}
      <AccountModals 
        activeModal={activeAccountModal}
        onClose={() => setActiveAccountModal(null)}
        onTriggerToast={triggerToast}
      />

    </div>
  );
}
