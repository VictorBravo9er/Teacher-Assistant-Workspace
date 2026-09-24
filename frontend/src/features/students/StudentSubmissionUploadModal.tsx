import React, { useState, useEffect } from 'react';
import {
  Student,
  Material,
  StudentSubmission,
  ContentItem,
} from '@/types/main';
import { studentService } from '@/services/studentService';
import {
  UploadCloud,
  FileText,
  Link as LinkIcon,
  Check,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, FormField, Input, Textarea } from '@/components/ui';

interface StudentSubmissionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  student: Student;
  materials: Material[];
  onSubmissionCreated: (studentId: string, submission: StudentSubmission) => void;
  onTriggerToast?: (msg: string) => void;
}

export default function StudentSubmissionUploadModal({
  isOpen,
  onClose,
  classId,
  student,
  materials,
  onSubmissionCreated,
  onTriggerToast,
}: StudentSubmissionUploadModalProps) {
  const [mode, setMode] = useState<'file' | 'url' | 'text'>('file');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(
    materials.find((m) => m.toBeScored)?.id || (materials[0]?.id || '')
  );
  const [customTitle, setCustomTitle] = useState('');
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [textContent, setTextContent] = useState('');
  const [status, setStatus] = useState<'Submitted' | 'Pending'>('Submitted');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(15);

  useEffect(() => {
    if (!isSubmitting || mode !== 'file') {
      setUploadProgress(15);
      return;
    }
    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(92, Math.round(prev + Math.max(2, (92 - prev) * 0.16)));
      });
    }, 350);
    return () => clearInterval(timer);
  }, [isSubmitting, mode]);

  if (!isOpen) return null;

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
  const displayTitle = selectedMaterial ? selectedMaterial.name : customTitle || 'Untitled Assignment';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Optimistic non-blocking flow for URL or Text entries
    if (mode === 'url' || mode === 'text') {
      const itemId = crypto.randomUUID();
      const contentItems: ContentItem[] =
        mode === 'url'
          ? [
              {
                id: itemId,
                name: displayTitle,
                type: 'URL',
                value: urlInput.trim() || 'https://docs.google.com/document/d/example',
                path: urlInput.trim() || 'https://docs.google.com/document/d/example',
                description: `Online link submission`,
              },
            ]
          : [
              {
                id: itemId,
                name: `${displayTitle} (Text Excerpt)`,
                type: 'Text',
                value: textContent.trim(),
                path: '',
                description: textContent.trim() || 'Student provided written answers directly.',
              },
            ];

      const optimisticSub: StudentSubmission = {
        id: crypto.randomUUID(),
        classId,
        studentId: student.id,
        materialId: selectedMaterialId || undefined,
        materialName: displayTitle,
        content: contentItems,
        status: status,
        submittedAt: new Date().toISOString(),
      };

      onSubmissionCreated(student.id, optimisticSub);
      if (onTriggerToast) onTriggerToast(`Logged submission for ${student.name}`);
      onClose();

      studentService
        .createStudentSubmission(classId, student.id, {
          materialId: selectedMaterialId || undefined,
          content: contentItems,
          status: status,
          dueAt: selectedMaterial?.dueAt || new Date().toISOString(),
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (onTriggerToast) onTriggerToast(`Failed to persist submission: ${msg}`);
        });
      return;
    }

    // 2. Blocking progress bar flow for binary file uploads
    if (!fileObj) {
      if (onTriggerToast) onTriggerToast('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileName = fileObj.name;
      const targetMaterialId = selectedMaterialId || crypto.randomUUID();
      const { itemId, storagePath } = await studentService.uploadSubmissionFile(targetMaterialId, fileObj);

      const contentItems: ContentItem[] = [
        {
          id: itemId,
          name: fileName,
          type: 'File',
          value: fileName,
          path: storagePath,
          description: `Student turn-in document for ${displayTitle}`,
        },
      ];

      const created = await studentService.createStudentSubmission(classId, student.id, {
        materialId: selectedMaterialId || undefined,
        content: contentItems,
        status: status,
        dueAt: selectedMaterial?.dueAt || new Date().toISOString(),
      });

      setUploadProgress(100);
      const enriched: StudentSubmission = {
        ...created,
        materialName: displayTitle,
      };

      onSubmissionCreated(student.id, enriched);
      if (onTriggerToast) onTriggerToast(`Logged submission for ${student.name}`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (onTriggerToast) onTriggerToast(`Failed to upload submission: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} id="student-submission-upload-modal" size="md">
      <ModalHeader
        title="Log Student Submission"
        subtitle={`Student: ${student.name} (${student.rollNumber || 'M10'})`}
        icon={<UploadCloud className="w-5 h-5 text-success" />}
        onClose={() => !isSubmitting && onClose()}
      />

      <form onSubmit={handleSubmit}>
        <ModalBody className="p-6 space-y-4 relative">
          {isSubmitting && mode === 'file' && (
            <div className="absolute inset-0 bg-surface/90 backdrop-blur-[2px] z-20 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-3 animate-fade-in">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-primary-text">
                  Uploading {fileObj?.name || 'Document'}...
                </p>
                <p className="text-xs text-muted-text">
                  {fileObj ? `${(fileObj.size / (1024 * 1024)).toFixed(2)} MB` : ''} • Transferring binary file to classroom storage vault
                </p>
              </div>
              <div className="w-full max-w-xs space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-primary font-semibold">
                  <span className="animate-pulse">Uploading bytes...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-elevated rounded-full overflow-hidden border border-border-color/60">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-muted-text pt-1">
                  Please wait and do not close this window until completion.
                </p>
              </div>
            </div>
          )}
          <FormField label="Select Class Assignment / Material">
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="w-full bg-elevated/60 border border-border-color rounded-xl p-2.5 text-xs text-primary-text outline-none focus:border-primary cursor-pointer shadow-sm"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category}) {m.toBeScored ? `• Max ${m.maxScore || 100} pts` : ''}
                </option>
              ))}
              <option value="">+ Custom / Unlinked Submission</option>
            </select>
          </FormField>

          {!selectedMaterialId && (
            <FormField label="Assignment Title">
              <Input
                required
                placeholder="e.g. Chapter 4 Polynomials Worksheet"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </FormField>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-text uppercase font-bold block">
              Submission Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'file'
                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                    : 'bg-elevated/40 border-border-color text-secondary-text hover:text-primary-text'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'url'
                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                    : 'bg-elevated/40 border-border-color text-secondary-text hover:text-primary-text'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Web URL
              </button>
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'text'
                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                    : 'bg-elevated/40 border-border-color text-secondary-text hover:text-primary-text'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Text Excerpt
              </button>
            </div>
          </div>

          {mode === 'file' && (
            <div className="space-y-2">
              <div className="border border-dashed border-border-color hover:border-primary/50 rounded-2xl p-4 text-center space-y-2 bg-elevated/30 transition-colors">
                <input
                  type="file"
                  id="submission-file-input"
                  onChange={(e) => setFileObj(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                />
                <label htmlFor="submission-file-input" className="cursor-pointer block space-y-1">
                  <UploadCloud className="w-7 h-7 text-primary mx-auto" />
                  <span className="text-xs font-bold text-primary block">
                    {fileObj ? fileObj.name : 'Choose File to Attach'}
                  </span>
                  <span className="text-[10px] text-muted-text font-mono block">
                    {fileObj
                      ? `${(fileObj.size / 1024).toFixed(1)} KB`
                      : 'PDF, Word, Images, Scanned Homework Sheets'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {mode === 'url' && (
            <FormField label="External Google Doc / GitHub / Resource URL">
              <Input
                type="url"
                required
                placeholder="https://docs.google.com/document/d/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </FormField>
          )}

          {mode === 'text' && (
            <FormField label="Typed Student Response / Transcribed Calculations">
              <Textarea
                rows={4}
                required
                placeholder="Paste or transcribe student answer text here for teacher review and grading..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
            </FormField>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border-color">
            <span className="text-xs font-medium text-secondary-text">Initial State:</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-secondary-text cursor-pointer">
                <input
                  type="radio"
                  name="sub-status"
                  value="Submitted"
                  checked={status === 'Submitted'}
                  onChange={() => setStatus('Submitted')}
                  className="accent-primary"
                />
                Submitted (Ready to grade)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-secondary-text cursor-pointer">
                <input
                  type="radio"
                  name="sub-status"
                  value="Pending"
                  checked={status === 'Pending'}
                  onChange={() => setStatus('Pending')}
                  className="accent-primary"
                />
                Pending Review
              </label>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="p-4">
          <Button type="button" variant="ghost" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Confirm Submission
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
