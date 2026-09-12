import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, HelpCircle, Check, Loader2 } from 'lucide-react';
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
}

export function LoadingOverlay({ isOpen, message = 'Processing...' }: LoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary-text/20 backdrop-blur-[2px] flex items-center justify-center p-4 z-[9999] animate-fade-in transition-all duration-300">
      <div className="bg-surface border border-border-color rounded-2xl py-4 px-6 shadow-2xl flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-primary-text">{message}</p>
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
