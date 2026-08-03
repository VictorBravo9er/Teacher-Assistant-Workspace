import React, { useState, useEffect } from 'react';
import { secureStorage } from '../lib/storage';
import {
  ClassModel,
  Template,
  Student,
  Material,
  Instruction,
  RAGSession,
  Message,
} from "../types/main";

import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { classService } from '../services/classService';
import { templateService } from '../services/templateService';
import { materialService } from '../services/materialService';
import Sidebar from './Sidebar';
import ClassDetails from './ClassDetails';
import StudentRegister from './StudentRegister';
import RAGClass from './RAGClass';
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
  PanelTop,
  SquareSplitVertical,
  Square,
  Check,
  Edit3,
  Save,
} from "lucide-react";

export default function ClassApp() {
  // --- Persistent Local States ---
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    const saved = localStorage.getItem('edu_rag_theme');
    return (saved as 'system' | 'light' | 'dark') || 'system';
  });

  const { classes, templates, loading, error, mutateClasses, mutateTemplates, refresh } = useWorkspaceData();

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const saved = secureStorage.getItem('edu_rag_active_ws');
    if (saved && saved !== 'null') return saved;
    return '';
  });

  // Ensure active class falls back when data loads
  useEffect(() => {
    if (!activeClassId && classes.length > 0) {
      setActiveClassId(classes[0].id);
    }
  }, [classes, activeClassId]);

  const setClasses = mutateClasses;
  const setTemplates = mutateTemplates;

  const [viewMode, setViewMode] = useState<'class' | 'template'>('class');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'split' | 'chat-only' | 'details-only'>('split');
  const [previousLayoutMode, setPreviousLayoutMode] = useState<'split' | 'chat-only' | 'details-only'>('split');
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

  useEffect(() => {
    secureStorage.setItem('edu_rag_active_ws', activeClassId);
  }, [activeClassId]);

  // Autohide toasts
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const activeClass = classes.find(w => w.id === activeClassId) || classes[0];
  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];

  // Helper Toast trigger
  const triggerToast = (text: string) => {
    setToastMessage(text);
  };

  // --- ClassModel mutations ---
  const handleSelectClass = (id: string) => {
    setActiveClassId(id);
    setViewMode('class');
    setIsEditMode(false);
    setLayoutMode('split'); // Reset focus mode on class switches
    setPreviousLayoutMode('split');
  };

  const handleSelectTemplate = (id: string) => {
    setActiveTemplateId(id);
    setViewMode('template');
    setIsEditMode(false);
    setLayoutMode('details-only');
    setPreviousLayoutMode('details-only');
  };

  const handleCreateClass = async (name: string, templateId?: string, instituteId?: string) => {
    try {
      const matchedTemplate = templates.find(t => t.id === templateId);

      const newClass = await classService.createClass({
        name,
        instituteId,
        subject: matchedTemplate ? matchedTemplate.subject : 'General Course Room',
        teachingStyle: matchedTemplate ? matchedTemplate.teachingStyle : 'Structured Inquiry-led',
        experienceLevel: 'Senior Instructor (12 Years)',
        specialNotes: matchedTemplate ? matchedTemplate.description : 'Welcome to your brand new class cohort.',
        materials: [], // We'd need to actually copy materials from preset to materials table in a real app
        instructions: matchedTemplate ? (matchedTemplate.instructions as any) : [],
      });

      setClasses([newClass, ...classes]);
      setActiveClassId(newClass.id);
      setViewMode('class');
      setIsEditMode(false);
      setLayoutMode('split');
      setPreviousLayoutMode('split');
      triggerToast(`Created classroom: "${name}"`);
    } catch (err: any) {
      triggerToast(`Error creating class: ${err.message}`);
    }
  };

  const handleRenameClass = async (id: string, newName: string) => {
    try {
      await classService.updateClass(id, { name: newName });
      setClasses(classes.map(w => w.id === id ? { ...w, name: newName } : w));
      triggerToast("Class rename successfully committed.");
    } catch (err: any) {
      triggerToast(`Failed to rename: ${err.message}`);
    }
  };

  const handleDuplicateClass = async (id: string) => {
    const target = classes.find(w => w.id === id);
    if (!target) return;

    try {
      const duplicated = await classService.createClass({
        ...target,
        name: `${target.name} (Copy)`,
      });

      setClasses([duplicated, ...classes]);
      setActiveClassId(duplicated.id);
      triggerToast("Duplicated classroom context.");
    } catch (err: any) {
      triggerToast(`Failed to duplicate: ${err.message}`);
    }
  };

  const handleArchiveClass = async (id: string) => {
    const target = classes.find(w => w.id === id);
    if (!target) return;
    try {
      await classService.updateClass(id, { archived: !target.archived });
      setClasses(classes.map((w) => (w.id === id ? { ...w, archived: !w.archived } : w)));
      triggerToast(!target.archived ? "Archived classroom context." : "Restored classroom context.");
    } catch (err: any) {
      triggerToast(`Failed to archive: ${err.message}`);
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await classService.deleteClass(id);
      const filtered = classes.filter(w => w.id !== id);
      setClasses(filtered);
      if (activeClassId === id) {
        setActiveClassId(filtered[0]?.id || '');
      }
      triggerToast("Classroom portfolio permanently removed.");
    } catch (err: any) {
      triggerToast(`Failed to delete: ${err.message}`);
    }
  };

  const handleUpdateClass = async (id: string, updatedFields: Partial<ClassModel>) => {
    try {
      await classService.updateClass(id, updatedFields);
      setClasses(classes.map(w => w.id === id ? { ...w, ...updatedFields } : w));
    } catch (err: any) {
      triggerToast(`Failed to update: ${err.message}`);
    }
  };

  // --- Reusable templates mutations ---
  const handleCreateTemplate = async (tpl: Omit<Template, 'id'>) => {
    try {
      const newTpl = await templateService.createTemplate(tpl);
      setTemplates([newTpl, ...templates]);
      triggerToast(`Created lesson template: "${newTpl.name}"`);
    } catch (err: any) {
      triggerToast(`Error creating template: ${err.message}`);
    }
  };

  const handleSelectTemplateAsPreset = (tpl: Template) => {
    handleCreateClass(tpl.name, tpl.id);
  };

  const handleSaveCurrentAsTemplate = async () => {
    if (!activeClass) return;
    try {
      const newTpl = await templateService.createTemplate({
        name: `${activeClass.name} Template`,
        description: `Saved from active class ${activeClass.name} with ${activeClass.materials.length} reference materials files.`,
        subject: activeClass.subject,
        teachingStyle: activeClass.teachingStyle,
        instructions: activeClass.instructions.map(i => ({ title: i.title, type: i.type, content: i.content })),
        materialsPreset: activeClass.materials.map(m => ({ name: m.name, type: m.type, size: m.size, tags: m.tags }))
      });

      setTemplates([newTpl, ...templates]);
      triggerToast("Saved active class roster settings as reusable template!");
    } catch (err: any) {
      triggerToast(`Failed to save template: ${err.message}`);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await templateService.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      triggerToast("Template portfolio removed.");
    } catch (err: any) {
      triggerToast(`Failed to delete template: ${err.message}`);
    }
  };

  // --- Nest Subitems ClassModel management (Materials) ---
  const handleAddMaterialInClass = async (wsId: string, mat: Omit<Material, 'id' | 'uploadDate'>, file?: File) => {
    try {
      let publicUrl = '';
      if (file) {
        publicUrl = await materialService.uploadMaterialFile(wsId, file);
      }
      
      const newMat = await materialService.createMaterial(wsId, {
        name: mat.name,
        type: mat.type,
        size: mat.size,
        tags: mat.tags,
        url: publicUrl,
      });

      const updated = classes.map(w => {
        if (w.id === wsId) {
          return { ...w, materials: [...w.materials, newMat] };
        }
        return w;
      });
      setClasses(updated);
      triggerToast("Uploaded document simulation committed in classroom folders.");
    } catch (err: any) {
      triggerToast(`Failed to upload material: ${err.message}`);
    }
  };

  const handleDeleteMaterialInClass = async (wsId: string, matId: string) => {
    try {
      await materialService.deleteMaterial(matId);
      const updated = classes.map((w) =>
        w.id === wsId
          ? { ...w, materials: w.materials.filter((m) => m.id !== matId) }
          : w,
      );
      setClasses(updated);
      triggerToast("Removed document card.");
    } catch (err: any) {
      triggerToast(`Failed to delete material: ${err.message}`);
    }
  };

  // --- Prompts/Criteria nested operations ---
  const handleAddInstructionInClass = (wsId: string, inst: Omit<Instruction, 'id'>) => {
    const updated = classes.map(w => {
      if (w.id === wsId) {
        const newInst: Instruction = {
          ...inst,
          id: `inst-${Date.now()}`
        };
        return { ...w, instructions: [...w.instructions, newInst] };
      }
      return w;
    });
    setClasses(updated);
    triggerToast("Saved custom prompting rubric.");
  };

  const handleDeleteInstructionInClass = (wsId: string, instId: string) => {
    const updated = classes.map((w) =>
      w.id === wsId
        ? { ...w, instructions: w.instructions.filter((i) => i.id !== instId) }
        : w,
    );
    setClasses(updated);
    triggerToast("Removed custom prompting rubric.");
  };

  // --- Adapter mapping for ClassDetails ---
  const handleAdapterUpdate = (id: string, updatedFields: Partial<ClassModel>) => {
    if (viewMode === 'class') {
      handleUpdateClass(id, updatedFields);
    } else {
      setTemplates(templates.map(t => {
        if (t.id === id) {
          const update: Partial<Template> = {};
          if (updatedFields.subject !== undefined) update.subject = updatedFields.subject;
          if (updatedFields.teachingStyle !== undefined) update.teachingStyle = updatedFields.teachingStyle;
          if (updatedFields.specialNotes !== undefined) update.description = updatedFields.specialNotes;
          if (updatedFields.materials !== undefined) {
            update.materialsPreset = updatedFields.materials.map(m => ({
              name: m.name, type: m.type as any, size: m.size, tags: m.tags
            }));
          }
          if (updatedFields.instructions !== undefined) {
            update.instructions = updatedFields.instructions.map(i => ({
              title: i.title, type: i.type as any, content: i.content
            }));
          }
          return { ...t, ...update };
        }
        return t;
      }));
    }
  };

  const handleAdapterAddMaterial = (id: string, mat: Omit<Material, 'id' | 'uploadDate'>) => {
    if (viewMode === 'class') {
      handleAddMaterialInClass(id, mat);
    } else {
      setTemplates(templates.map(t => {
        if (t.id === id) {
          return { ...t, materialsPreset: [...t.materialsPreset, { name: mat.name, type: mat.type as any, size: mat.size, tags: mat.tags }] };
        }
        return t;
      }));
      triggerToast("Added material to template.");
    }
  };

  const handleAdapterDeleteMaterial = (id: string, matId: string) => {
    if (viewMode === 'class') {
      handleDeleteMaterialInClass(id, matId);
    } else {
      const idx = parseInt(matId.replace('mat-', ''), 10);
      setTemplates(templates.map(t => {
        if (t.id === id) {
          return { ...t, materialsPreset: t.materialsPreset.filter((_, i) => i !== idx) };
        }
        return t;
      }));
      triggerToast("Removed document from template.");
    }
  };

  const handleAdapterAddInstruction = (id: string, inst: Omit<Instruction, 'id'>) => {
    if (viewMode === 'class') {
      handleAddInstructionInClass(id, inst);
    } else {
      setTemplates(templates.map(t => {
        if (t.id === id) {
          return { ...t, instructions: [...t.instructions, { title: inst.title, type: inst.type as any, content: inst.content }] };
        }
        return t;
      }));
      triggerToast("Added custom prompting rubric to template.");
    }
  };

  const handleAdapterDeleteInstruction = (id: string, instId: string) => {
    if (viewMode === 'class') {
      handleDeleteInstructionInClass(id, instId);
    } else {
      const idx = parseInt(instId.replace('inst-', ''), 10);
      setTemplates(templates.map(t => {
        if (t.id === id) {
          return { ...t, instructions: t.instructions.filter((_, i) => i !== idx) };
        }
        return t;
      }));
      triggerToast("Removed instruction from template.");
    }
  };

  const adapterClassItem: ClassModel | null = viewMode === 'class' && activeClass
    ? activeClass
    : (activeTemplate ? {
        id: activeTemplate.id,
        name: activeTemplate.name,
        subject: activeTemplate.subject,
        teachingStyle: activeTemplate.teachingStyle,
        specialNotes: activeTemplate.description,
        experienceLevel: 'Template Base',
        academicYear: 'N/A',
        semester: 'N/A',
        teacherName: 'Template',
        students: [],
        ragSessions: [],
        materials: activeTemplate.materialsPreset.map((m, i) => ({ ...m, id: `mat-${i}`, uploadDate: 'N/A' })),
        instructions: activeTemplate.instructions.map((inst, i) => ({ ...inst, id: `inst-${i}` })),
      } : null);

  // --- Client-side Mock Chat execution ---
  const handleSendChatMessage = async (sessionId: string, text: string) => {
    if (!activeClass) return;

    // Local chat updates
    const updatedSessions = activeClass.ragSessions.map(sec => {
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
    const currentClassIndex = classes.findIndex(w => w.id === activeClass.id);
    const updatedClasses = [...classes];
    updatedClasses[currentClassIndex] = {
      ...activeClass,
      ragSessions: updatedSessions
    };
    setClasses(updatedClasses);
    setIsGeneratingAI(true);

    try {
      const activeSession = updatedSessions.find(s => s.id === sessionId);
      const payload = {
        messages: activeSession?.messages || [],
        classItemName: activeClass.name,
        subject: activeClass.subject,
        academicYear: activeClass.academicYear,
        semester: activeClass.semester,
        teacherName: activeClass.teacherName,
        teachingStyle: activeClass.teachingStyle,
        specialNotes: activeClass.specialNotes,
        assessmentPreferences: activeClass.assessmentPreferences,
        materials: activeClass.materials,
        instructions: activeClass.instructions,
        students: activeClass.students,
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

      const finalSessions = updatedClasses[currentClassIndex].ragSessions.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, serverMsg] };
        }
        return s;
      });

      const processedClasses = [...classes];
      processedClasses[currentClassIndex] = {
        ...activeClass,
        ragSessions: finalSessions
      };
      setClasses(processedClasses);

    } catch (err: any) {
      console.warn("FastAPI backend call failed. Falling back to client mock simulation...", err);
      // Fallback
      const mockCtx = {
        prompt: text,
        students: activeClass.students,
        materials: activeClass.materials,
        instructions: activeClass.instructions
      };
      const mockResponse = await getMockChatResponse(mockCtx);

      const serverMsg: Message = {
        id: `m-${Date.now()}-ai`,
        role: 'assistant',
        text: mockResponse.text,
        visualization: mockResponse.visualization,
        timestamp: new Date().toISOString()
      };

      const finalSessions = updatedClasses[currentClassIndex].ragSessions.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, serverMsg] };
        }
        return s;
      });

      const processedClasses = [...classes];
      processedClasses[currentClassIndex] = {
        ...activeClass,
        ragSessions: finalSessions
      };
      setClasses(processedClasses);
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
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed top-5 right-5 z-50 bg-surface border border-primary/40 text-primary-text px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce"
        >
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-xs font-semibold font-mono">
            {toastMessage}
          </span>
          <button
            id="toast-dismiss-button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-elevated rounded-lg text-muted-text hover:text-primary-text transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Command palette shortcut controller */}
      {viewMode === "class" && activeClass && (
        <CommandPalette
          classes={classes}
          activeClass={activeClass}
          onSelectClass={handleSelectClass}
          onOpenStudent={handleOpenStudentDrawer}
          onToggleFocusMode={(focus) =>
            setLayoutMode(focus ? "chat-only" : "split")
          }
          isFocusMode={layoutMode === "chat-only"}
          onTriggerToast={triggerToast}
        />
      )}

      {/* Persistence Side listing controls */}
      <Sidebar
        classes={classes}
        activeClassId={activeClassId}
        templates={templates}
        theme={theme}
        onChangeTheme={setTheme}
        onSelectClass={handleSelectClass}
        onCreateClass={handleCreateClass}
        onRenameClass={handleRenameClass}
        onDuplicateClass={handleDuplicateClass}
        onArchiveClass={handleArchiveClass}
        onDeleteClass={handleDeleteClass}
        onCreateTemplate={handleCreateTemplate}
        onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onSelectTemplate={handleSelectTemplate}
        isEditMode={isEditMode}
        viewMode={viewMode}
        activeTemplateId={activeTemplateId}
        onOpenAccountModal={setActiveAccountModal}
        onTriggerToast={triggerToast}
      />

      {/* Active Classroom viewport */}
      {adapterClassItem ? (
        <main className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden h-screen space-y-4 md:space-y-4 relative">
          {/* Breadcrumb Info Bar */}
          <div className="flex items-center justify-between shrink-0 px-1 pt-1.5 pb-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-text">
                ClassModel / {viewMode === "class" ? "Classes" : "Templates"} /
              </span>
              <span className="text-xs font-bold text-primary-text font-display">
                {adapterClassItem.name}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-block text-[10px] font-mono text-muted-text bg-elevated border border-border-color px-2.5 py-1 rounded-lg">
                Ctrl + K to query any Student or Cohort
              </span>
            </div>
          </div>

          {/* Core double split viewport */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 gap-4 md:gap-4 relative">
            {/* Combined Top Section Container */}
            <div
              className={`flex flex-col transition-all border border-border-color rounded-3xl p-3 bg-surface/30 ${
                layoutMode === "details-only"
                  ? "flex-1 min-h-0"
                  : layoutMode === "chat-only"
                    ? "shrink-0"
                    : "h-[280px] shrink-0"
              }`}
            >
              {/* Upper section layout controls (ALWAYS VISIBLE) */}
              <div
                id="top-nav-controls"
                className={`flex items-center justify-end gap-2 shrink-0 ${layoutMode !== "chat-only" ? "mb-2" : ""}`}
              >
                {viewMode === "template" && !isEditMode && (
                  <button
                    id="top-nav-preset-template-button"
                    onClick={() =>
                      activeTemplate &&
                      handleSelectTemplateAsPreset(activeTemplate)
                    }
                    className="flex items-center justify-center w-7 h-7 bg-primary text-white border border-primary rounded-lg transition-colors cursor-pointer hover:bg-primary/90"
                    title="Start Class from Template"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {isEditMode ? (
                  <>
                    <button
                      id="top-nav-save-button"
                      onClick={() => {
                        setIsEditMode(false);
                        setLayoutMode(previousLayoutMode);
                      }}
                      className="flex items-center justify-center w-7 h-7 bg-success text-white border border-success rounded-lg transition-colors cursor-pointer hover:bg-success/90"
                      title="Save Changes"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      id="top-nav-cancel-button"
                      onClick={() => {
                        setIsEditMode(false);
                        setLayoutMode(previousLayoutMode);
                      }}
                      className="flex items-center justify-center w-7 h-7 bg-elevated/50 hover:bg-elevated border border-border-color rounded-lg transition-colors cursor-pointer text-muted-text hover:text-primary-text"
                      title="Cancel Editing"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    id="top-nav-edit-button"
                    onClick={() => {
                      setPreviousLayoutMode(layoutMode);
                      setIsEditMode(true);
                      setLayoutMode("details-only");
                    }}
                    className="flex items-center justify-center w-7 h-7 bg-elevated/50 hover:bg-elevated border border-border-color rounded-lg transition-colors cursor-pointer text-muted-text hover:text-primary-text"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                {viewMode === "class" && (
                  <div
                    id="top-nav-view-mode-group"
                    className={`flex items-center bg-elevated/40 border border-border-color rounded-lg p-0.5 ${isEditMode ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <button
                      id="view-mode-chat-only-button"
                      onClick={() => setLayoutMode("chat-only")}
                      className={`flex items-center justify-center w-8 h-7 rounded-md transition-colors cursor-pointer ${
                        layoutMode === "chat-only"
                          ? "bg-surface shadow-sm text-primary"
                          : "text-muted-text hover:text-primary-text hover:bg-elevated/60"
                      }`}
                      title="Chat Only (Collapse Details)"
                    >
                      <PanelTop className="w-4 h-4" />
                    </button>
                    <button
                      id="view-mode-split-button"
                      onClick={() => setLayoutMode("split")}
                      className={`flex items-center justify-center w-8 h-7 rounded-md transition-colors cursor-pointer ${
                        layoutMode === "split"
                          ? "bg-surface shadow-sm text-primary"
                          : "text-muted-text hover:text-primary-text hover:bg-elevated/60"
                      }`}
                      title="Split View"
                    >
                      <SquareSplitVertical className="w-4 h-4" />
                    </button>
                    <button
                      id="view-mode-details-only-button"
                      onClick={() => setLayoutMode("details-only")}
                      className={`flex items-center justify-center w-8 h-7 rounded-md transition-colors cursor-pointer ${
                        layoutMode === "details-only"
                          ? "bg-surface shadow-sm text-primary"
                          : "text-muted-text hover:text-primary-text hover:bg-elevated/60"
                      }`}
                      title="Details Only (Expand)"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Top Row Content */}
              {layoutMode !== "chat-only" && (
                <div
                  className={`grid gap-4 flex-1 min-h-0 ${layoutMode === "details-only" ? "grid-cols-1 grid-rows-[auto_1fr]" : "grid-cols-1 lg:grid-cols-12"}`}
                >
                  {layoutMode === "details-only" ? (
                    <>
                      {/* Roster students top row */}
                      {viewMode === "class" && !isEditMode && (
                        <div className="w-full">
                          <StudentRegister
                            classItem={adapterClassItem}
                            onUpdateClass={handleAdapterUpdate}
                          />
                        </div>
                      )}

                      {/* Details bottom row */}
                      <div className="w-full h-full min-h-0">
                        <ClassDetails
                          classItem={adapterClassItem}
                          isEditMode={isEditMode}
                          onUpdateClass={handleAdapterUpdate}
                          onAddMaterial={handleAdapterAddMaterial}
                          onDeleteMaterial={handleAdapterDeleteMaterial}
                          onAddInstruction={handleAdapterAddInstruction}
                          onDeleteInstruction={handleAdapterDeleteInstruction}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Details top left section */}
                      <div className="lg:col-span-5 h-full min-h-0">
                        <ClassDetails
                          classItem={adapterClassItem}
                          isEditMode={isEditMode}
                          onUpdateClass={handleAdapterUpdate}
                          onAddMaterial={handleAdapterAddMaterial}
                          onDeleteMaterial={handleAdapterDeleteMaterial}
                          onAddInstruction={handleAdapterAddInstruction}
                          onDeleteInstruction={handleAdapterDeleteInstruction}
                        />
                      </div>

                      {/* Roster students top right section */}
                      <div className="lg:col-span-7 h-full min-h-0">
                        {viewMode === "class" && !isEditMode && (
                          <StudentRegister
                            classItem={adapterClassItem}
                            onUpdateClass={handleAdapterUpdate}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Row / Chat classItem */}
            {layoutMode !== "details-only" && viewMode === "class" && (
              <div className="flex-1 min-h-0 relative">
                <RAGClass
                  classItem={adapterClassItem}
                  onUpdateClass={handleAdapterUpdate}
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
          <span className="text-sm font-mono text-muted-text">
            Register or select a Class ClassModel to initialize system
            dashboards
          </span>
          <button
            onClick={() => handleCreateClass("Grade 10 Mathematics Standard")}
            className="px-4 py-2 bg-primary rounded-xl text-white font-semibold text-xs cursor-pointer"
          >
            Create First Class ClassModel
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
