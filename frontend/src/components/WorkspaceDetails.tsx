import React, { useState } from 'react';
import { Workspace, Material, Instruction } from '../types';
import { 
  Building2, 
  BookMarked, 
  History, 
  Trash2, 
  Plus, 
  Tag, 
  Paperclip, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  FileText, 
  Award,
  Globe,
  Settings,
  X,
  PlusCircle,
  FileCheck2,
  Info
} from 'lucide-react';

interface WorkspaceDetailsProps {
  workspace: Workspace;
  onUpdateWorkspace: (id: string, updatedFields: Partial<Workspace>) => void;
  onAddMaterial: (workspaceId: string, material: Omit<Material, 'id' | 'uploadDate'>) => void;
  onDeleteMaterial: (workspaceId: string, materialId: string) => void;
  onAddInstruction: (workspaceId: string, instruction: Omit<Instruction, 'id'>) => void;
  onDeleteInstruction: (workspaceId: string, instructionId: string) => void;
}

export default function WorkspaceDetails({
  workspace,
  onUpdateWorkspace,
  onAddMaterial,
  onDeleteMaterial,
  onAddInstruction,
  onDeleteInstruction
}: WorkspaceDetailsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'materials' | 'prompts'>('profile');
  
  // Local form states for files/materials
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<Material['type']>('pdf');
  const [newFileTags, setNewFileTags] = useState('');
  const [showFileForm, setShowFileForm] = useState(false);

  // Local form states for reusable instructions
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptType, setNewPromptType] = useState<Instruction['type']>('criteria');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [showPromptForm, setShowPromptForm] = useState(false);

  // Selected material for Version Log Modal
  const [selectedMaterialHistory, setSelectedMaterialHistory] = useState<Material | null>(null);

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    const tagsArr = newFileTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    onAddMaterial(workspace.id, {
      name: newFileName.trim(),
      type: newFileType,
      size: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
      tags: tagsArr.length > 0 ? tagsArr : ['General'],
      versionHistory: [
        { version: 'v1.0', date: new Date().toISOString().split('T')[0], note: 'Uploaded initial document' }
      ]
    });

    setNewFileName('');
    setNewFileTags('');
    setShowFileForm(false);
  };

  const handleCreateInstruction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;

    onAddInstruction(workspace.id, {
      title: newPromptTitle.trim(),
      type: newPromptType,
      content: newPromptContent.trim()
    });

    setNewPromptTitle('');
    setNewPromptContent('');
    setShowPromptForm(false);
  };

  return (
    <div className="rounded-2xl border border-border-color bg-surface flex flex-col h-full hover:border-muted-text/30 transition-colors overflow-hidden shadow-sm">
      
      {/* Mini Tabs Header */}
      <div className="flex border-b border-border-color/80 p-1 bg-elevated/50 shrink-0">
        <button 
          onClick={() => setActiveSubTab('profile')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'profile' 
              ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
              : 'text-muted-text hover:text-secondary-text'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Class Profile
        </button>
        <button 
          onClick={() => setActiveSubTab('materials')}
          className={`relative flex-1 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'materials' 
              ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
              : 'text-muted-text hover:text-secondary-text'
          }`}
          style={{ padding: "0.5rem 0.25rem" }}
        >
          <BookMarked className="w-3.5 h-3.5" />
          Materials
          {workspace.materials.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] rounded-full font-mono border border-primary/20 font-bold">
              {workspace.materials.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveSubTab('prompts')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'prompts' 
              ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
              : 'text-muted-text hover:text-secondary-text'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          AI Instructions
          {workspace.instructions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-secondary/15 text-secondary text-[10px] rounded-full font-mono border border-secondary/25 font-bold">
              {workspace.instructions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents Area */}
      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Profile Tab */}
        {activeSubTab === 'profile' && (
          <div className="space-y-4">
            
            {/* Lead Class Metrics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface border border-border-color rounded-xl p-3 shadow-sm">
                <span className="text-[10px] font-mono text-muted-text block uppercase">Curriculum Course</span>
                <span className="text-xs font-semibold text-primary-text block mt-1 truncate">{workspace.subject}</span>
              </div>
              <div className="bg-surface border border-border-color rounded-xl p-3 shadow-sm">
                <span className="text-[10px] font-mono text-muted-text block uppercase">Academic Period</span>
                <span className="text-xs font-semibold text-primary-text block mt-1 truncate">{workspace.semester}, {workspace.academicYear}</span>
              </div>
            </div>

            {/* Teaching style details */}
            <div className="bg-surface border border-border-color rounded-xl p-3.5 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2 pb-2.5 border-b border-border-color">
                <Globe className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-primary-text">Teaching Methodology & Philosophy</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-mono text-muted-text">Instructor style</label>
                  <input 
                    type="text"
                    value={workspace.teachingStyle}
                    onChange={(e) => onUpdateWorkspace(workspace.id, { teachingStyle: e.target.value })}
                    className="w-full bg-transparent text-xs text-primary-text font-semibold focus:outline-none focus:border-b focus:border-primary/50 pt-0.5"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] uppercase font-mono text-muted-text">Experience scale</label>
                  <p className="text-xs font-medium text-secondary-text pt-0.5">{workspace.experienceLevel}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-muted-text">Assessment Preferences</label>
                  <textarea 
                    value={workspace.assessmentPreferences || 'No specific preferences.'}
                    onChange={(e) => onUpdateWorkspace(workspace.id, { assessmentPreferences: e.target.value })}
                    className="w-full bg-transparent text-xs text-secondary-text h-10 resize-none focus:outline-none focus:border-b focus:border-primary/50 pt-0.5"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-muted-text">Workspace Reminders / Notes</label>
                  <textarea 
                    value={workspace.specialNotes || ''}
                    onChange={(e) => onUpdateWorkspace(workspace.id, { specialNotes: e.target.value })}
                    placeholder="E.g. Focus on bridging Algebra basics before Geometry exams..."
                    className="w-full bg-surface border border-border-color rounded-lg p-2 text-xs text-secondary-text h-14 resize-none focus:outline-none focus:border-primary/50 shadow-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Instructional helper warning */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-2.5">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary/80 leading-normal">
                Changes in this dossier automatically sync into the RAG Assistant scope. Chat searches will retrieve this context automatically.
              </p>
            </div>

          </div>
        )}

        {/* Materials Repository Tab */}
        {activeSubTab === 'materials' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary-text font-display">Classroom Document Repo</h4>
              <button 
                onClick={() => setShowFileForm(!showFileForm)}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
              >
                {showFileForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showFileForm ? 'Cancel' : 'Upload File'}
              </button>
            </div>

            {/* Simulated file upload form */}
            {showFileForm && (
              <form onSubmit={handleCreateMaterial} className="bg-surface border border-border-color rounded-xl p-3.5 space-y-3 shadow-sm">
                <div>
                  <label className="text-[10px] font-mono text-muted-text block">FILE DISPLAY TITLE</label>
                  <input 
                    type="text" 
                    placeholder="Geometry_Formulas_Apx.pdf"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-muted-text block">DOCUMENT TYPE</label>
                    <select 
                      value={newFileType} 
                      onChange={(e) => setNewFileType(e.target.value as Material['type'])}
                      className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="pdf">PDF Document</option>
                      <option value="doc">Word Doc</option>
                      <option value="book">Reference Book</option>
                      <option value="syllabus">Syllabus Standard</option>
                      <option value="custom">General Form</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-text block">COMMA TAGS</label>
                    <input 
                      type="text" 
                      placeholder="Geometry, Exam"
                      value={newFileTags}
                      onChange={(e) => setNewFileTags(e.target.value)}
                      className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Upload Simulation
                </button>
              </form>
            )}

            {/* Files Grid list */}
            <div className="space-y-2.5">
              {workspace.materials.length === 0 ? (
                <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                  No reference files. Let's upload a textbook.
                </div>
              ) : (
                workspace.materials.map(mat => (
                  <div 
                    key={mat.id}
                    className="group bg-surface border border-border-color hover:bg-elevated rounded-xl p-3 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 truncate" onClick={() => setSelectedMaterialHistory(mat)}>
                      <div className="p-2.5 bg-background rounded-lg text-muted-text group-hover:text-primary group-hover:bg-primary/10 transition-all border border-border-color">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate flex flex-col">
                        <span className="text-xs font-medium text-primary-text truncate group-hover:text-primary-text">{mat.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono text-muted-text uppercase">{mat.type}</span>
                          <span className="w-1 h-1 bg-border-color rounded-full"></span>
                          <span className="text-[9px] font-mono text-primary/80">{mat.size}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedMaterialHistory(mat)}
                        title="View File Version History"
                        className="p-1 hover:bg-background border border-transparent hover:border-border-color text-muted-text hover:text-primary rounded cursor-pointer transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteMaterial(workspace.id, mat.id)}
                        title="Delete Document"
                        className="p-1 hover:bg-red-500/10 text-muted-text hover:text-red-500 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* AI Custom Instructions Tab */}
        {activeSubTab === 'prompts' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary-text font-display">Rule Prompt Templates</h4>
              <button 
                onClick={() => setShowPromptForm(!showPromptForm)}
                className="text-xs font-semibold text-secondary hover:text-secondary/80 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showPromptForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showPromptForm ? 'Cancel' : 'New Guideline'}
              </button>
            </div>

            {/* Prompt design form */}
            {showPromptForm && (
              <form onSubmit={handleCreateInstruction} className="bg-surface border border-border-color rounded-xl p-3.5 space-y-3 shadow-sm">
                <div>
                  <label className="text-[10px] font-mono text-muted-text block">INSTRUCTION TITLE</label>
                  <input 
                    type="text" 
                    placeholder="Socratic Equation Prompts"
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                    className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-secondary"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-muted-text block">GUIDELINE TYPE</label>
                  <select 
                    value={newPromptType}
                    onChange={(e) => setNewPromptType(e.target.value as Instruction['type'])}
                    className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    <option value="criteria">Evaluation Criteria</option>
                    <option value="marking">Marking Instructions</option>
                    <option value="preference">Classroom Preferences</option>
                    <option value="global">Global Assistant system prompt</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-muted-text block">AI INSTRUCTIONS CONTENT</label>
                  <textarea 
                    placeholder="Direct the AI assistant to search for structural gaps rather than mathematical arithmetic omissions..."
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text h-20 resize-none focus:outline-none focus:border-secondary"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Save Guideline Rule
                </button>
              </form>
            )}

            {/* Prompts list */}
            <div className="space-y-3">
              {workspace.instructions.length === 0 ? (
                <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                  No criteria instructions flagged. Assistant is using default grading rules.
                </div>
              ) : (
                workspace.instructions.map(inst => (
                  <div 
                    key={inst.id}
                    className="bg-surface border border-border-color rounded-xl p-3.5 space-y-2 shadow-sm transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-background text-secondary border border-secondary/30 rounded-full font-semibold">
                        {inst.type}
                      </span>
                      <button 
                        onClick={() => onDeleteInstruction(workspace.id, inst.id)}
                        className="text-muted-text hover:text-red-500 p-1 rounded hover:bg-background transition-colors cursor-pointer"
                        title="Delete Guideline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h5 className="text-xs font-bold text-primary-text">{inst.title}</h5>
                    <p className="text-[11px] text-secondary-text leading-relaxed font-mono whitespace-pre-line bg-elevated rounded-lg p-2 border border-border-color">
                      {inst.content}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

      {/* Version History Modal Overlay (simulated overlay) */}
      {selectedMaterialHistory && (
        <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border-color rounded-2xl max-w-md w-full p-6 space-y-4 shadow-sm relative">
            <button 
              onClick={() => setSelectedMaterialHistory(null)}
              className="absolute right-4 top-4 hover:bg-elevated p-1.5 rounded-lg text-muted-text hover:text-primary-text transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b border-border-color">
              <History className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-primary-text truncate max-w-xs">{selectedMaterialHistory.name}</h3>
                <span className="text-[10px] font-mono text-muted-text">Document Upload Lifecycle</span>
              </div>
            </div>

            <div className="space-y-3">
              {selectedMaterialHistory.versionHistory?.length > 0 ? (
                selectedMaterialHistory.versionHistory.map((ver, idx) => (
                  <div key={idx} className="flex gap-3 text-xs bg-elevated rounded-xl p-3 border border-border-color">
                    <span className="font-mono text-primary font-bold shrink-0">{ver.version}</span>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-text font-mono block">{ver.date}</span>
                      <p className="text-secondary-text font-medium">{ver.note}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex gap-3 text-xs bg-elevated rounded-xl p-3 border border-border-color">
                  <span className="font-mono text-primary font-bold shrink-0">v1.0</span>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-text font-mono block">{workspace.academicYear} semester release</span>
                    <p className="text-secondary-text">Initial repository indexing completed.</p>
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  const note = prompt("Enter version update note:");
                  if (note) {
                    const updatedVer = [...(selectedMaterialHistory.versionHistory || []), {
                      version: `v1.${(selectedMaterialHistory.versionHistory?.length || 1)}`,
                      date: new Date().toISOString().split('T')[0],
                      note
                    }];
                    const updatedMats = workspace.materials.map(m => 
                      m.id === selectedMaterialHistory.id ? { ...m, versionHistory: updatedVer } : m
                    );
                    onUpdateWorkspace(workspace.id, { materials: updatedMats });
                    setSelectedMaterialHistory({ ...selectedMaterialHistory, versionHistory: updatedVer });
                  }
                }}
                className="w-full bg-background hover:bg-elevated text-secondary-text hover:text-primary-text font-mono text-[11px] py-1.5 border border-border-color rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Commit Version Update Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
