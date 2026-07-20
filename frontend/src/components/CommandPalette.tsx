import React, { useState, useEffect, useRef } from 'react';
import { ClassModel, Student } from '../types';
import { Search, Sparkles, User, Settings, FolderClosed, Terminal, Minimize, BookOpen } from 'lucide-react';

interface CommandPaletteProps {
  classes: ClassModel[];
  activeClass: ClassModel;
  onSelectClass: (id: string) => void;
  onOpenStudent: (id: string) => void;
  onToggleFocusMode: (focus: boolean) => void;
  isFocusMode: boolean;
  onTriggerToast: (text: string) => void;
}

export default function CommandPalette({
  classes,
  activeClass,
  onSelectClass,
  onOpenStudent,
  onToggleFocusMode,
  isFocusMode,
  onTriggerToast
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const commandPaletteRef = useRef<HTMLDivElement | null>(null);

  // Keyboard binding for CMD/CTRL + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter rosters matches
  const filteredStudents = activeClass.students?.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) || 
    s.rollNumber.toLowerCase().includes(query.toLowerCase())
  ) || [];

  const filteredClasses = classes.filter(w => 
    w.name.toLowerCase().includes(query.toLowerCase()) ||
    w.subject.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectClass = (id: string) => {
    onSelectClass(id);
    setIsOpen(false);
    setQuery('');
    onTriggerToast(`Switched active class context.`);
  };

  const handleSelectStudent = (id: string) => {
    onOpenStudent(id);
    setIsOpen(false);
    setQuery('');
  };

  const handleToggleFocus = () => {
    onToggleFocusMode(!isFocusMode);
    setIsOpen(false);
    onTriggerToast(isFocusMode ? "Restored full classItem widgets" : "Entered immersive Focus Mode");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-md flex items-start justify-center pt-[15vh] px-4 z-50 animate-fade-in" onClick={() => setIsOpen(false)}>
      <div 
        ref={commandPaletteRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border-color rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
      >
        
        {/* Input Bar */}
        <div className="p-4 border-b border-border-color flex items-center gap-3">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input 
            type="text" 
            placeholder="Type a command or student name... (e.g. Sofia, Focus, Physics)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-primary-text outline-none placeholder-muted-text"
            autoFocus
          />
          <span className="text-[10px] font-mono bg-elevated text-muted-text px-2 py-0.5 border border-border-color rounded-md">
            ESC
          </span>
        </div>

        {/* Command Body */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-3">
          
          {/* Quick Actions */}
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold text-muted-text uppercase px-2 py-1 block">Quick System Controls</span>
            
            <div 
              onClick={handleToggleFocus}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-elevated text-xs text-secondary-text hover:text-primary-text transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Minimize className="w-4 h-4 text-emerald-400" />
                <span>Toggle Immersive Chat Focus Mode</span>
              </div>
              <span className="text-[10px] text-muted-text font-mono">[{isFocusMode ? 'ON' : 'OFF'}]</span>
            </div>
          </div>

          {/* Classes Result */}
          {filteredClasses.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold text-muted-text uppercase px-2 py-1 block">Switch Class ClassModel</span>
              {filteredClasses.map(ws => (
                <div 
                  key={ws.id}
                  onClick={() => handleSelectClass(ws.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-elevated text-xs text-secondary-text hover:text-primary-text transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>{ws.name} ({ws.subject || 'Syllabus'})</span>
                </div>
              ))}
            </div>
          )}

          {/* Active students result */}
          {filteredStudents.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold text-muted-text uppercase px-2 py-1 block">Active Class Students Roster</span>
              {filteredStudents.map(stud => (
                <div 
                  key={stud.id}
                  onClick={() => handleSelectStudent(stud.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-elevated text-xs text-secondary-text hover:text-primary-text transition-all cursor-pointer animate-fade-in"
                >
                  <User className="w-4 h-4 text-primary/80" />
                  <div className="flex-1 flex justify-between">
                    <span>{stud.name}</span>
                    <span className="text-[10px] font-mono text-muted-text">Roll: {stud.rollNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No matches */}
          {filteredStudents.length === 0 && filteredClasses.length === 0 && (
            <div className="text-center py-6 text-muted-text font-mono text-xs">
              No match for "{query}"
            </div>
          )}

        </div>

        {/* Footer shortcuts metadata */}
        <div className="p-2.5 bg-elevated/60 border-t border-border-color text-center text-[10px] font-mono text-muted-text">
          Tip: Press <kbd className="bg-surface px-1 py-0.2 rounded border border-border-color font-bold">Cmd K</kbd> to launch palette anytime.
        </div>

      </div>
    </div>
  );
}
