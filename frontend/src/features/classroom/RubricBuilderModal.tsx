import React, { useState } from 'react';
import { Material, RubricCriterion } from '@/types/main';
import { materialService } from '@/services/materialService';
import {
  Plus,
  Trash2,
  Sliders,
  Save,
  Layers,
  Globe,
  Lock,
} from 'lucide-react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, FormField, Input, Textarea, Badge } from '@/components/ui';

interface RubricBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
  classId?: string;
  onSaveRubric: (materialId: string, criteria: RubricCriterion[], maxScore: number) => void;
  onTriggerToast?: (msg: string) => void;
}

const PRESET_RUBRICS: { name: string; criteria: RubricCriterion[] }[] = [
  {
    name: 'Mathematics & Problem Solving',
    criteria: [
      { id: 'math-1', name: 'Conceptual Understanding & Axiom Application', description: 'Accurate identification of required formulas and theorems.', maxScore: 40, weight: 40, isPrivate: false },
      { id: 'math-2', name: 'Step-by-Step Algebraic Accuracy', description: 'Correct mechanical computation and intermediate verification.', maxScore: 35, weight: 35, isPrivate: false },
      { id: 'math-3', name: 'Notation & Solution Proof Clarity', description: 'Legible layout, structured proof lines, and final units.', maxScore: 25, weight: 25, isPrivate: false },
    ],
  },
  {
    name: 'Analytical Essay & Writing',
    criteria: [
      { id: 'write-1', name: 'Thesis & Argument Formulation', description: 'Original, defensible thesis statement supported throughout.', maxScore: 30, weight: 30, isPrivate: false },
      { id: 'write-2', name: 'Textual Evidence & Analysis', description: 'Integration of primary citations and deep synthesis.', maxScore: 40, weight: 40, isPrivate: false },
      { id: 'write-3', name: 'Grammar, Style & Academic Tone', description: 'Cohesive flow, syntactic variety, and proper citation format.', maxScore: 30, weight: 30, isPrivate: false },
    ],
  },
  {
    name: 'Science Lab Report & Experiment',
    criteria: [
      { id: 'sci-1', name: 'Hypothesis & Variable Control', description: 'Clearly articulated hypothesis with identified variables.', maxScore: 25, weight: 25, isPrivate: false },
      { id: 'sci-2', name: 'Data Collection & Empirical Rigor', description: 'Precise quantitative logging and graph representation.', maxScore: 35, weight: 35, isPrivate: false },
      { id: 'sci-3', name: 'Discussion & Error Analysis', description: 'Interpretation of results, anomaly explanation, and conclusion.', maxScore: 40, weight: 40, isPrivate: false },
    ],
  },
  {
    name: 'Project & Oral Presentation',
    criteria: [
      { id: 'proj-1', name: 'Subject Mastery & Depth', description: 'Thorough coverage of the project domain.', maxScore: 40, weight: 40, isPrivate: false },
      { id: 'proj-2', name: 'Visual Artifacts & Slide Design', description: 'Professional, engaging visual diagrams and media.', maxScore: 30, weight: 30, isPrivate: false },
      { id: 'proj-3', name: 'Delivery, Timing & Q&A Response', description: 'Confident presentation and articulate answers to queries.', maxScore: 30, weight: 30, isPrivate: false },
    ],
  },
];

export default function RubricBuilderModal({
  isOpen,
  onClose,
  material,
  classId,
  onSaveRubric,
  onTriggerToast,
}: RubricBuilderModalProps) {
  if (!isOpen) return null;

  const [criteria, setCriteria] = useState<RubricCriterion[]>(() => {
    if (material.rubricCriteria && material.rubricCriteria.length > 0) {
      return JSON.parse(JSON.stringify(material.rubricCriteria));
    }
    return PRESET_RUBRICS[0].criteria;
  });

  const [isSaving, setIsSaving] = useState(false);

  const totalMaxScore = criteria.reduce((acc, c) => acc + (Number(c.maxScore) || 0), 0);

  const handleAddCriterion = (isPrivate: boolean = false) => {
    const newCrit: RubricCriterion = {
      id: `crit-${Date.now()}`,
      name: `Criterion ${criteria.length + 1}`,
      description: '',
      maxScore: 20,
      weight: 20,
      isPrivate,
    };
    setCriteria([...criteria, newCrit]);
  };

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length <= 1) {
      if (onTriggerToast) onTriggerToast('Grading criteria must include at least one criterion.');
      return;
    }
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const handleUpdateCriterion = (idx: number, updates: Partial<RubricCriterion>) => {
    const updated = [...criteria];
    updated[idx] = { ...updated[idx], ...updates };
    setCriteria(updated);
  };

  const handleLoadPreset = (preset: typeof PRESET_RUBRICS[0]) => {
    setCriteria(JSON.parse(JSON.stringify(preset.criteria)));
    if (onTriggerToast) onTriggerToast(`Loaded preset grading criteria: "${preset.name}"`);
  };

  const handleSave = async () => {
    if (criteria.length === 0) return;
    setIsSaving(true);

    try {
      await materialService.updateMaterialRubric(material.id, criteria, totalMaxScore, classId);
      onSaveRubric(material.id, criteria, totalMaxScore);
      if (onTriggerToast) onTriggerToast('Grading criteria saved successfully!');
      onClose();
    } catch (err: any) {
      if (onTriggerToast) onTriggerToast(`Failed to save grading criteria: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="rubric-builder-modal" size="lg">
      <ModalHeader
        title="Grading Criteria Builder"
        subtitle={`Designing evaluation standards for: ${material.name}`}
        icon={<Sliders className="w-5 h-5 text-primary" />}
        onClose={onClose}
      >
        <div className="text-right mr-2">
          <span className="text-[10px] font-mono text-muted-text uppercase block">
            Total Max Points
          </span>
          <span className="text-sm font-mono font-bold text-primary">
            {totalMaxScore} pts
          </span>
        </div>
      </ModalHeader>

      {/* Preset Templates Quick Picker */}
      <div className="p-4 border-b border-border-color bg-surface shrink-0">
        <span className="text-[10px] font-mono uppercase font-bold text-muted-text block mb-2">
          Load Recommended Grading Criteria Template:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_RUBRICS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadPreset(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-elevated/60 hover:bg-primary/10 hover:text-primary border border-border-color hover:border-primary/30 transition-all cursor-pointer shadow-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <ModalBody className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              Grading Criteria ({criteria.length})
            </h4>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                <Globe className="w-3 h-3" />
                {criteria.filter((c) => !c.isPrivate).length} Public Base
              </span>
              {classId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Lock className="w-3 h-3" />
                  {criteria.filter((c) => c.isPrivate).length} Class-Private
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => handleAddCriterion(false)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Public Criterion
            </Button>
            {classId && (
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => handleAddCriterion(true)}
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30"
              >
                Add Class-Private
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {criteria.map((c, idx) => (
            <div
              key={c.id || idx}
              className={`border rounded-2xl p-4 space-y-3 shadow-sm transition-colors ${
                c.isPrivate
                  ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-elevated/40 border-border-color hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <FormField label="Criterion Name">
                        <Input
                          required
                          value={c.name}
                          onChange={(e) => handleUpdateCriterion(idx, { name: e.target.value })}
                          placeholder="e.g. Conceptual Understanding"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div>
                    <FormField label="Max Points">
                      <Input
                        type="number"
                        min="1"
                        required
                        value={c.maxScore}
                        onChange={(e) =>
                          handleUpdateCriterion(idx, { maxScore: parseInt(e.target.value) || 0 })
                        }
                        className="text-center font-mono font-bold text-primary"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-5">
                  {classId && (
                    <div className="flex bg-surface rounded-lg p-0.5 border border-border-color">
                      <button
                        type="button"
                        onClick={() => handleUpdateCriterion(idx, { isPrivate: false })}
                        title="Public: Shared across all classes linked to this material"
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                          !c.isPrivate
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-muted-text hover:text-primary-text'
                        }`}
                      >
                        <Globe className="w-3 h-3" />
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCriterion(idx, { isPrivate: true })}
                        title="Class-Private: Augments criteria for this class cohort only"
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                          c.isPrivate
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-muted-text hover:text-primary-text'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        Private
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(c.id)}
                    className="p-1.5 hover:bg-error/10 text-muted-text hover:text-error rounded-lg transition-colors cursor-pointer"
                    title="Remove Criterion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <FormField label="Description & Scoring Standard">
                <Textarea
                  rows={2}
                  value={c.description || ''}
                  onChange={(e) => handleUpdateCriterion(idx, { description: e.target.value })}
                  placeholder="Specific performance descriptors (e.g. What constitutes an exemplary response vs flawed formulation)..."
                />
              </FormField>
            </div>
          ))}
        </div>
      </ModalBody>

      <ModalFooter className="p-4 justify-between">
        <span className="text-xs text-muted-text font-mono">
          {criteria.length} criteria defined • Sum: <strong>{totalMaxScore} max points</strong>
        </span>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={criteria.length === 0}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Grading Criteria
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
