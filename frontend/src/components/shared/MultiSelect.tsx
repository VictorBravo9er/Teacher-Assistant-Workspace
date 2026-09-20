import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const removeOption = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== option));
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className="min-h-[38px] w-full bg-primary/5 border border-primary/30 rounded-md px-3 py-1.5 flex items-center justify-between cursor-pointer focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedValues.length === 0 ? (
            <span className="text-muted-text text-xs">{placeholder}</span>
          ) : (
            selectedValues.map((val) => (
              <span
                key={val}
                className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-primary/20"
              >
                {val}
                <button
                  onClick={(e) => removeOption(e, val)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-text shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-surface border border-border-color rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto overflow-x-hidden backdrop-blur-xl">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-text">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = selectedValues.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => toggleOption(option)}
                  className="px-3 py-2 text-xs text-primary-text hover:bg-elevated cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className={isSelected ? 'font-semibold text-primary' : ''}>{option}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
