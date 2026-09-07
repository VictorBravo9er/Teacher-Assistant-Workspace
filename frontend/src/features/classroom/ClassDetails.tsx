import React, { useState } from 'react';
import { ClassModel, Material, Instruction, ContentCategory, RubricCriterion } from "@/types/main";
import { materialService } from "@/services/materialService";
import { ConfirmModal, PromptModal, LoadingOverlay } from "@/components/shared/CustomDialogs";
import { MultiSelect } from '@/components/shared/MultiSelect';
import MaterialPreviewModal from '@/features/classroom/MaterialPreviewModal';
import RubricBuilderModal from '@/features/classroom/RubricBuilderModal';
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
  Info,
  ExternalLink,
  Download,
  Eye,
  Sliders,
  Lock,
} from "lucide-react";
import { Button, Badge, Modal, FormField, Input, Textarea } from '@/components/ui';

interface ClassDetailsProps {
  classItem: ClassModel;
  isEditMode: boolean;
  onUpdateClass: (id: string, updates: Partial<ClassModel>) => void;
  onAddMaterial: (
    wsId: string,
    mat: Omit<Material, "id" | "uploadDate">,
    file?: File,
  ) => void;
  onDeleteMaterial: (wsId: string, matId: string) => void;
  onAddInstruction: (
    wsId: string,
    prompt: Omit<Instruction, "id">,
  ) => void;
  onDeleteInstruction: (wsId: string, promptId: string) => void;
  onTriggerToast: (text: string) => void;
  activeSubTab?: "profile" | "materials" | "prompts";
  onSubTabChange?: (tab: "profile" | "materials" | "prompts") => void;
}

export default function ClassDetails({
  classItem,
  isEditMode,
  onUpdateClass,
  onAddMaterial,
  onDeleteMaterial,
  onAddInstruction,
  onDeleteInstruction,
  onTriggerToast,
  activeSubTab: externalSubTab,
  onSubTabChange,
}: ClassDetailsProps) {
  const [internalSubTab, setInternalSubTab] = useState<
    "profile" | "materials" | "prompts"
  >("profile");

  const activeSubTab = externalSubTab !== undefined ? externalSubTab : internalSubTab;
  const setActiveSubTab = (tab: "profile" | "materials" | "prompts") => {
    if (onSubTabChange) onSubTabChange(tab);
    setInternalSubTab(tab);
  };

  // Local form states for files/materials
  const [newFileName, setNewFileName] = useState("");
  const [newCategory, setNewCategory] = useState<ContentCategory>("Study Material");
  const [newFileTags, setNewFileTags] = useState("");
  const [newFileObj, setNewFileObj] = useState<File | null>(null);
  const [newUrlString, setNewUrlString] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newMaxScore, setNewMaxScore] = useState<number>(100);
  const [showFileForm, setShowFileForm] = useState(false);

  // Local form states for reusable instructions
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptType, setNewPromptType] =
    useState<Instruction["type"]>("criteria");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [showPromptForm, setShowPromptForm] = useState(false);

  // Selected material for Version Log Modal
  const [selectedMaterialHistory, setSelectedMaterialHistory] =
    useState<Material | null>(null);
  const [isVersionPromptOpen, setIsVersionPromptOpen] = useState(false);

  // Material Preview & Rubric Builder states
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [rubricModalMaterial, setRubricModalMaterial] = useState<Material | null>(null);

  const handleSaveRubric = (materialId: string, criteria: RubricCriterion[], maxScore: number) => {
    const updated = classItem.materials.map((m) =>
      m.id === materialId
        ? { ...m, rubricCriteria: criteria, maxScore, toBeScored: true }
        : m
    );
    onUpdateClass(classItem.id, { materials: updated });
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const tagsArr = newFileTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const isScored = ['Assignment', 'Test', 'Exam', 'Practical'].includes(newCategory);

    onAddMaterial(
      classItem.id,
      {
        name: newFileName.trim(),
        category: newCategory,
        content: newFileObj
          ? [{ id: crypto.randomUUID(), name: newFileName.trim(), type: 'File', path: '' }]
          : [{ id: crypto.randomUUID(), name: newFileName.trim(), type: 'URL', path: newUrlString || 'https://example.com' }],
        size: newFileObj ? `${(newFileObj.size / (1024 * 1024)).toFixed(1)} MB` : '0 MB',
        tags: tagsArr.length > 0 ? tagsArr : ["General"],
        dueAt: isScored || newDueDate ? (newDueDate || new Date(Date.now() + 7 * 86400000).toISOString()) : undefined,
        maxScore: isScored ? newMaxScore : undefined,
        toBeScored: isScored,
      },
      newFileObj || undefined,
    );

    setNewFileName("");
    setNewFileTags("");
    setNewFileObj(null);
    setNewUrlString("");
    setNewDueDate("");
    setShowFileForm(false);
  };

  const [isDownloadingMsg, setIsDownloadingMsg] = useState<string | null>(null);

  const handleDownloadFile = async (mat: Material) => {
    try {
      setIsDownloadingMsg(`Generating secure link for ${mat.name}...`);
      const firstItem = mat.content && mat.content[0];
      const url = await materialService.getMaterialDownloadUrl(
        mat.id,
        classItem.id,
        firstItem?.path,
        firstItem?.id
      );
      window.open(url, '_blank');
    } catch (err: any) {
      onTriggerToast(`Could not open file: ${err.message}`);
    } finally {
      setIsDownloadingMsg(null);
    }
  };

  const handleCreateInstruction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;

    onAddInstruction(classItem.id, {
      title: newPromptTitle.trim(),
      type: newPromptType,
      content: newPromptContent.trim(),
    });

    setNewPromptTitle("");
    setNewPromptContent("");
    setShowPromptForm(false);
  };

  return (
    <div
      id="class-details-container"
      className="rounded-2xl border border-border-color bg-surface flex flex-col h-full hover:border-muted-text/30 transition-colors overflow-hidden shadow-sm"
    >
      {/* Mini Tabs Header */}
      <div
        id="class-details-tabs"
        className="flex border-b border-border-color/80 p-1 bg-elevated/50 shrink-0"
      >
        <button
          id="class-details-tab-profile"
          onClick={() => setActiveSubTab("profile")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "profile"
              ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
              : "text-muted-text hover:text-secondary-text"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Class Profile
        </button>
        <button
          id="class-details-tab-materials"
          onClick={() => setActiveSubTab("materials")}
          className={`relative flex-1 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "materials"
              ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
              : "text-muted-text hover:text-secondary-text"
          }`}
          style={{ padding: "0.5rem 0.25rem" }}
        >
          <BookMarked className="w-3.5 h-3.5" />
          Materials
          {classItem.materials.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] rounded-full font-mono border border-primary/20 font-bold">
              {classItem.materials.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("prompts")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "prompts"
              ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
              : "text-muted-text hover:text-secondary-text"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          AI Instructions
          {classItem.instructions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-secondary/15 text-secondary text-[10px] rounded-full font-mono border border-secondary/25 font-bold">
              {classItem.instructions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Profile Tab */}
        <div className={activeSubTab === "profile" ? "space-y-4" : "hidden"}>
          {/* Lead Class Metrics Cards */}
          <div className={`grid ${isEditMode ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            {!isEditMode && (
              <div className="bg-surface border border-border-color rounded-xl p-3 shadow-sm">
                <span className="text-[10px] font-mono text-muted-text block uppercase">
                  Institution / School
                </span>
                <span
                  className="text-xs font-semibold text-primary-text block mt-1 truncate"
                  title={classItem.instituteName || "Independent"}
                >
                  {classItem.instituteName || "Independent"}
                </span>
                {classItem.instituteAddress && (
                  <span className="text-[10px] text-secondary-text block mt-0.5 truncate" title={classItem.instituteAddress}>
                    {classItem.instituteAddress}
                  </span>
                )}
              </div>
            )}
            <div className="bg-surface border border-border-color rounded-xl p-3 shadow-sm">
              <span className="text-[10px] font-mono text-muted-text block uppercase">
                Curriculum Course
              </span>
              {isEditMode ? (
                <input
                  type="text"
                  value={classItem.subject}
                  onChange={(e) => onUpdateClass(classItem.id, { subject: e.target.value })}
                  className="w-full bg-primary/5 border border-primary/30 rounded-md p-1.5 text-xs text-primary-text font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all mt-1"
                />
              ) : (
                <span className="text-xs font-semibold text-primary-text block mt-1 truncate">
                  {classItem.subject}
                </span>
              )}
            </div>
            <div className="bg-surface border border-border-color rounded-xl p-3 shadow-sm">
              <span className="text-[10px] font-mono text-muted-text block uppercase">
                Academic Period
              </span>
              {isEditMode ? (
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Semester"
                    value={classItem.semester}
                    onChange={(e) => onUpdateClass(classItem.id, { semester: e.target.value })}
                    className="w-full bg-primary/5 border border-primary/30 rounded-md p-1.5 text-xs text-primary-text font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Year"
                    value={classItem.academicYear}
                    onChange={(e) => onUpdateClass(classItem.id, { academicYear: e.target.value })}
                    className="w-full bg-primary/5 border border-primary/30 rounded-md p-1.5 text-xs text-primary-text font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              ) : (
                <span className="text-xs font-semibold text-primary-text block mt-1 truncate">
                    {classItem.semester}, {classItem.academicYear}
                </span>
              )}
              </div>
            </div>

            {/* Teaching style details */}
            <div className="bg-surface border border-border-color rounded-xl p-3.5 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2 pb-2.5 border-b border-border-color">
                <Globe className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-primary-text">
                  Teaching Methodology & Philosophy
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-mono text-muted-text mb-1 block">
                    Instructor style
                  </label>
                  {isEditMode ? (
                    <MultiSelect
                      options={['Socratic', 'Lecture', 'Project-Based', 'Flipped Classroom', 'Discussion', 'Montessori', 'Direct Instruction']}
                      selectedValues={classItem.teachingStyle}
                      onChange={(values) => onUpdateClass(classItem.id, { teachingStyle: values })}
                      placeholder="Select teaching styles"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {classItem.teachingStyle.length > 0 ? (
                        classItem.teachingStyle.map(ts => (
                          <span key={ts} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full border border-primary/20">
                            {ts}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-secondary-text">Not specified</span>
                      )}
                    </div>
                  )}
                </div>

                <div className={isEditMode ? "opacity-75 cursor-not-allowed bg-surface/50 border border-border-color rounded-md p-1.5 mt-0.5" : ""}>
                  <label className={`text-[10px] uppercase font-mono text-muted-text ${isEditMode ? "pointer-events-none" : ""}`}>
                    Experience scale
                  </label>
                  <p className={`text-xs font-medium text-secondary-text pt-0.5 ${isEditMode ? "pointer-events-none" : ""}`}>
                    {classItem.experienceLevel}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-muted-text mb-1 block">
                    Assessment Preferences
                  </label>
                  {isEditMode ? (
                    <MultiSelect
                      options={['Formative', 'Summative', 'Peer Review', 'Self Assessment', 'Portfolio', 'Criteria-based', 'Multiple Choice']}
                      selectedValues={classItem.assessmentPreferences}
                      onChange={(values) => onUpdateClass(classItem.id, { assessmentPreferences: values })}
                      placeholder="Select assessment preferences"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {classItem.assessmentPreferences.length > 0 ? (
                        classItem.assessmentPreferences.map(ap => (
                          <span key={ap} className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-semibold rounded-full border border-secondary/20">
                            {ap}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-secondary-text">No specific preferences.</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-muted-text">
                    ClassModel Reminders / Notes
                  </label>
                  <textarea
                    id="class-profile-special-notes-input"
                    value={classItem.specialNotes || ""}
                    disabled={!isEditMode}
                    onChange={(e) =>
                      onUpdateClass(classItem.id, {
                        specialNotes: e.target.value,
                      })
                    }
                    placeholder="E.g. Focus on bridging Algebra basics before Geometry exams..."
                    className={`w-full rounded-lg p-2 text-xs text-secondary-text h-14 resize-none focus:outline-none transition-all shadow-sm ${!isEditMode ? "bg-surface border border-border-color opacity-75 cursor-not-allowed" : "bg-primary/5 border border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/50"}`}
                  />
                </div>
              </div>
            </div>

            {/* Instructional helper warning */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-2.5">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary/80 leading-normal">
                Changes in this dossier automatically sync into the RAG
                Assistant scope. Chat searches will retrieve this context
                automatically.
              </p>
            </div>
          </div>

        {/* Materials Repository Tab */}
        <div className={activeSubTab === "materials" ? "space-y-4" : "hidden"}>
          <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary-text font-display">
                Classroom Document Repo
              </h4>
              {isEditMode && (
                <Button
                  id="materials-upload-file-button"
                  variant="secondary"
                  size="xs"
                  onClick={() => setShowFileForm(!showFileForm)}
                  leftIcon={showFileForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                >
                  {showFileForm ? "Cancel" : "Upload File"}
                </Button>
              )}
            </div>

            {/* Simulated file upload form */}
            {showFileForm && (
              <form
                onSubmit={handleCreateMaterial}
                className="bg-surface border border-border-color rounded-xl p-3.5 space-y-3 shadow-sm"
              >
                <div>
                  <label className="text-[10px] font-mono text-muted-text block">
                    FILE DISPLAY TITLE
                  </label>
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
                  <div className="col-span-2">
                    <label className="text-[10px] font-mono text-muted-text block mb-1">
                      UPLOAD FILE (OPTIONAL)
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setNewFileObj(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-primary-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-text block">
                      RESOURCE CATEGORY
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) =>
                        setNewCategory(e.target.value as ContentCategory)
                      }
                      className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="Study Material">Study Material</option>
                      <option value="Note">Class Note</option>
                      <option value="Assigned Book">Assigned Book</option>
                      <option value="Link">Web Link</option>
                      <option value="Practical">Practical Lab</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Test">Test Paper</option>
                      <option value="Exam">Final Exam</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-text block">
                      COMMA TAGS
                    </label>
                    <input
                      type="text"
                      placeholder="Geometry, Exam"
                      value={newFileTags}
                      onChange={(e) => setNewFileTags(e.target.value)}
                      className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {!newFileObj && (
                  <div>
                    <label className="text-[10px] font-mono text-muted-text block">
                      OR WEB LINK URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/syllabus.pdf"
                      value={newUrlString}
                      onChange={(e) => setNewUrlString(e.target.value)}
                      className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                {['Assignment', 'Test', 'Exam', 'Practical'].includes(newCategory) && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border-color/40">
                    <div>
                      <label className="text-[10px] font-mono text-muted-text block">
                        DUE DATE
                      </label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-muted-text block">
                        MAX SCORE
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newMaxScore}
                        onChange={(e) => setNewMaxScore(parseInt(e.target.value) || 100)}
                        className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Upload & Commit Document
                </button>
              </form>
            )}

            {/* Files Grid list */}
            <div className="space-y-2.5">
              {classItem.materials.length === 0 ? (
                <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                  No reference files. Let's upload a textbook.
                </div>
              ) : (
                classItem.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="group bg-surface border border-border-color hover:bg-elevated rounded-xl p-3 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div
                      className="flex items-center gap-3 truncate"
                      onClick={() => setSelectedMaterialHistory(mat)}
                    >
                      <div className="p-2.5 bg-background rounded-lg text-muted-text group-hover:text-primary group-hover:bg-primary/10 transition-all border border-border-color">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate flex flex-col">
                        <span className="text-xs font-medium text-primary-text truncate group-hover:text-primary-text">
                          {mat.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-mono text-muted-text uppercase">
                            {mat.category || 'Study Material'}
                          </span>
                          <span className="w-1 h-1 bg-border-color rounded-full"></span>
                          <span className="text-[9px] font-mono text-primary/80">
                            {mat.size || 'File'}
                          </span>
                          {mat.isShared && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                              <Globe className="w-2.5 h-2.5" /> Shared
                            </span>
                          )}
                          {mat.customContent && mat.customContent.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              <Lock className="w-2.5 h-2.5" /> Private (+{mat.customContent.length})
                            </span>
                          )}
                          {mat.customRubricCriteria && mat.customRubricCriteria.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              <Sliders className="w-2.5 h-2.5" /> Augmented Rubric
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 transition-opacity">
                      <button
                        onClick={() => setPreviewMaterial(mat)}
                        title="Quick In-App Document Preview"
                        className="p-1 hover:bg-primary/10 border border-transparent hover:border-primary/20 text-muted-text hover:text-primary rounded cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {['Assignment', 'Test', 'Exam', 'Practical'].includes(mat.category) && (
                        <button
                          onClick={() => setRubricModalMaterial(mat)}
                          title="Design / Edit Grading Criteria"
                          className="p-1 hover:bg-primary/10 border border-transparent hover:border-primary/20 text-muted-text hover:text-primary rounded cursor-pointer transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadFile(mat)}
                        title="Download / Open Material"
                        className="p-1 hover:bg-background border border-transparent hover:border-border-color text-muted-text hover:text-primary rounded cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedMaterialHistory(mat)}
                        title="View File Version History"
                        className="p-1 hover:bg-background border border-transparent hover:border-border-color text-muted-text hover:text-primary rounded cursor-pointer transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {isEditMode && (
                        <button
                          onClick={() => onDeleteMaterial(classItem.id, mat.id)}
                          title="Remove Material from Class"
                          className="p-1 hover:bg-red-500/10 text-muted-text hover:text-red-500 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        {/* AI Custom Instructions Tab */}
        <div className={activeSubTab === "prompts" ? "space-y-4" : "hidden"}>
          <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary-text font-display">
                Rule Prompt Templates
              </h4>
              {isEditMode && (
                <Button
                  id="instructions-new-guideline-button"
                  variant="secondary"
                  size="xs"
                  onClick={() => setShowPromptForm(!showPromptForm)}
                  leftIcon={showPromptForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                >
                  {showPromptForm ? "Cancel" : "New Guideline"}
                </Button>
              )}
            </div>

            {/* Prompt design form */}
            {showPromptForm && (
              <form
                onSubmit={handleCreateInstruction}
                className="bg-surface border border-border-color rounded-xl p-3.5 space-y-3 shadow-sm"
              >
                <div>
                  <label className="text-[10px] font-mono text-muted-text block">
                    INSTRUCTION TITLE
                  </label>
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
                  <label className="text-[10px] font-mono text-muted-text block">
                    GUIDELINE TYPE
                  </label>
                  <select
                    value={newPromptType}
                    onChange={(e) =>
                      setNewPromptType(e.target.value as Instruction["type"])
                    }
                    className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    <option value="criteria">Evaluation Criteria</option>
                    <option value="marking">Marking Instructions</option>
                    <option value="preference">Classroom Preferences</option>
                    <option value="global">
                      Global Assistant system prompt
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-muted-text block">
                    AI INSTRUCTIONS CONTENT
                  </label>
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
              {classItem.instructions.length === 0 ? (
                <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                  No criteria instructions flagged. Assistant is using default
                  grading rules.
                </div>
              ) : (
                classItem.instructions.map((inst) => (
                  <div
                    key={inst.id}
                    className="bg-surface border border-border-color rounded-xl p-3.5 space-y-2 shadow-sm transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-background text-secondary border border-secondary/30 rounded-full font-semibold">
                        {inst.type}
                      </span>
                      {isEditMode && (
                        <button
                          onClick={() =>
                            onDeleteInstruction(classItem.id, inst.id)
                          }
                          className="text-muted-text hover:text-red-500 p-1 rounded hover:bg-background transition-colors cursor-pointer"
                          title="Delete Guideline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-primary-text">
                      {inst.title}
                    </h5>
                    <p className="text-[11px] text-secondary-text leading-relaxed font-mono whitespace-pre-line bg-elevated rounded-lg p-2 border border-border-color">
                      {inst.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
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
                <h3 className="text-sm font-semibold text-primary-text truncate max-w-xs">
                  {selectedMaterialHistory.name}
                </h3>
                <span className="text-[10px] font-mono text-muted-text">
                  Document Upload Lifecycle
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {selectedMaterialHistory.versionHistory?.length > 0 ? (
                selectedMaterialHistory.versionHistory.map((ver, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 text-xs bg-elevated rounded-xl p-3 border border-border-color"
                  >
                    <span className="font-mono text-primary font-bold shrink-0">
                      {ver.version}
                    </span>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-text font-mono block">
                        {ver.date}
                      </span>
                      <p className="text-secondary-text font-medium">
                        {ver.note}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex gap-3 text-xs bg-elevated rounded-xl p-3 border border-border-color">
                  <span className="font-mono text-primary font-bold shrink-0">
                    v1.0
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-text font-mono block">
                      {classItem.academicYear} semester release
                    </span>
                    <p className="text-secondary-text">
                      Initial repository indexing completed.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsVersionPromptOpen(true)}
                className="w-full bg-background hover:bg-elevated text-secondary-text hover:text-primary-text font-mono text-[11px] py-1.5 border border-border-color rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Commit Version Update Log
              </button>
            </div>
          </div>
        </div>
      )}

      <PromptModal
        isOpen={isVersionPromptOpen}
        title="Update Version"
        message="Enter a note explaining what changed in this version."
        placeholder="e.g. Added chapter 4 summary"
        submitText="Commit Update"
        onSubmit={(note) => {
          if (selectedMaterialHistory) {
            const updatedVer = [
              ...(selectedMaterialHistory.versionHistory || []),
              {
                version: `v1.${selectedMaterialHistory.versionHistory?.length || 1}`,
                date: new Date().toISOString().split("T")[0],
                note,
              },
            ];
            const updatedMats = classItem.materials.map((m) =>
              m.id === selectedMaterialHistory.id
                ? { ...m, versionHistory: updatedVer }
                : m,
            );
            onUpdateClass(classItem.id, { materials: updatedMats });
            setSelectedMaterialHistory({
              ...selectedMaterialHistory,
              versionHistory: updatedVer,
            });
          }
          setIsVersionPromptOpen(false);
        }}
        onCancel={() => setIsVersionPromptOpen(false)}
      />

      {/* Material In-App Preview Modal */}
      {previewMaterial && (
        <MaterialPreviewModal
          isOpen={!!previewMaterial}
          onClose={() => setPreviewMaterial(null)}
          material={previewMaterial}
          classId={classItem.id}
          onTriggerToast={onTriggerToast}
        />
      )}

      {/* Visual Rubric Builder Modal */}
      {rubricModalMaterial && (
        <RubricBuilderModal
          isOpen={!!rubricModalMaterial}
          onClose={() => setRubricModalMaterial(null)}
          material={rubricModalMaterial}
          classId={classItem.id}
          onSaveRubric={handleSaveRubric}
          onTriggerToast={onTriggerToast}
        />
      )}

      <LoadingOverlay isOpen={!!isDownloadingMsg} message={isDownloadingMsg || undefined} />
    </div>
  );
}
