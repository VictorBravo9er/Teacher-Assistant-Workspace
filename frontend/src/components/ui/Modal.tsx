import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-full h-full rounded-none',
};

export function Modal({
  isOpen,
  onClose,
  id,
  size = 'md',
  children,
  className = '',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id={id ? `${id}-overlay` : undefined}
      className="fixed inset-0 bg-primary-text/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div
        id={id}
        className={`bg-surface border border-border-color rounded-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-w-none print:h-auto print:max-h-none print:w-full ${
          sizeMap[size]
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export interface ModalHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClose?: () => void;
  closeId?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ModalHeader({
  title,
  subtitle,
  icon,
  badge,
  onClose,
  closeId,
  className = '',
  children,
}: ModalHeaderProps) {
  return (
    <div
      className={`p-5 border-b border-border-color bg-elevated/40 flex items-center justify-between shrink-0 print:hidden ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-primary-text font-display">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-secondary-text mt-0.5 font-medium">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {children}
        {onClose && (
          <button
            id={closeId}
            onClick={onClose}
            className="p-1.5 hover:bg-elevated text-muted-text hover:text-primary-text rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export interface ModalBodyProps {
  className?: string;
  children: React.ReactNode;
}

export function ModalBody({ className = '', children }: ModalBodyProps) {
  return <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${className}`}>{children}</div>;
}

export interface ModalFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function ModalFooter({ className = '', children }: ModalFooterProps) {
  return (
    <div
      className={`p-4 border-t border-border-color bg-elevated/40 flex items-center justify-end gap-2 shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}
