import React, { useState } from 'react';
import {
  Student,
  ClassModel,
  CustomField,
  StudentSubmission,
  Material,
} from '@/types/main';
import { studentService } from '@/services/studentService';
import {
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  FileText,
  Plus,
  Trash2,
  Trash,
  X,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Award,
  UploadCloud,
} from 'lucide-react';
import { Button, Badge, Modal } from '@/components/ui';

interface StudentDetailModalProps {
  student: Student;
  classItem: ClassModel;
  previousStudent: Student | null;
  nextStudent: Student | null;
  onClose: () => void;
  onSelectStudent: (id: string) => void;
  onUpdateStudentDetails: (studentId: string, updates: Partial<Student>) => void;
  onRequestDeleteStudent: (studentId: string) => void;
  onOpenGradingModal: (submission: StudentSubmission, material?: Material) => void;
  onOpenUploadModal: () => void;
  onOpenReportCard: (studentId: string) => void;
  onTriggerToast?: (msg: string) => void;
}

export default function StudentDetailModal({
  student,
  classItem,
  previousStudent,
  nextStudent,
  onClose,
  onSelectStudent,
  onUpdateStudentDetails,
  onRequestDeleteStudent,
  onOpenGradingModal,
  onOpenUploadModal,
  onOpenReportCard,
  onTriggerToast,
}: StudentDetailModalProps) {
  // Grouped form states
  const [gradeForm, setGradeForm] = useState({ name: '', score: 85, max: 100, feedback: '', show: false });
  const [customFieldForm, setCustomFieldForm] = useState({
    label: '',
    type: 'text' as CustomField['type'],
    value: '',
    show: false,
  });

  // Grade operations
  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.name.trim()) return;

    const submissionId = crypto.randomUUID();
    const newGrade: StudentSubmission = {
      id: submissionId,
      classId: classItem.id,
      studentId: student.id,
      materialName: gradeForm.name.trim(),
      score: gradeForm.score,
      maxScore: gradeForm.max,
      grade: `${Math.round((gradeForm.score / gradeForm.max) * 100)}%`,
      feedback: gradeForm.feedback.trim() || undefined,
      status: 'Graded',
      submittedAt: new Date().toISOString(),
      content: [
        {
          id: crypto.randomUUID(),
          name: gradeForm.name.trim(),
          type: 'File',
          path: `grade://${submissionId}`,
          description: `Direct grade entry for ${gradeForm.name.trim()}`,
        },
      ],
    };

    onUpdateStudentDetails(student.id, {
      submissions: [...(student.submissions || []), newGrade],
    });

    try {
      await studentService.createStudentSubmission(classItem.id, student.id, {
        id: submissionId,
        content: newGrade.content || [],
        score: newGrade.score,
        grade: newGrade.grade,
        feedback: newGrade.feedback,
        status: 'Graded',
      });
      if (onTriggerToast) onTriggerToast('Logged grade successfully.');
    } catch (err: any) {
      console.error("Error creating student grade in DB:", err);
      if (onTriggerToast) onTriggerToast(`Failed to save grade: ${err.message}`);
    }

    setGradeForm({ name: '', score: 85, max: 100, feedback: '', show: false });
  };

  const handleDeleteGrade = async (gradeId: string) => {
    const previous = student.submissions || [];
    const filtered = previous.filter((g) => g.id !== gradeId);
    onUpdateStudentDetails(student.id, { submissions: filtered });
    try {
      await studentService.deleteStudentSubmission(gradeId);
      if (onTriggerToast) onTriggerToast('Grade record and files deleted.');
    } catch (err: any) {
      console.error("Error deleting grade from DB:", err);
      onUpdateStudentDetails(student.id, { submissions: previous });
      if (onTriggerToast) onTriggerToast(`Failed to delete grade: ${err.message}`);
    }
  };

  // Custom fields
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFieldForm.label.trim()) return;

    const newField: CustomField = {
      id: `cf-${Date.now()}`,
      label: customFieldForm.label.trim(),
      type: customFieldForm.type,
      value: customFieldForm.value.trim() || 'Unspecified',
      visibility: true,
    };

    onUpdateStudentDetails(student.id, {
      customFields: [...(student.customFields || []), newField],
    });

    setCustomFieldForm({ label: '', type: 'text', value: '', show: false });
  };

  const handleDeleteCustomField = (fieldId: string) => {
    const filtered = (student.customFields || []).filter((f) => f.id !== fieldId);
    onUpdateStudentDetails(student.id, { customFields: filtered });
  };

  const handleDeleteSubmission = async (upId: string) => {
    const previous = student.submissions || [];
    const filtered = previous.filter((u) => u.id !== upId);
    onUpdateStudentDetails(student.id, { submissions: filtered });
    try {
      await studentService.deleteStudentSubmission(upId);
      if (onTriggerToast) onTriggerToast('Submission and storage files removed.');
    } catch (err: any) {
      console.error("Error deleting submission from DB:", err);
      onUpdateStudentDetails(student.id, { submissions: previous });
      if (onTriggerToast) onTriggerToast(`Failed to delete submission: ${err.message}`);
    }
  };

  const gradedSubmissions = (student.submissions || []).filter(
    (s) => s.score !== undefined && s.score !== null
  );
  const pendingSubmissions = (student.submissions || []).filter(
    (s) => s.score === undefined || s.score === null
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      id="student-detail-modal"
      size="lg"
      className="max-w-4xl h-[90vh]"
    >
      <button
        id="student-detail-close-button"
        onClick={onClose}
        className="absolute right-5 top-5 hover:bg-elevated p-2 rounded-xl text-muted-text hover:text-primary-text transition-colors cursor-pointer z-10"
      >
        <X className="w-4.5 h-4.5" />
      </button>

      {/* Top Header */}
      <div className="p-6 border-b border-border-color bg-elevated/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1 pr-3 border-r border-border-color/50">
            <button
              onClick={() => previousStudent && onSelectStudent(previousStudent.id)}
              disabled={!previousStudent}
              className="p-1 rounded bg-surface border border-border-color hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Student"
            >
              <ChevronLeft className="w-4 h-4 text-primary-text" />
            </button>
            <button
              onClick={() => nextStudent && onSelectStudent(nextStudent.id)}
              disabled={!nextStudent}
              className="p-1 rounded bg-surface border border-border-color hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next Student"
            >
              <ChevronRight className="w-4 h-4 text-primary-text" />
            </button>
          </div>

          <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center font-display font-semibold text-xl text-primary">
            {student.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-display text-primary-text">
                {student.name}
              </h3>
              <span className="text-xs font-mono text-muted-text">
                ID: {student.rollNumber || 'M10'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <select
                value={student.statusIndicator || 'active'}
                onChange={(e) =>
                  onUpdateStudentDetails(student.id, {
                    statusIndicator: e.target.value as Student['statusIndicator'],
                  })
                }
                className="bg-surface border border-border-color rounded px-2 py-0.5 text-[10px] font-mono text-primary outline-none cursor-pointer focus:border-primary"
              >
                <option value="active">Roster: Active</option>
                <option value="inactive">Roster: Inactive</option>
                <option value="needs-attention">Needs Care Attention</option>
              </select>

              <span className="text-[10px] font-mono text-muted-text">
                | Portfolio performance:
              </span>
              <Badge variant="primary" size="sm">
                {student.performanceIndicator || student.performanceTier || 'Average'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-12 flex-wrap">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => onOpenReportCard(student.id)}
            leftIcon={<Award className="w-3.5 h-3.5" />}
            title="Generate Printable Progress Report Card"
          >
            Report Card
          </Button>

          <Button
            variant="success"
            size="xs"
            onClick={onOpenUploadModal}
            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            title="Attach Student Homework / Work"
          >
            Log Turn-in
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => onRequestDeleteStudent(student.id)}
            leftIcon={<Trash className="w-3.5 h-3.5" />}
            className="hover:bg-red-500/10 text-red-400 hover:text-red-300 border-red-500/20"
          >
            Expel Student
          </Button>
        </div>
      </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Contact Dossier & Custom Fields */}
          <div className="w-full md:w-80 border-r border-border-color p-6 overflow-y-auto space-y-6 shrink-0 bg-background/50">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold font-mono text-muted-text uppercase tracking-widest leading-none">
                Contact Dossier
              </h4>

              <div className="space-y-3.5">
                <div className="flex items-center gap-2.5 text-xs">
                  <Mail className="w-3.5 h-3.5 text-muted-text shrink-0" />
                  <input
                    type="text"
                    value={student.email || ''}
                    onChange={(e) => onUpdateStudentDetails(student.id, { email: e.target.value })}
                    className="bg-transparent text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 truncate w-full"
                  />
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted-text shrink-0" />
                  <input
                    type="text"
                    value={student.phone || ''}
                    onChange={(e) => onUpdateStudentDetails(student.id, { phone: e.target.value })}
                    className="bg-transparent text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full"
                  />
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-muted-text shrink-0 mt-0.5" />
                  <textarea
                    value={student.address || ''}
                    onChange={(e) => onUpdateStudentDetails(student.id, { address: e.target.value })}
                    className="bg-transparent text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full h-11 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Family & Guardians */}
            <div className="space-y-4 pt-4 border-t border-border-color">
              <h4 className="text-[10px] font-bold font-mono text-muted-text uppercase tracking-widest leading-none">
                Family & Guardians
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-muted-text font-mono block">
                    PARENT GUARDIAN NAMES
                  </label>
                  <input
                    type="text"
                    value={student.parentName || ''}
                    onChange={(e) => onUpdateStudentDetails(student.id, { parentName: e.target.value })}
                    className="bg-transparent text-xs text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full pt-1"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-text font-mono block">
                    URGENT CONTACT PREFERENCES
                  </label>
                  <input
                    type="text"
                    value={student.parentContact || ''}
                    onChange={(e) => onUpdateStudentDetails(student.id, { parentContact: e.target.value })}
                    className="bg-transparent text-xs text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full pt-1"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-text font-mono block">
                    PARENT PORTAL FEEDBACK NOTES
                  </label>
                  <textarea
                    value={student.parentNotes || ''}
                    onChange={(e) => onUpdateStudentDetails(student.id, { parentNotes: e.target.value })}
                    className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-secondary-text h-16 resize-none focus:outline-none focus:border-primary/50 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-4 pt-4 border-t border-border-color">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold font-mono text-muted-text uppercase tracking-widest leading-none">
                  Custom Fields
                </h4>
                <button
                  onClick={() => setCustomFieldForm((f) => ({ ...f, show: !f.show }))}
                  className="text-[10px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                >
                  {customFieldForm.show ? 'Cancel' : '+ New Field'}
                </button>
              </div>

              {customFieldForm.show && (
                <form
                  onSubmit={handleAddCustomField}
                  className="bg-elevated border border-border-color rounded-lg p-3 space-y-2.5 shadow-sm"
                >
                  <input
                    type="text"
                    placeholder="Label: IEP Accommodation"
                    value={customFieldForm.label}
                    onChange={(e) => setCustomFieldForm((f) => ({ ...f, label: e.target.value }))}
                    className="w-full bg-surface border border-border-color rounded p-1.5 text-xs text-primary-text focus:outline-none focus:border-primary"
                    required
                  />
                  <select
                    value={customFieldForm.type}
                    onChange={(e) =>
                      setCustomFieldForm((f) => ({ ...f, type: e.target.value as CustomField['type'] }))
                    }
                    className="w-full bg-surface border border-border-color rounded p-1.5 text-xs text-secondary-text outline-none focus:border-primary"
                  >
                    <option value="text">Text Field</option>
                    <option value="tag">Status Tag</option>
                    <option value="boolean">Yes/No Flag</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value: True or High tutoring"
                    value={customFieldForm.value}
                    onChange={(e) => setCustomFieldForm((f) => ({ ...f, value: e.target.value }))}
                    className="w-full bg-surface border border-border-color rounded p-1.5 text-xs text-primary-text focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="w-full bg-primary text-white font-semibold text-[11px] py-1 rounded cursor-pointer"
                  >
                    Register Custom Field
                  </button>
                </form>
              )}

              <div className="space-y-2.5">
                {(student.customFields || []).map((field) => (
                  <div
                    key={field.id}
                    className="group bg-elevated border border-border-color rounded-lg p-2.5 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex flex-col truncate">
                      <span className="text-[9px] font-mono text-muted-text">{field.label}</span>
                      <span className="text-xs font-semibold text-primary mt-0.5 truncate">{field.value}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomField(field.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-muted-text hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Scorecard and Turn-ins */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Scorecard */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Academic Scorecard ({gradedSubmissions.length} Grades)
                </h4>
                <button
                  onClick={() => setGradeForm((f) => ({ ...f, show: !f.show }))}
                  className="text-xs font-bold text-primary hover:text-primary-text cursor-pointer"
                >
                  {gradeForm.show ? 'Cancel Score' : '+ Record Evaluation'}
                </button>
              </div>

              {gradeForm.show && (
                <form
                  onSubmit={handleAddGrade}
                  className="bg-elevated border border-border-color rounded-xl p-4 space-y-3.5 shadow-sm"
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-text font-mono">ASSESSMENT TITLE</label>
                      <input
                        type="text"
                        placeholder="Algebra Chapter 2 Quiz"
                        value={gradeForm.name}
                        onChange={(e) => setGradeForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full bg-surface border border-border-color rounded-lg p-1.8 text-xs text-primary-text outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-text font-mono">RAW SCORE</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={gradeForm.score}
                          onChange={(e) => setGradeForm((f) => ({ ...f, score: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-surface border border-border-color rounded-lg p-1.8 text-xs text-primary-text text-center focus:border-primary outline-none"
                          min="0"
                          required
                        />
                        <span className="text-muted-text">/</span>
                        <input
                          type="number"
                          value={gradeForm.max}
                          onChange={(e) => setGradeForm((f) => ({ ...f, max: parseInt(e.target.value) || 100 }))}
                          className="w-14 bg-surface border border-border-color rounded-lg p-1.8 text-xs text-primary-text text-center focus:border-primary outline-none"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-text font-mono block">PORTFOLIO COMMENT</label>
                    <textarea
                      placeholder="Provide encouraging assessment on concept development..."
                      value={gradeForm.feedback}
                      onChange={(e) => setGradeForm((f) => ({ ...f, feedback: e.target.value }))}
                      className="w-full bg-surface border border-border-color rounded-lg p-2 text-xs text-primary-text h-16 resize-none outline-none focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Commit Score Record
                  </button>
                </form>
              )}

              <div className="space-y-3">
                {gradedSubmissions.length === 0 ? (
                  <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                    No graded evaluations yet. Grade a submission to populate this scorecard.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {gradedSubmissions.map((grade) => {
                      const score = grade.score || 0;
                      const maxScore = parseFloat(grade.grade || '100');
                      const gradePercent = maxScore > 0 ? (score / maxScore) * 100 : 0;
                      let gradeColor = 'text-success bg-success/10 border-success/20';
                      if (gradePercent < 60) gradeColor = 'text-error bg-error/10 border-error/20';
                      else if (gradePercent < 75) gradeColor = 'text-warning bg-warning/10 border-warning/20';
                      const assessmentName = grade.content?.[0]?.value || 'Assessment';
                      const matchedMaterial = classItem.materials?.find(
                        (m) => m.id === grade.materialId || m.name === assessmentName
                      );

                      return (
                        <div
                          key={grade.id}
                          className="bg-elevated border border-border-color hover:border-primary/30 rounded-xl p-4 space-y-2 relative group transition-colors shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-primary-text">{assessmentName}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${gradeColor}`}>
                                {score} / {maxScore} ({gradePercent.toFixed(0)}%)
                              </span>
                              <button
                                onClick={() => onOpenGradingModal(grade, matchedMaterial)}
                                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Open Rubric Evaluation and Feedback Drawer"
                              >
                                <Sliders className="w-3 h-3" />
                                Rubric
                              </button>
                              <button
                                onClick={() => handleDeleteGrade(grade.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-muted-text hover:text-red-500 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {grade.feedback && (
                            <p className="text-[11px] text-secondary-text leading-relaxed bg-surface rounded-lg p-2.5 border border-border-color italic">
                              "{grade.feedback}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Student Uploads & Turn-ins */}
            <div className="space-y-3.5 pt-4 border-t border-border-color">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-success" />
                  Student Uploads & Submissions ({pendingSubmissions.length} files)
                </h4>
                <button
                  onClick={onOpenUploadModal}
                  className="text-xs font-bold text-success hover:text-success/80 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Written Work
                </button>
              </div>

              <div className="space-y-2.5">
                {pendingSubmissions.length === 0 ? (
                  <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                    No pending answer sheets registered.
                  </div>
                ) : (
                  pendingSubmissions.map((up) => {
                    const matchedMaterial = classItem.materials?.find(
                      (m) => m.id === up.materialId || m.name === up.content?.[0]?.value
                    );

                    return (
                      <div
                        key={up.id}
                        className="group bg-elevated border border-border-color hover:border-success/30 rounded-xl p-3 flex items-center justify-between transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-surface rounded-lg text-secondary-text">
                            <FileText className="w-4 h-4 text-success" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-primary-text">
                              {up.content?.map((c) => c.value?.split('/').pop()).join(', ') || 'Unknown File'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-mono text-muted-text">
                                {up.submittedAt ? new Date(up.submittedAt).toISOString().split('T')[0] : ''}
                              </span>
                              <span className="w-1.2 h-1.2 rounded-full bg-border-color"></span>
                              <span className="text-[9px] font-mono text-primary/80">
                                {up.content?.map((c) => c.type).join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenGradingModal(up, matchedMaterial)}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Grade and Review Student Submission"
                          >
                            <Sliders className="w-3 h-3" />
                            Grade / Review
                          </button>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
                              up.status === 'graded'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-warning/10 text-warning border border-warning/20'
                            }`}
                          >
                            {up.status}
                          </span>
                          <button
                            onClick={() => handleDeleteSubmission(up.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-muted-text hover:text-red-500 rounded transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }
