import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export interface Institute {
  id: string;
  name: string;
  type: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

interface InstituteAutocompleteFieldProps {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string; // The display string in the input
  onSelect: (institute: Institute | null) => void;
  onChangeDisplay: (val: string) => void;
}

export function InstituteAutocompleteField({ label, icon, placeholder, value, onSelect, onChangeDisplay }: InstituteAutocompleteFieldProps) {
  const [results, setResults] = useState<Institute[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (value.length < 2) {
        setResults([]);
        return;
      }
      // Call the search_institutes RPC
      const { data, error } = await supabase.rpc('search_institutes', { search_term: value });
      if (!error && data) {
        setResults(data as Institute[]);
      }
    };
    
    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[10px] font-semibold text-muted-text mb-1 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text flex items-center justify-center">
          {icon}
        </div>
        <input 
          type="text"
          value={value}
          onChange={e => {
            onChangeDisplay(e.target.value);
            onSelect(null); // Clear selected ID when they type
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (value.length >= 2) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full bg-surface border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-primary transition-all text-primary-text"
        />
      </div>
      
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-border-color rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-40 overflow-y-auto">
            {results.map((res) => (
              <button
                key={res.id}
                type="button"
                onClick={() => {
                  onChangeDisplay(res.name);
                  onSelect(res);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors border-b border-border-color/50 last:border-0 cursor-pointer"
              >
                <div className="font-semibold text-primary-text truncate">{res.name}</div>
                <div className="text-[10px] text-muted-text truncate mt-0.5">
                  {res.district ? `${res.district}, ` : ''}{res.state}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
