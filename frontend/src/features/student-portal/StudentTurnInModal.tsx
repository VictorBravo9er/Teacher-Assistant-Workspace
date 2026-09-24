import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Material, StudentSubmission } from '@/types/main';
import { studentPortalService } from '@/services/studentPortalService';
import { notificationService } from '@/services/notificationService';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, File, X, Loader2 } from 'lucide-react';

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
  const [uploadProgress, setUploadProgress] = useState(15);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSubmitting || submissionMode !== 'file') {
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
  }, [isSubmitting, submissionMode]);

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

    // 1. Optimistic non-blocking flow for pure text responses
    if (submissionMode === 'text') {
      const trimmedText = textContent.trim();
      const tempId = existingSubmission?.id || crypto.randomUUID();
      const optimisticSub: StudentSubmission = {
        id: tempId,
        classId,
        studentId,
        materialId: material.id,
        materialName: material.name,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
        content: [
          {
            id: crypto.randomUUID(),
            name: `${material.name} (Text Response)`,
            type: 'Text',
            value: trimmedText,
            path: '',
          },
        ],
      };

      onSubmitted(optimisticSub);
      onClose();
      setTextContent('');

      studentPortalService
        .submitAssignment(classId, material.id, studentId, { text: trimmedText })
        .then((saved) => {
          notificationService.notifySubmission(saved.id, classId).catch(() => {});
          onSubmitted(saved);
        })
        .catch(() => {});
      return;
    }

    // 2. Blocking progress bar flow for binary file uploads
    try {
      setIsSubmitting(true);
      const submission = await studentPortalService.submitAssignment(
        classId,
        material.id,
        studentId,
        {
          file: file || undefined,
        }
      );
      setUploadProgress(100);
      notificationService.notifySubmission(submission.id, classId).catch(() => {});
      onSubmitted(submission);
      onClose();
      setFile(null);
      setTextContent('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit assignment. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} size="md">
      <ModalHeader
        title={`Turn In: ${material.name}`}
        subtitle={`Submit your work for ${material.category}${material.dueAt ? ` • Due: ${new Date(material.dueAt).toLocaleDateString()}` : ''}`}
        onClose={() => !isSubmitting && onClose()}
      />

      <ModalBody className="space-y-4 relative">
        {isSubmitting && submissionMode === 'file' && (
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-[2px] z-20 rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-3 animate-fade-in">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-primary-text">
                Uploading {file?.name || 'Document'}...
              </p>
              <p className="text-xs text-muted-text">
                {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : ''} • Transferring binary file to classroom storage vault
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
