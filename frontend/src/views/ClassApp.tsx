import React, { useState, useEffect } from 'react';
import { secureStorage } from '@/lib/storage';
import { Template } from '@/types/main';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useTheme } from '@/hooks/useTheme';
import { useClassOperations } from '@/hooks/useClassOperations';
import { useAIChat } from '@/hooks/useAIChat';
import { classService } from '@/services/classService';
import { templateService } from '@/services/templateService';

import Sidebar from '@/components/layout/Sidebar';
import ClassDetails from '@/features/classroom/ClassDetails';
import StudentRegister from '@/features/students/StudentRegister';
import RAGClass from '@/features/ai-assistant/RAGClass';
import CommandPalette from '@/components/layout/CommandPalette';
import AccountModals from '@/features/account/AccountModals';
import GradebookMatrix from '@/features/classroom/GradebookMatrix';
import ReportCardModal from '@/features/students/ReportCardModal';
import { LoadingOverlay } from '@/components/shared/CustomDialogs';

import {
  X,
  Check,
  Edit3,
  Save,
  Award,
  BookOpen,
  Table,
  PanelTop,
  SquareSplitVertical,
  Square,
} from 'lucide-react';

export default function ClassApp() {
  const { theme, setTheme } = useTheme();
  const { classes, templates, mutateClasses, mutateTemplates } = useWorkspaceData();

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const saved = secureStorage.getCachedItemWithTTL<string>('edu_rag_active_ws');
    if (saved && saved !== 'null') return saved;
    return '';
  });

  // Ensure active class falls back when data loads
  useEffect(() => {
    if (!activeClassId && classes.length > 0) {
      setActiveClassId(classes[0].id);
    }
  }, [classes, activeClassId]);

  useEffect(() => {
    secureStorage.setCachedItemWithTTL('edu_rag_active_ws', activeClassId, 0);
  }, [activeClassId]);

  const [viewMode, setViewMode] = useState<'class' | 'template'>('class');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'split' | 'chat-only' | 'details-only'>('split');
  const [previousLayoutMode, setPreviousLayoutMode] = useState<'split' | 'chat-only' | 'details-only'>('split');
  const [mainViewTab, setMainViewTab] = useState<'classroom' | 'gradebook'>('classroom');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'profile' | 'materials' | 'prompts'>('profile');
  const [activeAccountModal, setActiveAccountModal] = useState<
    'profile' | 'preferences' | 'settings' | 'subscription' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (text: string) => {
    setToastMessage(text);
  };

  // Autohide toasts
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Operations Hook
  const {
    processingMsg,
    preEditClassSnapshot,
    setPreEditClassSnapshot,
    preEditTemplateSnapshot,
    setPreEditTemplateSnapshot,
    activeClass,
    activeTemplate,
    adapterClassItem,
    handleSelectClass,
    handleSelectTemplate,
    handleCreateClass,
    handleRenameClass,
    handleDuplicateClass,
    handleArchiveClass,
    handleDeleteClass,
    handleCreateTemplate,
    handleSaveCurrentAsTemplate,
    handleDeleteTemplate,
    handleAdapterUpdate,
    handleAdapterAddMaterial,
    handleAdapterDeleteMaterial,
    handleAdapterAddInstruction,
    handleAdapterDeleteInstruction,
  } = useClassOperations({
    classes,
    templates,
    mutateClasses,
    mutateTemplates,
    activeClassId,
    setActiveClassId,
    activeTemplateId,
    setActiveTemplateId,
    viewMode,
    setViewMode,
    isEditMode,
    setIsEditMode,
    setLayoutMode,
    setPreviousLayoutMode,
    triggerToast,
  });

  // Chat Hook
  const { isGeneratingAI, sendChatMessage } = useAIChat({
    classes,
    setClasses: mutateClasses,
    triggerToast,
  });

  const handleSaveEditChanges = async () => {
    if (viewMode === 'class' && activeClass && preEditClassSnapshot) {
      const hasChanges =
        activeClass.name !== preEditClassSnapshot.name ||
        activeClass.subject !== preEditClassSnapshot.subject ||
        activeClass.semester !== preEditClassSnapshot.semester ||
        activeClass.academicYear !== preEditClassSnapshot.academicYear ||
        activeClass.teacherName !== preEditClassSnapshot.teacherName ||
        JSON.stringify(activeClass.teachingStyle) !== JSON.stringify(preEditClassSnapshot.teachingStyle) ||
        activeClass.experienceLevel !== preEditClassSnapshot.experienceLevel ||
        JSON.stringify(activeClass.assessmentPreferences) !== JSON.stringify(preEditClassSnapshot.assessmentPreferences) ||
        activeClass.specialNotes !== preEditClassSnapshot.specialNotes;

      if (hasChanges) {
        try {
          await classService.updateClass(activeClass.id, {
            name: activeClass.name,
            subject: activeClass.subject,
            semester: activeClass.semester,
            academicYear: activeClass.academicYear,
            teacherName: activeClass.teacherName,
            teachingStyle: activeClass.teachingStyle,
            experienceLevel: activeClass.experienceLevel,
            assessmentPreferences: activeClass.assessmentPreferences,
            specialNotes: activeClass.specialNotes,
          });
          triggerToast('Class changes saved to database.');
        } catch (err: any) {
          triggerToast(`Failed to save changes: ${err.message}`);
          return;
        }
      }
    } else if (viewMode === 'template' && activeTemplate && preEditTemplateSnapshot) {
      const hasChanges =
        activeTemplate.name !== preEditTemplateSnapshot.name ||
        activeTemplate.description !== preEditTemplateSnapshot.description ||
        activeTemplate.subject !== preEditTemplateSnapshot.subject ||
        JSON.stringify(activeTemplate.teachingStyle) !== JSON.stringify(preEditTemplateSnapshot.teachingStyle) ||
        JSON.stringify(activeTemplate.assessmentPreferences) !== JSON.stringify(preEditTemplateSnapshot.assessmentPreferences);

      if (hasChanges) {
        try {
          await templateService.updateTemplate(activeTemplate.id, {
            name: activeTemplate.name,
            description: activeTemplate.description,
            subject: activeTemplate.subject,
            teachingStyle: activeTemplate.teachingStyle,
            assessmentPreferences: activeTemplate.assessmentPreferences,
          });
          triggerToast('Template changes saved to database.');
        } catch (err: any) {
          triggerToast(`Failed to save template: ${err.message}`);
          return;
        }
      }
    }
    setIsEditMode(false);
    setLayoutMode(previousLayoutMode);
  };

  const handleCancelEdit = () => {
    if (viewMode === 'class' && preEditClassSnapshot) {
      mutateClasses(classes.map((c) => (c.id === preEditClassSnapshot.id ? preEditClassSnapshot : c)));
    } else if (viewMode === 'template' && preEditTemplateSnapshot) {
      mutateTemplates(templates.map((t) => (t.id === preEditTemplateSnapshot.id ? preEditTemplateSnapshot : t)));
    }
    setIsEditMode(false);
    setLayoutMode(previousLayoutMode);
    triggerToast('Editing cancelled; reverted changes.');
  };

  const handleStartEdit = () => {
    setPreviousLayoutMode(layoutMode);
    if (viewMode === 'class' && activeClass) {
      setPreEditClassSnapshot(structuredClone(activeClass));
    } else if (viewMode === 'template' && activeTemplate) {
      setPreEditTemplateSnapshot(structuredClone(activeTemplate));
    }
    setIsEditMode(true);
    setLayoutMode('details-only');
  };

  const handleOpenStudentDrawer = (studentId: string) => {
    const studentCard = document.getElementById(`student-card-${studentId}`);
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
          <span className="text-xs font-semibold font-mono">{toastMessage}</span>
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
      {viewMode === 'class' && activeClass && (
        <CommandPalette
          classes={classes}
          activeClass={activeClass}
          onSelectClass={handleSelectClass}
          onOpenStudent={handleOpenStudentDrawer}
          onToggleFocusMode={(focus) => setLayoutMode(focus ? 'chat-only' : 'split')}
          isFocusMode={layoutMode === 'chat-only'}
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
          {/* Breadcrumb & Navigation Switcher Bar */}
          <div className="flex items-center justify-between shrink-0 px-1 pt-1.5 pb-0.5 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-muted-text">
                  Class / {viewMode === 'class' ? 'Classes' : 'Templates'} /
                </span>
                <span className="text-xs font-bold text-primary-text font-display">
                  {adapterClassItem.name}
                </span>
              </div>

              {/* View Switcher Tabs (Classroom vs Gradebook) */}
              {viewMode === 'class' && (
                <div className="flex items-center bg-elevated/60 border border-border-color rounded-xl p-0.5 shadow-sm">
                  <button
                    onClick={() => setMainViewTab('classroom')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      mainViewTab === 'classroom'
                        ? 'bg-surface text-primary shadow-sm'
                        : 'text-secondary-text hover:text-primary-text'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Classroom & Roster
                  </button>

                  <button
                    onClick={() => setMainViewTab('gradebook')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      mainViewTab === 'gradebook'
                        ? 'bg-surface text-primary shadow-sm'
                        : 'text-secondary-text hover:text-primary-text'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    Gradebook Matrix
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'class' && (
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Generate Student Report Cards and Parent Briefings"
                >
                  <Award className="w-3.5 h-3.5" />
                  Report Cards
                </button>
              )}

              <span className="hidden md:inline-block text-[10px] font-mono text-muted-text bg-elevated border border-border-color px-2.5 py-1 rounded-lg">
                Ctrl + K to query
              </span>
            </div>
          </div>

          {/* Main Content Area: Gradebook Matrix or Split Classroom View */}
          {mainViewTab === 'gradebook' && viewMode === 'class' ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <GradebookMatrix
                classItem={adapterClassItem}
                onUpdateClass={handleAdapterUpdate}
                onTriggerToast={triggerToast}
              />
            </div>
          ) : (
            /* Core double split viewport */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 gap-4 md:gap-4 relative">
              {/* Combined Top Section Container */}
              <div
                className={`flex flex-col transition-all border border-border-color rounded-3xl p-3 bg-surface/30 ${
                  layoutMode === 'details-only'
                    ? 'flex-1 min-h-0'
                    : layoutMode === 'chat-only'
                      ? 'shrink-0'
                      : 'h-70 shrink-0'
                }`}
              >
                {/* Upper section layout controls */}
                <div
                  id="top-nav-controls"
                  className={`flex items-center justify-end gap-2 shrink-0 ${layoutMode !== 'chat-only' ? 'mb-2' : ''}`}
                >
                  {viewMode === 'template' && !isEditMode && activeTemplate && (
                    <button
                      id="top-nav-preset-template-button"
                      onClick={() => handleCreateClass(`${activeTemplate.name} Cohort`, activeTemplate.id)}
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
                        onClick={handleSaveEditChanges}
                        className="flex items-center justify-center w-7 h-7 bg-success text-white border border-success rounded-lg transition-colors cursor-pointer hover:bg-success/90"
                        title="Save Changes"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        id="top-nav-cancel-button"
                        onClick={handleCancelEdit}
                        className="flex items-center justify-center w-7 h-7 bg-elevated/50 hover:bg-elevated border border-border-color rounded-lg transition-colors cursor-pointer text-muted-text hover:text-primary-text"
                        title="Cancel Editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      id="top-nav-edit-button"
                      onClick={handleStartEdit}
                      className="flex items-center justify-center w-7 h-7 bg-elevated/50 hover:bg-elevated border border-border-color rounded-lg transition-colors cursor-pointer text-muted-text hover:text-primary-text"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {viewMode === 'class' && (
                    <div
                      id="top-nav-view-mode-group"
                      className={`flex items-center bg-elevated/40 border border-border-color rounded-lg p-0.5 ${isEditMode ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <button
                        id="view-mode-chat-only-button"
                        onClick={() => setLayoutMode('chat-only')}
                        className={`flex items-center justify-center w-8 h-7 rounded-md transition-colors cursor-pointer ${
                          layoutMode === 'chat-only'
                            ? 'bg-surface shadow-sm text-primary'
                            : 'text-muted-text hover:text-primary-text hover:bg-elevated/60'
                        }`}
                        title="Chat Only (Collapse Details)"
                      >
                        <PanelTop className="w-4 h-4" />
                      </button>
                      <button
                        id="view-mode-split-button"
                        onClick={() => setLayoutMode('split')}
                        className={`flex items-center justify-center w-8 h-7 rounded-md transition-colors cursor-pointer ${
                          layoutMode === 'split'
                            ? 'bg-surface shadow-sm text-primary'
                            : 'text-muted-text hover:text-primary-text hover:bg-elevated/60'
                        }`}
                        title="Split View"
                      >
                        <SquareSplitVertical className="w-4 h-4" />
                      </button>
                      <button
                        id="view-mode-details-only-button"
                        onClick={() => setLayoutMode('details-only')}
                        className={`flex items-center justify-center w-8 h-7 rounded-md transition-colors cursor-pointer ${
                          layoutMode === 'details-only'
                            ? 'bg-surface shadow-sm text-primary'
                            : 'text-muted-text hover:text-primary-text hover:bg-elevated/60'
                        }`}
                        title="Details Only (Expand)"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Top Row Content */}
                {layoutMode !== 'chat-only' && (
                  <div
                    className={`grid gap-4 flex-1 min-h-0 ${layoutMode === 'details-only' ? 'grid-cols-1 grid-rows-[auto_1fr]' : 'grid-cols-1 lg:grid-cols-12'}`}
                  >
                    {layoutMode === 'details-only' ? (
                      <>
                        {/* Roster students top row */}
                        {viewMode === 'class' && !isEditMode && (
                          <div className="w-full">
                            <StudentRegister
                              classItem={adapterClassItem}
                              onUpdateClass={handleAdapterUpdate}
                              onTriggerToast={triggerToast}
                            />
                          </div>
                        )}

                        {/* Details bottom row */}
                        <div className="w-full h-full min-h-0">
                          <ClassDetails
                            classItem={adapterClassItem}
                            isEditMode={isEditMode}
                            activeSubTab={activeDetailsTab}
                            onSubTabChange={setActiveDetailsTab}
                            onUpdateClass={handleAdapterUpdate}
                            onAddMaterial={handleAdapterAddMaterial}
                            onDeleteMaterial={handleAdapterDeleteMaterial}
                            onAddInstruction={handleAdapterAddInstruction}
                            onDeleteInstruction={handleAdapterDeleteInstruction}
                            onTriggerToast={triggerToast}
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
                            activeSubTab={activeDetailsTab}
                            onSubTabChange={setActiveDetailsTab}
                            onUpdateClass={handleAdapterUpdate}
                            onAddMaterial={handleAdapterAddMaterial}
                            onDeleteMaterial={handleAdapterDeleteMaterial}
                            onAddInstruction={handleAdapterAddInstruction}
                            onDeleteInstruction={handleAdapterDeleteInstruction}
                            onTriggerToast={triggerToast}
                          />
                        </div>

                        {/* Roster students top right section */}
                        <div className="lg:col-span-7 h-full min-h-0">
                          {viewMode === 'class' && !isEditMode && (
                            <StudentRegister
                              classItem={adapterClassItem}
                              onUpdateClass={handleAdapterUpdate}
                              onTriggerToast={triggerToast}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Row / Chat classItem */}
              {layoutMode !== 'details-only' && viewMode === 'class' && (
                <div className="flex-1 min-h-0 relative">
                  <RAGClass
                    classItem={adapterClassItem}
                    onUpdateClass={handleAdapterUpdate}
                    layoutMode={layoutMode}
                    onToggleLayoutMode={setLayoutMode}
                    onSendChatMessage={(sessionId, text) => sendChatMessage(activeClass, sessionId, text)}
                    isGeneratingAI={isGeneratingAI}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <span className="text-sm font-mono text-muted-text">
            Register or select a Class to initialize system dashboards
          </span>
          <button
            onClick={() => handleCreateClass('Grade 10 Mathematics Standard')}
            className="px-4 py-2 bg-primary rounded-xl text-white font-semibold text-xs cursor-pointer"
          >
            Create First Class
          </button>
        </div>
      )}

      {/* Account settings and utility modals */}
      <AccountModals
        activeModal={activeAccountModal}
        onClose={() => setActiveAccountModal(null)}
        onTriggerToast={triggerToast}
      />

      {/* Top Level Student Report Cards Modal */}
      {isReportModalOpen && activeClass && activeClass.students.length > 0 && (
        <ReportCardModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          classItem={activeClass}
          initialStudentId={activeClass.students[0].id}
          onTriggerToast={triggerToast}
        />
      )}

      <LoadingOverlay isOpen={!!processingMsg} message={processingMsg || undefined} />
    </div>
  );
}
