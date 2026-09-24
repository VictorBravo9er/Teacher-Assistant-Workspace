import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, HelpCircle, Check, Loader2 } from 'lucide-react';
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
  showProgressBar?: boolean;
  progress?: number;
}

export function LoadingOverlay({
  isOpen,
  message = 'Processing...',
  subMessage,
  showProgressBar = false,
  progress,
}: LoadingOverlayProps) {
  const [simulatedProgress, setSimulatedProgress] = useState(15);

  useEffect(() => {
    if (!isOpen || !showProgressBar) {
      setSimulatedProgress(15);
      return;
    }
    const timer = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(92, Math.round(prev + Math.max(2, (92 - prev) * 0.15)));
      });
    }, 350);
    return () => clearInterval(timer);
  }, [isOpen, showProgressBar]);

  if (!isOpen) return null;

  const displayProgress = progress !== undefined ? progress : simulatedProgress;

  return (
    <div className="fixed inset-0 bg-primary-text/25 backdrop-blur-[2.5px] flex items-center justify-center p-4 z-[9999] animate-fade-in transition-all duration-300">
      <div className="bg-surface border border-border-color rounded-2xl py-5 px-7 shadow-2xl flex flex-col items-center gap-3.5 max-w-md w-full text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary-text">{message}</p>
          {subMessage && (
            <p className="text-xs text-muted-text leading-relaxed">{subMessage}</p>
          )}
        </div>
        {showProgressBar && (
          <div className="w-full space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-text px-0.5">
              <span className="animate-pulse text-primary font-semibold">Transferring...</span>
              <span>{displayProgress}%</span>
            </div>
            <div className="w-full h-2 bg-elevated rounded-full overflow-hidden border border-border-color/60">
              <div
                className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-muted-text pt-0.5">
              Please wait and do not close this window until the operation completes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isDestructive ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
            }`}
          >
            {isDestructive ? <AlertCircle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary-text font-display leading-tight">
              {title}
            </h3>
            <p className="text-xs text-secondary-text mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <Button variant="ghost" size="xs" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="xs"
            onClick={onConfirm}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  isOpen,
  title,
  message,
  defaultValue = '',
  placeholder = 'Enter value...',
  submitText = 'Submit',
  cancelText = 'Cancel',
  onSubmit,
  onCancel,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <ModalHeader title={title} onClose={onCancel} />
      <form onSubmit={handleSubmit}>
        <ModalBody className="p-5 space-y-3">
          {message && <p className="text-xs text-secondary-text">{message}</p>}
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
        </ModalBody>
        <ModalFooter className="p-4">
          <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button type="submit" variant="primary" size="xs" disabled={!value.trim()}>
            {submitText}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
