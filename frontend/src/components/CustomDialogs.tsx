import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, HelpCircle, X, Check } from 'lucide-react';

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
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div 
        className="bg-surface border border-border-color rounded-2xl max-w-sm w-full p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-xl shrink-0 ${isDestructive ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
            {isDestructive ? <AlertCircle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary-text font-display leading-tight">{title}</h3>
            <p className="text-xs text-secondary-text mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-elevated transition-colors cursor-pointer border border-transparent hover:border-border-color"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
              isDestructive 
                ? 'bg-error hover:bg-error/90 shadow-[0_2px_8px_rgba(239,68,68,0.3)]' 
                : 'bg-primary hover:bg-primary/90 shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
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
  defaultValue = "",
  placeholder = "Enter value...",
  submitText = "Submit",
  cancelText = "Cancel",
  onSubmit,
  onCancel
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
    <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div 
        className="bg-surface border border-border-color rounded-2xl max-w-sm w-full p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onCancel}
          className="absolute right-3 top-3 p-1 rounded-lg text-muted-text hover:text-primary-text hover:bg-elevated transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-semibold text-primary-text font-display pr-6">{title}</h3>
        {message && (
          <p className="text-xs text-secondary-text mt-1.5">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-elevated/50 border border-border-color rounded-lg px-3 py-2 text-xs text-primary-text placeholder-muted-text focus:outline-none focus:border-primary transition-colors"
          />

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-elevated transition-colors cursor-pointer border border-transparent hover:border-border-color"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
            >
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
