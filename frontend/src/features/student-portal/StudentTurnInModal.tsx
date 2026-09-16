import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Material, StudentSubmission } from '@/types/main';
import { studentPortalService } from '@/services/studentPortalService';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, File, X } from 'lucide-react';

interface StudentTurnInModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  classId: string;
  studentId: string;
  existingSubmission?: StudentSubmission | null;
  onSubmitted: (submission: StudentSubmission) => void;
}

export function StudentTurnInModal({
  isOpen,
  onClose,
  material,
  classId,
  studentId,
  existingSubmission,
  onSubmitted,
}: StudentTurnInModalProps) {
  const [submissionMode, setSubmissionMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!material) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 50 * 1024 * 1024) {
        setErrorMsg('File size exceeds maximum allowed 50MB.');
        return;
      }
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.size > 50 * 1024 * 1024) {
        setErrorMsg('File size exceeds maximum allowed 50MB.');
        return;
      }
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (submissionMode === 'file' && !file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    if (submissionMode === 'text' && !textContent.trim()) {
      setErrorMsg('Please enter your written response.');
      return;
    }

    try {
      setIsSubmitting(true);
      const submission = await studentPortalService.submitAssignment(
        classId,
        material.id,
        studentId,
        {
          file: submissionMode === 'file' ? file || undefined : undefined,
          text: submissionMode === 'text' ? textContent.trim() : undefined,
        }
      );
      onSubmitted(submission);
      onClose();
      // Reset state
      setFile(null);
      setTextContent('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        title={`Turn In: ${material.name}`}
        subtitle={`Submit your work for ${material.category}${material.dueAt ? ` • Due: ${new Date(material.dueAt).toLocaleDateString()}` : ''}`}
        onClose={onClose}
      />

      <ModalBody className="space-y-4">
        {existingSubmission && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-primary-text block">Previously Submitted</span>
              <span className="text-muted-text">
                Submitting again will update your submission record. Current status:{' '}
                <strong>{existingSubmission.status}</strong>
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-2xl p-3 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submission Mode Toggle */}
        <div className="flex bg-elevated rounded-xl p-1 border border-border-color">
          <button
            type="button"
            onClick={() => {
              setSubmissionMode('file');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              submissionMode === 'file'
                ? 'bg-surface text-primary shadow-sm font-bold'
                : 'text-muted-text hover:text-primary-text'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Attach File
          </button>
          <button
            type="button"
            onClick={() => {
              setSubmissionMode('text');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              submissionMode === 'text'
                ? 'bg-surface text-primary shadow-sm font-bold'
                : 'text-muted-text hover:text-primary-text'
            }`}
          >
            <FileText className="w-4 h-4" />
            Written Response
          </button>
        </div>

        {/* File Upload Tab */}
        {submissionMode === 'file' && (
          <div className="space-y-3">
            {!file ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border-color hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-primary-text">
                  Click or drag and drop your submission file
                </span>
                <span className="text-[11px] text-muted-text mt-1">
                  PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG (up to 50MB)
                </span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.png,.jpg,.jpeg"
                />
              </label>
            ) : (
              <div className="bg-surface border border-border-color rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-primary-text block truncate">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-muted-text">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 rounded-lg hover:bg-elevated text-muted-text hover:text-danger transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Written Response Tab */}
        {submissionMode === 'text' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-text">
              <span>Write your response below:</span>
              <div className="flex items-center gap-2 font-mono">
                <Badge variant="neutral">{wordCount} words</Badge>
                <Badge variant="neutral">{charCount} chars</Badge>
              </div>
            </div>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type or paste your complete assignment response here..."
              rows={8}
              className="w-full bg-elevated/50 border border-border-color focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-2xl p-3 text-xs text-primary-text leading-relaxed font-sans resize-none transition-all outline-none"
            />
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
        >
          {isSubmitting ? 'Turning in...' : 'Turn In Assignment'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
