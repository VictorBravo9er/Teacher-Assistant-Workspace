import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elevated' | 'ghost';
  hover?: boolean;
}

export function Card({
  variant = 'surface',
  hover = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const variants = {
    surface: 'bg-surface border border-border-color shadow-sm',
    elevated: 'bg-elevated/50 border border-border-color/80 shadow-sm',
    ghost: 'bg-transparent border border-transparent',
  };

  const hoverStyle = hover
    ? 'hover:border-primary/40 hover:bg-elevated/40 transition-all cursor-pointer'
    : 'transition-colors';

  return (
    <div className={`rounded-2xl p-4 ${variants[variant]} ${hoverStyle} ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className = '', children, ...props }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between pb-3 border-b border-border-color/60 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  icon?: React.ReactNode;
}

export function CardTitle({ icon, className = '', children, ...props }: CardTitleProps) {
  return (
    <h4 className={`text-xs font-bold text-primary-text font-display flex items-center gap-2 ${className}`} {...props}>
      {icon && <span className="text-primary">{icon}</span>}
      {children}
    </h4>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div className={`space-y-3 pt-2 ${className}`} {...props}>
      {children}
    </div>
  );
}
