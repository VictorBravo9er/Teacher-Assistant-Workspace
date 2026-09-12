import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'ghost'
  | 'outline'
  | 'subtle';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 border border-transparent',
  secondary:
    'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 shadow-sm',
  success:
    'bg-success hover:bg-success/90 text-white shadow-md shadow-success/20 border border-transparent',
  danger:
    'bg-error hover:bg-error/90 text-white shadow-md shadow-error/20 border border-transparent',
  ghost:
    'hover:bg-elevated text-muted-text hover:text-primary-text border border-transparent',
  outline:
    'bg-transparent hover:bg-elevated border border-border-color text-secondary-text hover:text-primary-text shadow-sm',
  subtle:
    'bg-elevated/60 hover:bg-elevated border border-border-color text-secondary-text hover:text-primary-text shadow-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] font-semibold rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-xl gap-1.5',
  md: 'px-4 py-2 text-xs font-semibold rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-sm font-bold rounded-xl gap-2',
  icon: 'p-1.5 rounded-lg text-xs',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-sans transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${base} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
