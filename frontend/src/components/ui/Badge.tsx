import React from 'react';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  mono?: boolean;
}

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  primary: {
    badge: 'bg-primary/15 border-primary/30 text-primary',
    dot: 'bg-primary',
  },
  secondary: {
    badge: 'bg-secondary/15 border-secondary/30 text-secondary',
    dot: 'bg-secondary',
  },
  success: {
    badge: 'bg-success/15 border-success/30 text-success',
    dot: 'bg-success',
  },
  warning: {
    badge: 'bg-warning/15 border-warning/30 text-warning',
    dot: 'bg-warning',
  },
  error: {
    badge: 'bg-error/15 border-error/30 text-error',
    dot: 'bg-error',
  },
  neutral: {
    badge: 'bg-elevated border-border-color text-muted-text',
    dot: 'bg-muted-text',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[9px] px-1.5 py-0.2 rounded-full gap-1',
  md: 'text-[10px] px-2 py-0.5 rounded-full gap-1.5',
};

export function Badge({
  variant = 'primary',
  size = 'md',
  dot = false,
  mono = true,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center font-semibold border ${mono ? 'font-mono' : 'font-sans'} ${styles.badge} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      {children}
    </span>
  );
}
