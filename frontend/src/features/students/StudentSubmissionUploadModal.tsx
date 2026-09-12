import React, { useState } from 'react';
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
  if (!isOpen) return null;

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

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
  const displayTitle = selectedMaterial ? selectedMaterial.name : customTitle || 'Untitled Assignment';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let contentItems: ContentItem[] = [];

      if (mode === 'file') {
        if (!fileObj) {
          if (onTriggerToast) onTriggerToast('Please select a file to upload.');
          setIsSubmitting(false);
          return;
        }

        const fileName = fileObj.name;
        const targetMaterialId = selectedMaterialId || crypto.randomUUID();
        const { itemId, storagePath } = await studentService.uploadSubmissionFile(targetMaterialId, fileObj);

        contentItems = [
          {
            id: itemId,
            name: fileName,
            type: 'File',
            value: fileName,
            path: storagePath,
            description: `Student turn-in document for ${displayTitle}`,
          },
        ];
      } else if (mode === 'url') {
        const itemId = crypto.randomUUID();
        const finalUrl = urlInput.trim() || 'https://docs.google.com/document/d/example';
        contentItems = [
          {
            id: itemId,
            name: displayTitle,
            type: 'URL',
            value: finalUrl,
            path: finalUrl,
            description: `Online link submission: ${finalUrl}`,
          },
        ];
      } else {
        const itemId = crypto.randomUUID();
        contentItems = [
          {
            id: itemId,
            name: `${displayTitle} (Text Excerpt)`,
            type: 'File' as any,
            value: `${displayTitle}.txt`,
            path: `text://${itemId}`,
            description: textContent.trim() || 'Student provided written answers directly.',
          },
        ];
      }

      const created = await studentService.createStudentSubmission(classId, student.id, {
        materialId: selectedMaterialId || undefined,
        content: contentItems,
        status: status,
        dueAt: selectedMaterial?.dueAt || new Date().toISOString(),
      });

      const enriched: StudentSubmission = {
        ...created,
        materialName: displayTitle,
      };

      onSubmissionCreated(student.id, enriched);
      if (onTriggerToast) onTriggerToast(`Logged submission for ${student.name}`);
      onClose();
    } catch (err: any) {
      if (onTriggerToast) onTriggerToast(`Failed to upload submission: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="student-submission-upload-modal" size="md">
      <ModalHeader
        title="Log Student Submission"
        subtitle={`Student: ${student.name} (${student.rollNumber || 'M10'})`}
        icon={<UploadCloud className="w-5 h-5 text-success" />}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <ModalBody className="p-6 space-y-4">
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
