import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Building2, Search, Loader2 } from 'lucide-react';
import { instituteService, InstituteSummary } from '@/services/instituteService';

export type Institute = InstituteSummary;

interface InstituteAutocompleteFieldProps {
  label: string;
  icon?: React.ReactNode;
  placeholder?: string;
  value: string; // The display string in the input
  onSelect: (institute: Institute | null) => void;
  onChangeDisplay: (val: string) => void;
  autoFocus?: boolean;
}

export function InstituteAutocompleteField({
  label,
  icon,
  placeholder = 'Type to search institutes...',
  value,
  onSelect,
  onChangeDisplay,
  autoFocus,
}: InstituteAutocompleteFieldProps) {
  const [directory, setDirectory] = useState<InstituteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load institutes directory on mount
  useEffect(() => {
    let isMounted = true;
    const loadDirectory = async () => {
      setIsLoading(true);
      try {
        const data = await instituteService.fetchInstitutes();
        if (isMounted) {
          setDirectory(data);
        }
      } catch (err) {
        console.error('Failed to load institutes directory:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDirectory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fast in-memory multi-token fuzzy matching
  const filteredInstitutes = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      // If input is empty and focused, show first 10 institutes
      return directory.slice(0, 10);
    }

    const tokens = query.split(/\s+/).filter(Boolean);
    return directory
      .filter((inst) => {
        const target = `${inst.name} ${inst.city || ''} ${inst.district || ''} ${inst.state || ''} ${inst.country || ''}`.toLowerCase();
        return tokens.every((token) => target.includes(token));
      })
      .slice(0, 15);
  }, [directory, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredInstitutes.length === 0) {
      if (e.key === 'ArrowDown') {
        setShowDropdown(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredInstitutes.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredInstitutes.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredInstitutes.length) {
        e.preventDefault();
        const selected = filteredInstitutes[highlightedIndex];
        onChangeDisplay(selected.name);
        onSelect(selected);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[10px] font-semibold text-muted-text uppercase tracking-wider">
          {label}
        </label>
        {isLoading && (
          <span className="text-[10px] text-muted-text flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" /> Loading directory...
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text flex items-center justify-center pointer-events-none">
          {icon || <Search className="w-3.5 h-3.5" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChangeDisplay(e.target.value);
            onSelect(null); // Reset selected ID when user edits string
            setShowDropdown(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-surface border border-border-color rounded-xl py-2 pl-8 pr-8 text-xs focus:outline-none focus:border-primary transition-all text-primary-text"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChangeDisplay('');
              onSelect(null);
              setShowDropdown(true);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-text hover:text-primary-text p-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-20 w-full mt-1.5 bg-surface border border-border-color rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-48 overflow-y-auto divide-y divide-border-color/40">
            {filteredInstitutes.length > 0 ? (
              filteredInstitutes.map((res, idx) => {
                const locationParts = [res.city, res.district, res.state].filter(Boolean);
                const isSelected = idx === highlightedIndex;
                return (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => {
                      onChangeDisplay(res.name);
                      onSelect(res);
                      setShowDropdown(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-elevated/80'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-text" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-primary-text truncate font-display">
                        {res.name}
                      </div>
                      {locationParts.length > 0 && (
                        <div className="text-[10px] text-muted-text truncate mt-0.5">
                          {locationParts.join(', ')}
                          {res.type ? ` • ${res.type}` : ''}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-3 text-center text-xs text-muted-text">
                {isLoading ? 'Loading institutes directory...' : 'No matching institutes found.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
