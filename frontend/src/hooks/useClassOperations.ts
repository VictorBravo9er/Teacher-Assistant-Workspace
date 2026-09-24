import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ClassModel,
  Template,
  Material,
  Instruction,
  ExperienceLevel,
} from '@/types/main';
import { classService } from '@/services/classService';
import { templateService } from '@/services/templateService';
import { materialService } from '@/services/materialService';
import { instructionService } from '@/services/instructionService';
import { logger } from '@/lib/logger';

interface UseClassOperationsProps {
  classes: ClassModel[];
  templates: Template[];
  mutateClasses: (classes: ClassModel[]) => void;
  mutateTemplates: (templates: Template[]) => void;
  activeClassId: string;
  setActiveClassId: (id: string) => void;
  activeTemplateId: string | null;
  setActiveTemplateId: (id: string | null) => void;
  viewMode: 'class' | 'template';
  setViewMode: (mode: 'class' | 'template') => void;
  isEditMode: boolean;
  setIsEditMode: (editing: boolean) => void;
  setLayoutMode: (mode: 'split' | 'chat-only' | 'details-only') => void;
  setPreviousLayoutMode: (mode: 'split' | 'chat-only' | 'details-only') => void;
  triggerToast: (text: string) => void;
}

export function useClassOperations({
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
}: UseClassOperationsProps) {
  const [processingMsg, setProcessingMsg] = useState<string | null>(null);
  const [preEditClassSnapshot, setPreEditClassSnapshot] = useState<ClassModel | null>(null);
  const [preEditTemplateSnapshot, setPreEditTemplateSnapshot] = useState<Template | null>(null);

  const classesRef = useRef(classes);
  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  const applyClassesMutation = useCallback(
    (nextClasses: ClassModel[]) => {
      classesRef.current = nextClasses;
      mutateClasses(nextClasses);
    },
    [mutateClasses]
  );

  const activeClass = useMemo(
    () => classes.find((w) => w.id === activeClassId) || classes[0],
    [classes, activeClassId]
  );

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  // --- Class Selection ---
  const handleSelectClass = useCallback(
    (id: string) => {
      logger.debug('CLASS_OPERATIONS', `Selecting active class: ${id}`);
      setActiveClassId(id);
      setViewMode('class');
      setIsEditMode(false);
      // Decoupled LMS: Default to 'details-only' layout
      // TODO: Uncomment 'split' when AI / RAG services are reintegrated
      setLayoutMode('details-only');
      setPreviousLayoutMode('details-only');
    },
    [setActiveClassId, setViewMode, setIsEditMode, setLayoutMode, setPreviousLayoutMode]
  );

  const handleSelectTemplate = useCallback(
    (id: string) => {
      logger.debug('CLASS_OPERATIONS', `Selecting active template: ${id}`);
      setActiveTemplateId(id);
      setViewMode('template');
      setIsEditMode(false);
      setLayoutMode('details-only');
      setPreviousLayoutMode('details-only');
    },
    [setActiveTemplateId, setViewMode, setIsEditMode, setLayoutMode, setPreviousLayoutMode]
  );

  // --- Class Mutations ---
  // --- Class Mutations ---
  const handleCreateClass = useCallback(
    async (name: string, templateId?: string, instituteId?: string, forkMaterials: boolean = true) => {
      try {
        logger.info('CLASS_OPERATIONS', `Dispatch createClass: "${name}"`, { templateId, instituteId, forkMaterials });
        setProcessingMsg(`Creating class "${name}"...`);
        const matchedTemplate = templates.find((t) => t.id === templateId);

        const newClass = await classService.createClass({
          name,
          instituteId,
          subject: matchedTemplate ? matchedTemplate.subject : 'General Course Room',
          teachingStyle: matchedTemplate ? matchedTemplate.teachingStyle : ['Interactive'],
          experienceLevel: 'Advanced',
          specialNotes: matchedTemplate ? matchedTemplate.description : 'Welcome to your brand new class cohort.',
          assessmentPreferences: matchedTemplate ? matchedTemplate.assessmentPreferences : ['Multiple Choice'],
          materials: [],
          instructions: [],
        });

        if (matchedTemplate) {
          if (matchedTemplate.instructions && matchedTemplate.instructions.length > 0) {
            const createdInstructions = await Promise.all(
              matchedTemplate.instructions.map((inst) =>
                instructionService.createInstruction(newClass.id, inst as any)
              )
            );
            newClass.instructions = createdInstructions;
          }

          if (matchedTemplate.materialsPreset && matchedTemplate.materialsPreset.length > 0) {
            const createdMaterials = await Promise.all(
              matchedTemplate.materialsPreset.map((mat) =>
                materialService.duplicateMaterial(newClass.id, mat as any, forkMaterials)
              )
            );
            newClass.materials = createdMaterials;
          }
        }

        mutateClasses([newClass, ...classes]);
        setActiveClassId(newClass.id);
        setViewMode('class');
        setIsEditMode(false);
        // Decoupled LMS: Default to 'details-only' layout
        // TODO: Uncomment 'split' when AI / RAG services are reintegrated
        setLayoutMode('details-only');
        setPreviousLayoutMode('details-only');
        triggerToast(`Created classroom: "${name}"`);
      } catch (err: any) {
        logger.error('CLASS_OPERATIONS', `Failed to create class "${name}"`, err);
        triggerToast(`Error creating class: ${err.message}`);
      } finally {
        setProcessingMsg(null);
      }
    },
    [templates, classes, mutateClasses, setActiveClassId, setViewMode, setIsEditMode, setLayoutMode, setPreviousLayoutMode, triggerToast]
  );

  const handleRenameClass = useCallback(
    (id: string, newName: string) => {
      const snapshot = [...classesRef.current];
      logger.info('CLASS_OPERATIONS', `Dispatch renameClass: ${id} -> "${newName}"`);

      applyClassesMutation(
        snapshot.map((w) => (w.id === id ? { ...w, name: newName } : w))
      );

      classService
        .updateClass(id, { name: newName })
        .then(() => {
          triggerToast('Class rename successfully committed.');
        })
        .catch((err: unknown) => {
          logger.error('CLASS_OPERATIONS', `Failed to rename class ${id}`, err);
          applyClassesMutation(snapshot);
          const msg = err instanceof Error ? err.message : String(err);
          triggerToast(`Failed to rename: ${msg}`);
        });
    },
    [applyClassesMutation, triggerToast]
  );

  const handleDuplicateClass = useCallback(
    async (id: string) => {
      const target = classes.find((w) => w.id === id);
      if (!target) return;

      try {
        setProcessingMsg(`Duplicating class "${target.name}"...`);
        // Duplicate class settings with a clean slate roster (students is strictly empty)
        const duplicated = await classService.createClass({
          ...target,
          name: `${target.name} (Copy)`,
          instructions: [],
          materials: [],
        });

        if (target.instructions && target.instructions.length > 0) {
          const duplicatedInstructions = await Promise.all(
            target.instructions.map((inst) =>
              instructionService.createInstruction(duplicated.id, {
                title: inst.title,
                type: inst.type,
                content: inst.content,
              })
            )
          );
          duplicated.instructions = duplicatedInstructions;
        }

        if (target.materials && target.materials.length > 0) {
          const duplicatedMaterials = await Promise.all(
            target.materials.map((mat) =>
              materialService.forkMaterial(duplicated.id, mat)
            )
          );
          duplicated.materials = duplicatedMaterials;
        }

        applyClassesMutation([duplicated, ...classesRef.current]);
        setActiveClassId(duplicated.id);
        triggerToast('Duplicated classroom context (materials forked; student roster clean).');
      } catch (err: any) {
        triggerToast(`Failed to duplicate: ${err.message}`);
      } finally {
        setProcessingMsg(null);
      }
    },
    [classes, applyClassesMutation, setActiveClassId, triggerToast]
  );

  const handleArchiveClass = useCallback(
    (id: string) => {
      const snapshot = [...classesRef.current];
      const target = snapshot.find((w) => w.id === id);
      if (!target) return;
      const nextStatus = !target.isArchived;

      applyClassesMutation(
        snapshot.map((w) => (w.id === id ? { ...w, isArchived: nextStatus } : w))
      );
      triggerToast(nextStatus ? 'Archived classroom context.' : 'Restored classroom context.');

      classService
        .updateClass(id, { isArchived: nextStatus })
        .catch((err: unknown) => {
          applyClassesMutation(snapshot);
          const msg = err instanceof Error ? err.message : String(err);
          triggerToast(`Failed to archive: ${msg}`);
        });
    },
    [applyClassesMutation, triggerToast]
  );

  const handleDeleteClass = useCallback(
    async (id: string) => {
      try {
        await classService.deleteClass(id);
        const filtered = classesRef.current.filter((w) => w.id !== id);
        applyClassesMutation(filtered);
        if (activeClassId === id) {
          setActiveClassId(filtered[0]?.id || '');
        }
        triggerToast('Classroom portfolio permanently removed.');
      } catch (err: any) {
        triggerToast(`Failed to delete: ${err.message}`);
      }
    },
    [activeClassId, applyClassesMutation, setActiveClassId, triggerToast]
  );

  const handleUpdateClass = useCallback(
    (id: string, updatedFields: Partial<ClassModel>) => {
      const snapshot = [...classesRef.current];
      applyClassesMutation(
        snapshot.map((w) => (w.id === id ? { ...w, ...updatedFields } : w))
      );
      if (isEditMode) {
        return;
      }
      const hasPersistedClassColumn =
        updatedFields.name !== undefined ||
        updatedFields.instituteId !== undefined ||
        updatedFields.instituteName !== undefined ||
        updatedFields.academicYear !== undefined ||
        updatedFields.semester !== undefined ||
        updatedFields.subject !== undefined ||
        updatedFields.teacherName !== undefined ||
        updatedFields.teachingStyle !== undefined ||
        updatedFields.experienceLevel !== undefined ||
        updatedFields.specialNotes !== undefined ||
        updatedFields.assessmentPreferences !== undefined ||
        updatedFields.isArchived !== undefined ||
        (updatedFields as Record<string, unknown>).archived !== undefined;

      if (!hasPersistedClassColumn) {
        return;
      }

      classService
        .updateClass(id, updatedFields)
        .catch((err: unknown) => {
          applyClassesMutation(snapshot);
          const msg = err instanceof Error ? err.message : String(err);
          triggerToast(`Failed to update: ${msg}`);
        });
    },
    [isEditMode, applyClassesMutation, triggerToast]
  );

  // --- Templates Mutations ---
  const handleCreateTemplate = useCallback(
    async (tpl: Omit<Template, 'id'>) => {
      try {
        const newTpl = await templateService.createTemplate(tpl);
        mutateTemplates([newTpl, ...templates]);
        triggerToast(`Created lesson template: "${newTpl.name}"`);
      } catch (err: any) {
        triggerToast(`Error creating template: ${err.message}`);
      }
    },
    [templates, mutateTemplates, triggerToast]
  );

  const handleSaveCurrentAsTemplate = useCallback(async () => {
    if (!activeClass) return;
    try {
      const newTpl = await templateService.createTemplate({
        name: `${activeClass.name} Template`,
        description: `Saved from active class ${activeClass.name} with ${activeClass.materials.length} reference materials files.`,
        subject: activeClass.subject,
        teachingStyle: activeClass.teachingStyle,
        instructions: activeClass.instructions.map((i) => ({
          title: i.title,
          type: i.type,
          content: i.content,
        })),
        materialsPreset: activeClass.materials.map((m) => ({
          name: m.name,
          category: m.category,
          content: m.content,
          size: m.size,
          tags: m.tags,
        })),
      });

      mutateTemplates([newTpl, ...templates]);
      triggerToast('Saved active class roster settings as reusable template!');
    } catch (err: any) {
      triggerToast(`Failed to save template: ${err.message}`);
    }
  }, [activeClass, templates, mutateTemplates, triggerToast]);

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      try {
        await templateService.deleteTemplate(id);
        mutateTemplates(templates.filter((t) => t.id !== id));
        triggerToast('Template portfolio removed.');
      } catch (err: any) {
        triggerToast(`Failed to delete template: ${err.message}`);
      }
    },
    [templates, mutateTemplates, triggerToast]
  );

  // --- Materials Nested Operations ---
  const handleAddMaterialInClass = useCallback(
    async (wsId: string, mat: Omit<Material, 'id' | 'uploadDate'>, file?: File) => {
      // 1. Optimistic non-blocking flow for URL-only materials (no binary file)
      if (!file) {
        const tempId = crypto.randomUUID();
        const optimisticMat: Material = {
          ...mat,
          id: tempId,
          uploadDate: new Date().toISOString().split('T')[0],
          isPending: true,
        };

        applyClassesMutation(
          classesRef.current.map((w) =>
            w.id === wsId ? { ...w, materials: [...w.materials, optimisticMat] } : w
          )
        );

        const firstPath = mat.content && mat.content[0] ? mat.content[0].path : '';
        materialService
          .createLinkMaterial(wsId, {
            name: mat.name,
            url: firstPath || 'https://example.com',
            category: mat.category,
            tags: mat.tags,
            dueAt: mat.dueAt,
            maxScore: mat.maxScore,
          })
          .then((newMat) => {
            applyClassesMutation(
              classesRef.current.map((w) =>
                w.id === wsId
                  ? {
                      ...w,
                      materials: w.materials.map((m) =>
                        m.id === tempId ? { ...newMat, isPending: false } : m
                      ),
                    }
                  : w
              )
            );
            triggerToast('Uploaded course material committed successfully.');
          })
          .catch((err: unknown) => {
            applyClassesMutation(
              classesRef.current.map((w) =>
                w.id === wsId
                  ? { ...w, materials: w.materials.filter((m) => m.id !== tempId) }
                  : w
              )
            );
            const msg = err instanceof Error ? err.message : String(err);
            triggerToast(`Failed to upload material: ${msg}`);
          });
        return;
      }

      // 2. Blocking progress bar flow for binary file uploads
      try {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        setProcessingMsg(`Uploading "${mat.name}" (${sizeMb} MB)...`);
        const newMat = await materialService.uploadMaterial(wsId, file, {
          name: mat.name,
          category: mat.category,
          tags: mat.tags,
          dueAt: mat.dueAt,
          maxScore: mat.maxScore,
        });

        applyClassesMutation(
          classesRef.current.map((w) =>
            w.id === wsId ? { ...w, materials: [...w.materials, newMat] } : w
          )
        );
        triggerToast('Uploaded course material committed successfully.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        triggerToast(`Failed to upload material: ${msg}`);
      } finally {
        setProcessingMsg(null);
      }
    },
    [applyClassesMutation, triggerToast]
  );

  const handleDeleteMaterialInClass = useCallback(
    (wsId: string, matId: string, unlinkOnly: boolean = true) => {
      const snapshot = [...classesRef.current];
      applyClassesMutation(
        snapshot.map((w) =>
          w.id === wsId ? { ...w, materials: w.materials.filter((m) => m.id !== matId) } : w
        )
      );

      const op = unlinkOnly
        ? materialService.unlinkMaterialFromClass(wsId, matId)
        : materialService.deleteMaterial(matId);

      op.then(() => {
        triggerToast(unlinkOnly ? 'Removed material from class.' : 'Permanently deleted material.');
      }).catch((err: unknown) => {
        applyClassesMutation(snapshot);
        const msg = err instanceof Error ? err.message : String(err);
        triggerToast(`Failed to remove material: ${msg}`);
      });
    },
    [applyClassesMutation, triggerToast]
  );

  // --- Instructions Nested Operations ---
  const handleAddInstructionInClass = useCallback(
    (wsId: string, inst: Omit<Instruction, 'id'>) => {
      const tempId = crypto.randomUUID();
      const optimisticInst: Instruction = {
        ...inst,
        id: tempId,
        isPending: true,
      };

      applyClassesMutation(
        classesRef.current.map((w) =>
          w.id === wsId ? { ...w, instructions: [...w.instructions, optimisticInst] } : w
        )
      );

      instructionService
        .createInstruction(wsId, inst)
        .then((newInst) => {
          applyClassesMutation(
            classesRef.current.map((w) =>
              w.id === wsId
                ? {
                    ...w,
                    instructions: w.instructions.map((i) =>
                      i.id === tempId ? { ...newInst, isPending: false } : i
                    ),
                  }
                : w
            )
          );
          triggerToast('Saved custom prompting rubric.');
        })
        .catch((err: unknown) => {
          applyClassesMutation(
            classesRef.current.map((w) =>
              w.id === wsId
                ? { ...w, instructions: w.instructions.filter((i) => i.id !== tempId) }
                : w
            )
          );
          const msg = err instanceof Error ? err.message : String(err);
          triggerToast(`Failed to add instruction: ${msg}`);
        });
    },
    [applyClassesMutation, triggerToast]
  );

  const handleDeleteInstructionInClass = useCallback(
    (wsId: string, instId: string) => {
      const snapshot = [...classesRef.current];
      applyClassesMutation(
        snapshot.map((w) =>
          w.id === wsId
            ? { ...w, instructions: w.instructions.filter((i) => i.id !== instId) }
            : w
        )
      );

      instructionService
        .deleteInstruction(wsId, instId)
        .then(() => {
          triggerToast('Removed custom prompting rubric.');
        })
        .catch((err: unknown) => {
          applyClassesMutation(snapshot);
          const msg = err instanceof Error ? err.message : String(err);
          triggerToast(`Failed to delete instruction: ${msg}`);
        });
    },
    [applyClassesMutation, triggerToast]
  );

  // --- Adapter Handlers for Polymorphic ClassDetails ---
  const handleAdapterUpdate = useCallback(
    (id: string, updatedFields: Partial<ClassModel>) => {
      if (viewMode === 'class') {
        handleUpdateClass(id, updatedFields);
      } else {
        mutateTemplates(
          templates.map((t) => {
            if (t.id === id) {
              const update: Partial<Template> = {};
              if (updatedFields.subject !== undefined) update.subject = updatedFields.subject;
              if (updatedFields.teachingStyle !== undefined) update.teachingStyle = updatedFields.teachingStyle;
              if (updatedFields.specialNotes !== undefined) update.description = updatedFields.specialNotes;
              if (updatedFields.materials !== undefined) {
                update.materialsPreset = updatedFields.materials.map((m) => ({
                  name: m.name,
                  category: m.category || 'Study Material',
                  content: m.content || [],
                  size: m.size,
                  tags: m.tags,
                }));
              }
              if (updatedFields.instructions !== undefined) {
                update.instructions = updatedFields.instructions.map((i) => ({
                  title: i.title,
                  type: i.type,
                  content: i.content,
                }));
              }
              return { ...t, ...update };
            }
            return t;
          })
        );
      }
    },
    [viewMode, handleUpdateClass, templates, mutateTemplates]
  );

  const handleAdapterAddMaterial = useCallback(
    (id: string, mat: Omit<Material, 'id' | 'uploadDate'>, file?: File) => {
      if (viewMode === 'class') {
        handleAddMaterialInClass(id, mat, file);
      } else {
        mutateTemplates(
          templates.map((t) => {
            if (t.id === id) {
              return {
                ...t,
                materialsPreset: [
                  ...(t.materialsPreset || []),
                  {
                    name: mat.name,
                    category: mat.category || 'Study Material',
                    content: mat.content || [],
                    size: mat.size,
                    tags: mat.tags,
                  },
                ],
              };
            }
            return t;
          })
        );
        triggerToast('Added material to template.');
      }
    },
    [viewMode, handleAddMaterialInClass, templates, mutateTemplates, triggerToast]
  );

  const handleAdapterDeleteMaterial = useCallback(
    (id: string, matId: string) => {
      if (viewMode === 'class') {
        handleDeleteMaterialInClass(id, matId);
      } else {
        const idx = parseInt(matId.replace('mat-', ''), 10);
        mutateTemplates(
          templates.map((t) => {
            if (t.id === id) {
              return { ...t, materialsPreset: (t.materialsPreset || []).filter((_, i) => i !== idx) };
            }
            return t;
          })
        );
        triggerToast('Removed document from template.');
      }
    },
    [viewMode, handleDeleteMaterialInClass, templates, mutateTemplates, triggerToast]
  );

  const handleAdapterAddInstruction = useCallback(
    (id: string, inst: Omit<Instruction, 'id'>) => {
      if (viewMode === 'class') {
        handleAddInstructionInClass(id, inst);
      } else {
        mutateTemplates(
          templates.map((t) => {
            if (t.id === id) {
              return {
                ...t,
                instructions: [
                  ...t.instructions,
                  { title: inst.title, type: inst.type, content: inst.content },
                ],
              };
            }
            return t;
          })
        );
        triggerToast('Added custom prompting rubric to template.');
      }
    },
    [viewMode, handleAddInstructionInClass, templates, mutateTemplates, triggerToast]
  );

  const handleAdapterDeleteInstruction = useCallback(
    (id: string, instId: string) => {
      if (viewMode === 'class') {
        handleDeleteInstructionInClass(id, instId);
      } else {
        const idx = parseInt(instId.replace('inst-', ''), 10);
        mutateTemplates(
          templates.map((t) => {
            if (t.id === id) {
              return { ...t, instructions: t.instructions.filter((_, i) => i !== idx) };
            }
            return t;
          })
        );
        triggerToast('Removed instruction from template.');
      }
    },
    [viewMode, handleDeleteInstructionInClass, templates, mutateTemplates, triggerToast]
  );

  const adapterClassItem: ClassModel | null = useMemo(() => {
    if (viewMode === 'class' && activeClass) {
      return activeClass;
    }
    if (activeTemplate) {
      return {
        id: activeTemplate.id,
        name: activeTemplate.name,
        subject: activeTemplate.subject,
        teachingStyle: activeTemplate.teachingStyle,
        specialNotes: activeTemplate.description,
        experienceLevel: activeTemplate.experienceLevel || 'Beginner',
        academicYear: 'N/A',
        semester: 'N/A',
        teacherName: 'Template',
        assessmentPreferences: activeTemplate.assessmentPreferences || [],
        students: [],
        ragSessions: [],
        materials: (activeTemplate.materialsPreset || []).map((m, i) => ({
          ...m,
          id: `mat-${i}`,
          uploadDate: 'N/A',
        })),
        instructions: (activeTemplate.instructions || []).map((inst, i) => ({
          ...inst,
          id: `inst-${i}`,
        })),
      };
    }
    return null;
  }, [viewMode, activeClass, activeTemplate]);

  return {
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
    handleUpdateClass,
    handleCreateTemplate,
    handleSaveCurrentAsTemplate,
    handleDeleteTemplate,
    handleAdapterUpdate,
    handleAdapterAddMaterial,
    handleAdapterDeleteMaterial,
    handleAdapterAddInstruction,
    handleAdapterDeleteInstruction,
  };
}
