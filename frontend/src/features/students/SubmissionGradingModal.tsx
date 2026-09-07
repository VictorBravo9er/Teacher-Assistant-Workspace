import React, { useState } from 'react';
import {
  Student,
  StudentSubmission,
  Material,
  RubricCriterion,
  RubricBreakdownItem,
  SubmissionStatus,
} from '@/types/main';
import { studentService } from '@/services/studentService';
import AIDiagnosticDiffModal, { AISuggestionPayload } from '@/features/ai-assistant/AIDiagnosticDiffModal';
import {
  Sparkles,
  FileText,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Save,
  Link2,
} from 'lucide-react';
import { Button, Badge, Modal, ModalHeader, ModalFooter, Textarea } from '@/components/ui';

interface SubmissionGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  submission: StudentSubmission;
  material?: Material;
  onSave: (updatedSubmission: StudentSubmission) => void;
  onTriggerToast?: (msg: string) => void;
}

export default function SubmissionGradingModal({
  isOpen,
  onClose,
  student,
  submission,
  material,
  onSave,
  onTriggerToast,
}: SubmissionGradingModalProps) {
  if (!isOpen) return null;

  const defaultCriteria: RubricCriterion[] =
    material?.rubricCriteria && material.rubricCriteria.length > 0
      ? material.rubricCriteria
      : [
          { id: 'crit-1', name: 'Conceptual Understanding & Accuracy', maxScore: 40, weight: 40 },
          { id: 'crit-2', name: 'Methodology & Step-by-Step Execution', maxScore: 35, weight: 35 },
          { id: 'crit-3', name: 'Clarity, Structure & Presentation', maxScore: 25, weight: 25 },
        ];

  const maxTotalScore = material?.maxScore || submission.maxScore || submission.max_score || 100;

  const [rubricItems, setRubricItems] = useState<RubricBreakdownItem[]>(() => {
    const raw = submission.rubricBreakdown || submission.rubric_breakdown;
    if (raw) {
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((r: any) => ({
          criterionId: r.criterionId || r.criterion_id || `crit-${Math.random()}`,
          criterionName: r.criterionName || r.criterion_name || 'Criterion',
          score: r.score !== undefined ? r.score : (r.score_awarded ?? 0),
          maxScore: r.maxScore !== undefined ? r.maxScore : (r.max_score ?? 100),
          comment: r.comment || r.feedback || '',
        }));
      }
      if (typeof raw === 'object' && Array.isArray(raw.criteria_scores) && raw.criteria_scores.length > 0) {
        return raw.criteria_scores.map((r: any) => ({
          criterionId: r.criterionId || r.criterion_id || `crit-${Math.random()}`,
          criterionName: r.criterionName || r.criterion_name || 'Criterion',
          score: r.score !== undefined ? r.score : (r.score_awarded ?? 0),
          maxScore: r.maxScore !== undefined ? r.maxScore : (r.max_score ?? 100),
          comment: r.comment || r.feedback || '',
        }));
      }
    }
    const currentScore = submission.score ?? 85;
    return defaultCriteria.map((c) => ({
      criterionId: c.id,
      criterionName: c.name,
      score: Math.round(
        (c.maxScore / (defaultCriteria.reduce((a, b) => a + b.maxScore, 0) || 100)) * currentScore
      ),
      maxScore: c.maxScore,
      comment: '',
    }));
  });

  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [privateNotes, setPrivateNotes] = useState(
    submission.privateTeacherNotes || submission.private_teacher_notes || ''
  );
  const [status, setStatus] = useState<SubmissionStatus | string>(
    submission.status || 'Graded'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDiagnosingAI, setIsDiagnosingAI] = useState(false);

  const [isAIDiffOpen, setIsAIDiffOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestionPayload | null>(null);

  const totalScore = rubricItems.reduce((acc, item) => acc + (item.score || 0), 0);
  const percentage = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;

  const handleCriterionScoreChange = (idx: number, score: number) => {
    const updated = [...rubricItems];
    updated[idx].score = Math.max(0, Math.min(updated[idx].maxScore, score));
    setRubricItems(updated);
  };

  const handleCriterionCommentChange = (idx: number, comment: string) => {
    const updated = [...rubricItems];
    updated[idx].comment = comment;
    setRubricItems(updated);
  };

  const handleDiagnoseWithAI = async () => {
    setIsDiagnosingAI(true);
    try {
      await new Promise((r) => setTimeout(r, 700));

      const assignmentTitle = material?.name || submission.materialName || 'Student Assignment';
      const studentName = student.name;

      const isSofia = studentName.toLowerCase().includes('sofia');
      const isTop = (student.performanceTier || '').toLowerCase() === 'high';

      const suggestedRubric: RubricBreakdownItem[] = defaultCriteria.map((c, i) => {
        let ratio = 0.88;
        let comment = 'Solid execution and accurate demonstration of core principles.';

        if (isSofia) {
          if (i === 0) {
            ratio = 0.75;
            comment = 'Understands the problem setup but needs reinforcement in algebraic factoring.';
          } else if (i === 1) {
            ratio = 0.65;
            comment = 'Skipped multi-step validation checks. Consider targeted Socratic practice.';
          } else {
            ratio = 0.85;
            comment = 'Neat step formatting and legible proof annotations.';
          }
        } else if (isTop) {
          ratio = 0.96;
          comment = 'Exemplary reasoning and clear, comprehensive logical rigor.';
        }

        const score = Math.round(c.maxScore * ratio);
        return {
          criterionId: c.id,
          criterionName: c.name,
          score,
          maxScore: c.maxScore,
          comment,
        };
      });

      const suggestedTotal = suggestedRubric.reduce((acc, r) => acc + r.score, 0);

      const generatedFeedback = isSofia
        ? `Great effort on "${assignmentTitle}", ${studentName.split(' ')[0]}! You demonstrated strong intuitive problem setup. Focus on double-checking intermediate factoring operations before concluding multi-step equations.`
        : `Excellent work on "${assignmentTitle}". Demonstrates high mastery of underlying concepts, thorough verification steps, and clear proof layout.`;

      const generatedNotes = isSofia
        ? `Sofia exhibited algebraic mechanics hesitance on step 3. Recommended intervention: Queue Socratic Factoring Review module before next summative exam.`
        : `Student demonstrates top percentile understanding. Suitable for peer tutoring leadership on this topic.`;

      setAiSuggestion({
        score: suggestedTotal,
        maxScore: maxTotalScore,
        grade: `${Math.round((suggestedTotal / maxTotalScore) * 100)}%`,
        feedback: generatedFeedback,
        privateTeacherNotes: generatedNotes,
        rubricBreakdown: suggestedRubric,
        rationale: isSofia
          ? 'Diagnosed slight algebraic computation gap during intermediate factoring, though core geometric concept was correctly applied.'
          : 'High logical coherence and complete justification on all proof milestones.',
      });

      setIsAIDiffOpen(true);
    } catch (err: any) {
      if (onTriggerToast) onTriggerToast(`AI Diagnosis failed: ${err.message}`);
    } finally {
      setIsDiagnosingAI(false);
    }
  };

  const handleApplyAISuggestion = (applied: {
    score: number;
    feedback: string;
    privateTeacherNotes: string;
    rubricBreakdown: RubricBreakdownItem[];
  }) => {
    setRubricItems(applied.rubricBreakdown);
    setFeedback(applied.feedback);
    setPrivateNotes(applied.privateTeacherNotes);
    setStatus('Evaluated');
    if (onTriggerToast) onTriggerToast('AI suggestions successfully applied to grading session!');
  };

  const handleSaveEvaluation = async () => {
    setIsSaving(true);
    try {
      const calculatedGrade = `${percentage}%`;
      const targetId =
        submission.id && !submission.id.startsWith('sub-') ? submission.id : crypto.randomUUID();

      const savedResult = await studentService.saveSubmissionReview(targetId, {
        classId: submission.classId || submission.class_id,
        studentId: student.id,
        materialId: material?.id || submission.materialId,
        score: totalScore,
        grade: calculatedGrade,
        feedback,
        privateTeacherNotes: privateNotes,
        rubricBreakdown: rubricItems,
        status: status as string,
        content: submission.content || [],
      });

      const updated: StudentSubmission = {
        ...submission,
        ...savedResult,
        id: savedResult.id || targetId,
        score: totalScore,
        maxScore: maxTotalScore,
        grade: calculatedGrade,
        feedback,
        privateTeacherNotes: privateNotes,
        rubricBreakdown: rubricItems,
        status,
        reviewedAt: new Date().toISOString(),
      };

      onSave(updated);
      if (onTriggerToast) onTriggerToast('Submission grade and feedback successfully committed!');
      onClose();
    } catch (err: any) {
      if (onTriggerToast) onTriggerToast(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const submissionFiles = submission.content || [];
  const assignmentTitle = material?.name || submission.materialName || 'Assignment Submission';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        id="submission-grading-modal"
        size="xl"
        className="h-[92vh]"
      >
        <ModalHeader
          title={student.name}
          subtitle={
            <span>
              Reviewing: <span className="text-primary-text font-semibold">{assignmentTitle}</span>
              {submission.submittedAt && (
                <span className="text-muted-text ml-2">
                  • Submitted{' '}
                  {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </span>
          }
          badge={
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-muted-text">
                ID: {student.rollNumber || 'M10'}
              </span>
              <Badge variant="primary">{status}</Badge>
            </div>
          }
          icon={
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-bold text-base shadow-sm">
              {student.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
          }
          onClose={onClose}
        >
          <Button
            variant="secondary"
            size="xs"
            onClick={handleDiagnoseWithAI}
            isLoading={isDiagnosingAI}
            leftIcon={<Sparkles className="w-4 h-4" />}
            title="Generate AI Evaluation Breakdown and Constructive Feedback"
          >
            {isDiagnosingAI ? 'Analyzing...' : 'Diagnose with AI'}
          </Button>
        </ModalHeader>

        {/* Body: Split View */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Student Submission Artifacts */}
          <div className="w-full md:w-5/12 border-r border-border-color p-5 overflow-y-auto bg-background/40 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold font-mono text-muted-text uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Submitted Work & Files ({submissionFiles.length})
              </h4>
            </div>

            {submissionFiles.length === 0 ? (
              <div className="p-8 border border-dashed border-border-color rounded-2xl text-center space-y-2 bg-surface">
                <FileText className="w-8 h-8 text-muted-text mx-auto" />
                <p className="text-xs text-muted-text font-mono">
                  No physical file attachment logged. Student turned in written / in-class responses.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissionFiles.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="bg-surface border border-border-color hover:border-primary/40 rounded-2xl p-4 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-elevated text-primary border border-border-color">
                          {file.type === 'URL' ? (
                            <Link2 className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-primary-text truncate max-w-[200px]">
                            {file.name || file.value?.split('/').pop() || 'Submission Document'}
                          </h5>
                          <span className="text-[10px] font-mono text-muted-text">
                            {file.type} • {file.description || 'Student attachment'}
                          </span>
                        </div>
                      </div>

                      {file.path && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (file.path?.startsWith('http://') || file.path?.startsWith('https://') || file.path?.startsWith('blob:')) {
                              window.open(file.path, '_blank');
                              return;
                            }
                            try {
                              const signedUrl = await studentService.getSubmissionDownloadUrl(file.path!);
                              window.open(signedUrl, '_blank');
                            } catch (err: any) {
                              if (onTriggerToast) onTriggerToast(`Failed to open submission file: ${err.message}`);
                            }
                          }}
                          className="p-1.5 hover:bg-elevated rounded-lg text-muted-text hover:text-primary transition-colors cursor-pointer"
                          title="Open Attachment"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="bg-elevated/70 border border-border-color/60 rounded-xl p-3 text-xs text-secondary-text font-mono leading-relaxed max-h-40 overflow-y-auto">
                      <span className="text-[10px] uppercase font-bold text-muted-text block mb-1">
                        Submission Preview Excerpt:
                      </span>
                      {file.description ||
                        `Student submission content for ${assignmentTitle}. Ready for criterion evaluation.`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-surface border border-border-color rounded-2xl p-4 space-y-3 shadow-sm">
              <span className="text-[10px] font-mono text-muted-text uppercase font-bold block">
                Student Learning Profile
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-text text-[10px] block">Learning Style</span>
                  <span className="text-primary font-semibold capitalize">
                    {student.learningStyle || 'Visual'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-text text-[10px] block">Performance Tier</span>
                  <span className="text-primary font-semibold capitalize">
                    {student.performanceTier || 'Average'}
                  </span>
                </div>
              </div>

              {student.strengths && student.strengths.length > 0 && (
                <div>
                  <span className="text-muted-text text-[10px] block mb-1">Strengths:</span>
                  <div className="flex flex-wrap gap-1">
                    {student.strengths.map((s, i) => (
                      <Badge key={i} variant="success" size="sm">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Rubric Scoring & Feedback Editor */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="bg-elevated/40 border border-border-color rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-[10px] font-mono text-muted-text uppercase font-bold block">
                  Calculated Total Score
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-display text-primary">
                    {totalScore}
                  </span>
                  <span className="text-sm font-mono text-muted-text">/ {maxTotalScore}</span>
                  <Badge variant="success" size="md">
                    {percentage}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary-text font-medium">Status:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
                  className="bg-surface border border-border-color rounded-xl px-3 py-1.5 text-xs text-primary font-semibold outline-none focus:border-primary cursor-pointer shadow-sm"
                >
                  <option value="Assigned">Assigned</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Evaluated">Evaluated</option>
                  <option value="Graded">Graded (Final)</option>
                </select>
              </div>
            </div>

            {/* Grading Criteria Sliders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Interactive Grading Criteria ({rubricItems.length} Criteria)
                </h4>
                <span className="text-[10px] font-mono text-muted-text">
                  Adjust points per criterion
                </span>
              </div>

              <div className="space-y-3.5">
                {rubricItems.map((item, idx) => (
                  <div
                    key={item.criterionId || idx}
                    className="bg-surface border border-border-color rounded-2xl p-4 space-y-3 shadow-sm hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-primary-text font-display">
                          {item.criterionName}
                        </h5>
                        <span className="text-[10px] text-muted-text font-mono">
                          Max {item.maxScore} pts
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={item.maxScore}
                          value={item.score}
                          onChange={(e) =>
                            handleCriterionScoreChange(idx, parseInt(e.target.value) || 0)
                          }
                          className="w-16 bg-elevated border border-border-color rounded-lg px-2 py-1 text-xs text-center font-mono font-bold text-primary focus:border-primary outline-none"
                        />
                        <span className="text-xs text-muted-text font-mono">
                          / {item.maxScore}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max={item.maxScore}
                        value={item.score}
                        onChange={(e) =>
                          handleCriterionScoreChange(idx, parseInt(e.target.value) || 0)
                        }
                        className="flex-1 accent-primary h-1.5 bg-border-color rounded-lg cursor-pointer"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Criterion note e.g. Demonstrated solid algebraic reasoning..."
                      value={item.comment || ''}
                      onChange={(e) => handleCriterionCommentChange(idx, e.target.value)}
                      className="w-full bg-elevated border border-border-color/80 rounded-xl px-3 py-1.5 text-xs text-secondary-text placeholder-muted-text focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Public Student Feedback */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary-text font-display flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Student Feedback (Visible on Student Portfolio)
              </label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide constructive feedback encouraging concept mastery and identifying next steps..."
                rows={3}
              />
            </div>

            {/* Private Teacher Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary-text font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-warning" />
                Private Teacher Notes (Internal Only)
              </label>
              <Textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Notes for parent teacher conference, accommodation history, or lesson tracking..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <ModalFooter className="p-4 justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-text font-mono">
            <span>
              Score: <strong>{totalScore}/{maxTotalScore}</strong> ({percentage}%)
            </span>
            <span>•</span>
            <span>
              Status: <strong className="capitalize">{status}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEvaluation}
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Commit Evaluation
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* AI Diagnostic Diff Modal */}
      {aiSuggestion && (
        <AIDiagnosticDiffModal
          isOpen={isAIDiffOpen}
          onClose={() => setIsAIDiffOpen(false)}
          studentName={student.name}
          assignmentTitle={assignmentTitle}
          currentScore={totalScore}
          currentMaxScore={maxTotalScore}
          currentFeedback={feedback}
          currentNotes={privateNotes}
          currentRubricBreakdown={rubricItems}
          aiSuggestion={aiSuggestion}
          onApply={handleApplyAISuggestion}
        />
      )}
    </>
  );
}
