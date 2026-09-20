import React, { useState } from 'react';
import { RubricBreakdownItem } from '@/types/main';
import {
  Sparkles,
  Check,
  Sliders,
  FileText,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Textarea } from '@/components/ui';

export interface AISuggestionPayload {
  score: number;
  maxScore: number;
  grade?: string;
  feedback: string;
  privateTeacherNotes?: string;
  rubricBreakdown: RubricBreakdownItem[];
  rationale?: string;
}

interface AIDiagnosticDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  assignmentTitle: string;
  currentScore?: number;
  currentMaxScore?: number;
  currentFeedback?: string;
  currentNotes?: string;
  currentRubricBreakdown?: RubricBreakdownItem[];
  aiSuggestion: AISuggestionPayload;
  onApply: (applied: {
    score: number;
    feedback: string;
    privateTeacherNotes: string;
    rubricBreakdown: RubricBreakdownItem[];
  }) => void;
}

export default function AIDiagnosticDiffModal({
  isOpen,
  onClose,
  studentName,
  assignmentTitle,
  currentScore = 0,
  currentMaxScore = 100,
  currentFeedback = '',
  currentNotes = '',
  currentRubricBreakdown = [],
  aiSuggestion,
  onApply,
}: AIDiagnosticDiffModalProps) {
  if (!isOpen) return null;

  const [selectedItems, setSelectedItems] = useState<{
    scores: boolean;
    feedback: boolean;
    notes: boolean;
  }>({
    scores: true,
    feedback: true,
    notes: true,
  });

  const [customFeedback, setCustomFeedback] = useState(aiSuggestion.feedback);
  const [customNotes, setCustomNotes] = useState(aiSuggestion.privateTeacherNotes || '');
  const [customBreakdown, setCustomBreakdown] = useState<RubricBreakdownItem[]>(
    aiSuggestion.rubricBreakdown.length > 0
      ? JSON.parse(JSON.stringify(aiSuggestion.rubricBreakdown))
      : []
  );

  const calculatedScore = customBreakdown.length > 0
    ? customBreakdown.reduce((acc, item) => acc + (item.score || 0), 0)
    : aiSuggestion.score;

  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...customBreakdown];
    updated[index].score = Math.max(0, Math.min(updated[index].maxScore, newScore));
    setCustomBreakdown(updated);
  };

  const handleApplyChanges = () => {
    onApply({
      score: selectedItems.scores ? calculatedScore : currentScore,
      feedback: selectedItems.feedback ? customFeedback : currentFeedback,
      privateTeacherNotes: selectedItems.notes ? customNotes : currentNotes,
      rubricBreakdown: selectedItems.scores ? customBreakdown : currentRubricBreakdown,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="ai-diagnostic-diff-modal" size="lg">
      <ModalHeader
        title="AI Auto-Grading Diagnostic Diff"
        subtitle={`Student: ${studentName} • Assignment: ${assignmentTitle}`}
        badge={<Badge variant="primary">Pedagogical Review</Badge>}
        icon={<Sparkles className="w-5 h-5 animate-pulse" />}
        onClose={onClose}
      />

      <ModalBody className="p-6 space-y-6">
        {/* Top Score Comparison Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-elevated/60 border border-border-color rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-muted-text uppercase font-bold">
              Current Record
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display text-secondary-text">
                {currentScore}
              </span>
              <span className="text-xs text-muted-text font-mono">/ {currentMaxScore}</span>
            </div>
            <span className="text-[10px] text-muted-text font-mono mt-1">
              {currentScore > 0 ? `${Math.round((currentScore / currentMaxScore) * 100)}% recorded` : 'Ungraded'}
            </span>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-primary uppercase font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Suggested
              </span>
              <input
                type="checkbox"
                checked={selectedItems.scores}
                onChange={(e) => setSelectedItems({ ...selectedItems, scores: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                title="Apply AI Score Suggestion"
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-display text-primary">
                {calculatedScore}
              </span>
              <span className="text-xs text-primary/70 font-mono">/ {aiSuggestion.maxScore}</span>
            </div>
            <span className="text-[10px] text-primary font-mono mt-1 font-semibold">
              {Math.round((calculatedScore / aiSuggestion.maxScore) * 100)}% suggested grade
            </span>
          </div>

          <div className="bg-elevated/60 border border-border-color rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-muted-text uppercase font-bold flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-warning" />
              AI Diagnostic Summary
            </span>
            <p className="text-xs text-secondary-text leading-relaxed mt-2 italic">
              "{aiSuggestion.rationale || 'Demonstrated understanding of core principles with minor formatting/algebraic omissions.'}"
            </p>
          </div>
        </div>

        {/* Grading Criteria Diff & Sliders */}
        {customBreakdown.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Criteria & Score Breakdown
              </h4>
              <span className="text-[10px] font-mono text-muted-text">
                Drag sliders to tweak individual criteria before applying
              </span>
            </div>

            <div className="space-y-3 bg-surface border border-border-color rounded-2xl p-4 shadow-sm">
              {customBreakdown.map((item, idx) => (
                <div
                  key={item.criterionId || idx}
                  className="p-3 bg-elevated/50 border border-border-color/80 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary-text font-display">
                      {item.criterionName}
                    </span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {item.score} / {item.maxScore}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max={item.maxScore}
                      value={item.score}
                      onChange={(e) => handleScoreChange(idx, parseInt(e.target.value) || 0)}
                      className="flex-1 accent-primary h-1.5 bg-border-color rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max={item.maxScore}
                      value={item.score}
                      onChange={(e) => handleScoreChange(idx, parseInt(e.target.value) || 0)}
                      className="w-14 bg-surface border border-border-color rounded-lg px-2 py-1 text-xs text-center font-mono font-bold text-primary-text focus:border-primary outline-none"
                    />
                  </div>

                  {item.comment && (
                    <p className="text-[11px] text-muted-text italic pl-1">
                      • {item.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Comparison Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Constructive Student Feedback Draft
            </h4>
            <label className="flex items-center gap-2 text-xs text-secondary-text cursor-pointer">
              <input
                type="checkbox"
                checked={selectedItems.feedback}
                onChange={(e) => setSelectedItems({ ...selectedItems, feedback: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              Apply this feedback draft
            </label>
          </div>

          <Textarea
            value={customFeedback}
            onChange={(e) => setCustomFeedback(e.target.value)}
            disabled={!selectedItems.feedback}
            rows={4}
            placeholder="Edit constructive student feedback..."
          />
        </div>

        {/* Private Teacher Notes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-warning" />
              Private Pedagogical Notes (Teacher Only)
            </h4>
            <label className="flex items-center gap-2 text-xs text-secondary-text cursor-pointer">
              <input
                type="checkbox"
                checked={selectedItems.notes}
                onChange={(e) => setSelectedItems({ ...selectedItems, notes: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
              Apply private teacher notes
            </label>
          </div>

          <Textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            disabled={!selectedItems.notes}
            rows={3}
            placeholder="Internal pedagogical notes, remedial recommendations, IEP notes..."
          />
        </div>
      </ModalBody>

      <ModalFooter className="p-4 justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedItems({ scores: true, feedback: true, notes: true })}
            className="text-[11px] text-primary hover:underline font-mono cursor-pointer"
          >
            Select All
          </button>
          <span className="text-muted-text">•</span>
          <button
            onClick={() => setSelectedItems({ scores: false, feedback: false, notes: false })}
            className="text-[11px] text-muted-text hover:text-secondary-text font-mono cursor-pointer"
          >
            Deselect All
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApplyChanges}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Apply Suggestions to Evaluation
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
