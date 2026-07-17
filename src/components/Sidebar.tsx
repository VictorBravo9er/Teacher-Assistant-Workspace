import React, { useState } from 'react';
import { Workspace, Template } from '../types';
import { 
  Sparkles, 
  FolderLock, 
  BookOpen, 
  FileCheck2, 
  Settings2, 
  UserCircle2, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Copy, 
  Edit3, 
  FolderArchive, 
  Check, 
  LogOut, 
  HelpCircle,
  FolderSync,
  Layers,
  Search,
  Settings,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  templates: Template[];
  theme: 'system' | 'light' | 'dark';
  onChangeTheme: (mode: 'system' | 'light' | 'dark') => void;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, templateId?: string) => void;
  onRenameWorkspace: (id: string, newName: string) => void;
  onDuplicateWorkspace: (id: string) => void;
  onArchiveWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  
  onCreateTemplate: (template: Omit<Template, 'id'>) => void;
  onSaveCurrentAsTemplate: () => void;
  onDeleteTemplate: (id: string) => void;
  onSelectTemplateAsPreset: (tpl: Template) => void;

  onOpenAccountModal: (type: 'profile' | 'preferences' | 'settings' | 'subscription') => void;
}

export default function Sidebar({
  workspaces,
  activeWorkspaceId,
  templates,
  theme,
  onChangeTheme,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onArchiveWorkspace,
  onDeleteWorkspace,
  onCreateTemplate,
  onSaveCurrentAsTemplate,
  onDeleteTemplate,
  onSelectTemplateAsPreset,
  onOpenAccountModal
}: SidebarProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const filteredWorkspaces = workspaces.filter(ws => {
    // Check archive state
    const matchesArchive = showArchived ? !!ws.archived : !ws.archived;
    // Check search term
    if (!sidebarSearch) return matchesArchive;
    return matchesArchive && (
      ws.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      ws.subject.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  });

  const handleStartRename = (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkspaceId(ws.id);
    setRenameValue(ws.name);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameWorkspace(id, renameValue.trim());
    }
    setEditingWorkspaceId(null);
  };

  return (
    <aside 
      id="main-sidebar" 
      className="w-72 bg-surface border-r border-border-color flex flex-col h-screen select-none shrink-0 transition-colors duration-200"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-border-color flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-secondary/10 border border-secondary/20 rounded-xl flex items-center justify-center text-secondary">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-sm text-primary-text uppercase tracking-wider">
              EduCopilot RAG
            </h1>
            <p className="text-[10px] text-primary/80 font-mono font-bold">Academic Assistant</p>
          </div>
        </div>
      </div>

      {/* Sidebar Search */}
      <div className="px-3.5 pt-3.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-text absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Search classes..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="w-full bg-elevated/50 border border-border-color/60 rounded-lg py-1.5 pl-8 pr-3 text-xs text-secondary-text placeholder-muted-text focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Scrollable List Sections */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-6">
        
        {/* Reusable Templates section */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-text uppercase tracking-wider mb-2.5 px-1">
            <span className="flex items-center gap-1.5 font-display">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Teacher Templates
            </span>
            <button 
              onClick={() => {
                const name = prompt("Enter Template Name:");
                if (name) {
                  onCreateTemplate({
                    name,
                    description: "Custom template created from sidebar.",
                    subject: "General",
                    teachingStyle: "Structured",
                    instructions: [],
                    materialsPreset: []
                  });
                }
              }}
              title="Create Base Template" 
              className="p-1 hover:bg-elevated rounded text-muted-text hover:text-primary-text transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="space-y-1">
            {templates.map(tpl => (
              <div 
                key={tpl.id}
                onClick={() => onSelectTemplateAsPreset(tpl)}
                className="group flex items-center justify-between text-xs px-2.5 py-2 rounded-lg bg-elevated/30 border border-transparent hover:border-border-color/30 hover:bg-elevated/60 text-secondary-text hover:text-primary-text transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/85 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                  <span className="truncate py-0.5">{tpl.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteTemplate(tpl.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/10 text-muted-text hover:text-error rounded transition-all cursor-pointer"
                  title="Delete Template"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            <button 
              onClick={onSaveCurrentAsTemplate}
              className="w-full text-left text-[11px] font-mono text-primary bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/25 rounded-lg py-2 px-3 mt-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-semibold"
            >
              <FolderSync className="w-3.5 h-3.5" />
              Save Active Class as Template
            </button>
          </div>
        </div>

        {/* Workspace Projects section */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-text uppercase tracking-wider mb-2.5 px-1">
            <span className="flex items-center gap-1.5 font-display">
              <BookOpen className="w-3.5 h-3.5 text-secondary" />
              Active Classes {showArchived ? '(Archived)' : ''}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowArchived(!showArchived)}
                title={showArchived ? "Show Active Workspaces" : "Show Archived Workspaces"}
                className={`p-1 rounded transition-colors cursor-pointer ${showArchived ? 'bg-primary/15 text-primary' : 'text-muted-text hover:bg-elevated hover:text-primary-text'}`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => {
                  const name = prompt("Enter Class Name (e.g., Grade 10 Mathematics):");
                  if (name) onCreateWorkspace(name);
                }}
                title="Create Workspace Project" 
                className="p-1 hover:bg-elevated rounded text-muted-text hover:text-primary-text transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {filteredWorkspaces.length === 0 ? (
              <div className="text-[11px] font-mono p-3 text-muted-text text-center bg-elevated/25 rounded-lg border border-dashed border-border-color/60">
                No classes found
              </div>
            ) : (
              filteredWorkspaces.map(ws => {
                const isActive = ws.id === activeWorkspaceId;
                const isEditing = editingWorkspaceId === ws.id;

                return (
                  <div 
                    key={ws.id}
                    onClick={() => !isEditing && onSelectWorkspace(ws.id)}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-primary/10 border-primary/30 text-primary font-semibold shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-elevated/60 text-secondary-text hover:text-primary-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate w-full">
                      <FileCheck2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-text'}`} />
                      
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(ws.id);
                            if (e.key === 'Escape') setEditingWorkspaceId(null);
                          }}
                          onBlur={() => handleSaveRename(ws.id)}
                          autoFocus
                          className="w-full bg-surface border border-primary rounded py-0.5 px-1.5 text-xs text-primary-text focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="truncate flex flex-col">
                          <span className="truncate font-medium text-xs tracking-tight">{ws.name}</span>
                          <span className="truncate text-[10px] text-muted-text font-mono mt-0.5">{ws.subject || 'Not specified'}</span>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="relative shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === ws.id ? null : ws.id)}
                          className="opacity-0 group-hover:opacity-100 hover:bg-elevated p-1 rounded text-muted-text hover:text-primary-text transition-all cursor-pointer"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* Relative Dropdown Context Menu */}
                        {activeMenuId === ws.id && (
                          <div className="absolute right-0 top-6 w-44 bg-surface border border-border-color shadow-2xl rounded-xl p-1 z-40 text-xs text-secondary-text font-medium">
                            <button 
                              onClick={(e) => handleStartRename(ws, e)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-elevated rounded-lg flex items-center gap-2 hover:text-primary-text cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary" />
                              Rename Class
                            </button>
                            <button 
                              onClick={() => { onDuplicateWorkspace(ws.id); setActiveMenuId(null); }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-elevated rounded-lg flex items-center gap-2 hover:text-primary-text cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-secondary" />
                              Duplicate Class
                            </button>
                            <button 
                              onClick={() => { onArchiveWorkspace(ws.id); setActiveMenuId(null); }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-elevated rounded-lg flex items-center gap-2 hover:text-primary-text cursor-pointer"
                            >
                              <FolderArchive className="w-3.5 h-3.5 text-warning" />
                              {ws.archived ? 'Activate Class' : 'Archive Class'}
                            </button>
                            <div className="h-[1px] bg-border-color/40 my-1"></div>
                            <button 
                              onClick={() => { if (confirm("Delete this workspace entirely?")) onDeleteWorkspace(ws.id); setActiveMenuId(null); }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-error/10 text-error hover:text-error rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete Class
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Account Settings bottom panel */}
      <div className="p-3 border-t border-border-color bg-elevated/40">
        
        {/* Dynamic Theme Option Picker */}
        <div className="mb-3 px-1">
          <div className="flex bg-elevated rounded-lg p-0.5 border border-border-color/45">
            <button 
              onClick={() => onChangeTheme('light')}
              className={`flex-1 py-1 px-1.5 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                theme === 'light' 
                  ? 'bg-surface text-primary shadow-sm font-bold' 
                  : 'text-muted-text hover:text-primary'
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button 
              onClick={() => onChangeTheme('dark')}
              className={`flex-1 py-1 px-1.5 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-surface text-primary shadow-sm font-bold' 
                  : 'text-muted-text hover:text-primary'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button 
              onClick={() => onChangeTheme('system')}
              className={`flex-1 py-1 px-1.5 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                theme === 'system' 
                  ? 'bg-surface text-primary shadow-sm font-bold' 
                  : 'text-muted-text hover:text-primary'
              }`}
              title="System Default"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>System</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 mb-2.5">
          <button 
            onClick={() => onOpenAccountModal('settings')}
            className="flex items-center justify-center gap-1.5 py-1.5 hover:bg-elevated rounded-lg text-secondary-text hover:text-primary-text text-xs transition-colors font-mono cursor-pointer"
            title="General System Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <button 
            onClick={() => onOpenAccountModal('preferences')}
            className="flex items-center justify-center gap-1.5 py-1.5 hover:bg-elevated rounded-lg text-secondary-text hover:text-primary-text text-xs transition-colors font-mono cursor-pointer"
            title="Teaching Preferences"
          >
            <Settings2 className="w-3.5 h-3.5 text-secondary" />
            Preferences
          </button>
        </div>

        <div 
          onClick={() => onOpenAccountModal('profile')}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-elevated/60 transition-all cursor-pointer group"
        >
          <div className="p-0.5 bg-primary/10 border border-primary/20 rounded-full">
            <UserCircle2 className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
          </div>
          <div className="truncate flex-1">
            <h4 className="text-xs font-semibold text-primary-text truncate leading-none">Elena Rostova</h4>
            <span className="text-[10px] text-muted-text font-mono truncate block mt-1">District Senior Educator</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenAccountModal('subscription'); }}
            className="px-1.5 py-0.5 text-[9px] bg-secondary/10 hover:bg-secondary/20 border border-secondary/35 text-secondary hover:text-secondary font-mono rounded transition-colors font-bold"
          >
            PRO
          </button>
        </div>
      </div>
    </aside>
  );
}
