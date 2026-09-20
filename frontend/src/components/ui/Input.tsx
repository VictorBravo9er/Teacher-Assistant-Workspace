import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, error, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text flex items-center justify-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-elevated/60 border ${
            error ? 'border-error/50 focus:border-error' : 'border-border-color focus:border-primary'
          } rounded-xl py-2 ${icon ? 'pl-9' : 'px-3'} pr-3 text-xs text-primary-text placeholder-muted-text outline-none transition-all shadow-sm focus:ring-1 focus:ring-primary/20 ${className}`}
          {...props}
        />
        {error && <p className="text-[10px] text-error font-medium mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={`w-full bg-elevated/60 border ${
            error ? 'border-error/50 focus:border-error' : 'border-border-color focus:border-primary'
          } rounded-xl p-3 text-xs text-primary-text placeholder-muted-text outline-none transition-all resize-none shadow-sm focus:ring-1 focus:ring-primary/20 leading-relaxed ${className}`}
          {...props}
        />
        {error && <p className="text-[10px] text-error font-medium mt-1">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface FormFieldProps {
  label?: string;
  sublabel?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, sublabel, error, className = '', children }: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase font-bold text-muted-text tracking-wider block">
            {label}
          </label>
          {sublabel && <span className="text-[10px] text-muted-text font-mono">{sublabel}</span>}
        </div>
      )}
      {children}
      {error && <p className="text-[10px] text-error font-medium mt-0.5">{error}</p>}
    </div>
  );
}
