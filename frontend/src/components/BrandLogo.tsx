import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  subtitle?: string;
  onClick?: () => void;
}

export default function BrandLogo({
  size = 'md',
  className = '',
  showText = true,
  subtitle,
  onClick,
}: BrandLogoProps) {
  const sizeMap = {
    sm: {
      svg: 'w-7 h-7',
      title: 'text-base',
      sub: 'text-[9px]',
    },
    md: {
      svg: 'w-9 h-9',
      title: 'text-xl',
      sub: 'text-[10px]',
    },
    lg: {
      svg: 'w-12 h-12',
      title: 'text-3xl',
      sub: 'text-xs',
    },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      <img
        src="/logo.svg"
        alt="Teach&Learn Logo"
        className={`${sizeMap.svg} shrink-0`}
      />
      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`${sizeMap.title} font-bold font-display tracking-tight text-primary-text leading-none`}
          >
            Teach<span className="text-primary">&</span>Learn
          </span>
          {subtitle && (
            <span
              className={`${sizeMap.sub} text-primary/80 font-mono font-bold uppercase tracking-wider mt-0.5`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
