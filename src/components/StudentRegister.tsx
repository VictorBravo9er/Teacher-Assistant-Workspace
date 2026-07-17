import React, { useState, useRef } from 'react';
import { Workspace, Student, Grade, CustomField, StudentUpload } from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Heart, 
  GraduationCap, 
  FileText, 
  Plus, 
  Trash2, 
  Briefcase, 
  HeartHandshake, 
  Settings2, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Trash, 
  ChevronDown,
  Contact2,
  Tag,
  ToggleLeft,
  X
} from 'lucide-react';

interface StudentRegisterProps {
  workspace: Workspace;
  onUpdateWorkspace: (id: string, updatedFields: Partial<Workspace>) => void;
}

export default function StudentRegister({
  workspace,
  onUpdateWorkspace
}: StudentRegisterProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const selectedStudent = workspace.students.find(s => s.id === selectedStudentId);

  // Dragging carousel controls via mouse
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ isDown: boolean; startX: number; scrollLeft: number; hasMoved: boolean; initialPageX: number }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
    initialPageX: 0
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    
    dragStartRef.current = {
      isDown: true,
      startX: e.pageX - carousel.offsetLeft,
      scrollLeft: carousel.scrollLeft,
      hasMoved: false,
      initialPageX: e.pageX
    };
    
    carousel.style.cursor = 'grabbing';
    carousel.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
    if (!dragStartRef.current.isDown) return;
    dragStartRef.current.isDown = false;
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.style.cursor = 'grab';
      carousel.style.removeProperty('user-select');
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const drag = dragStartRef.current;
    if (!drag.isDown) return;

    const deltaX = Math.abs(e.pageX - drag.initialPageX);
    if (deltaX > 5) {
      drag.hasMoved = true;
    }

    drag.isDown = false;
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.style.cursor = 'grab';
      carousel.style.removeProperty('user-select');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const drag = dragStartRef.current;
    if (!drag.isDown) return;
    
    const carousel = carouselRef.current;
    if (!carousel) return;

    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - drag.startX) * 1.5;
    carousel.scrollLeft = drag.scrollLeft - walk;

    const deltaX = Math.abs(e.pageX - drag.initialPageX);
    if (deltaX > 5) {
      drag.hasMoved = true;
    }
  };

  const handleCardClick = (studId: string, e: React.MouseEvent) => {
    if (dragStartRef.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      dragStartRef.current.hasMoved = false;
      return;
    }
    handleSelectStudent(studId);
  };

  // Edit student profile fields local states
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // Forms states
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeScore, setNewGradeScore] = useState<number>(85);
  const [newGradeMax, setNewGradeMax] = useState<number>(100);
  const [newGradeFeedback, setNewGradeFeedback] = useState('');
  const [showGradeForm, setShowGradeForm] = useState(false);

  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomType, setNewCustomType] = useState<CustomField['type']>('text');
  const [newCustomVal, setNewCustomVal] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [newUploadName, setNewUploadName] = useState('');
  const [newUploadType, setNewUploadType] = useState('Homework Submission');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Helper for performance colors
  const getPerformanceStyles = (perf: Student['performanceIndicator']) => {
    switch (perf) {
      case 'excellent':
        return {
          bg: 'bg-success/15 border-success/30',
          text: 'text-success',
          dot: 'bg-success'
        };
      case 'good':
        return {
          bg: 'bg-secondary/15 border-secondary/30',
          text: 'text-secondary',
          dot: 'bg-secondary'
        };
      case 'average':
        return {
          bg: 'bg-warning/15 border-warning/30',
          text: 'text-warning',
          dot: 'bg-warning'
        };
      case 'critical':
        return {
          bg: 'bg-error/15 border-error/30',
          text: 'text-error',
          dot: 'bg-error'
        };
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setShowGradeForm(false);
    setShowCustomForm(false);
    setShowUploadForm(false);
  };

  // Student list mutations
  const handleAddNewStudent = () => {
    const name = prompt("Enter Student Name:");
    if (!name) return;
    const roll = `M10-0${workspace.students.length + 1}`;

    const newStudent: Student = {
      id: `stud-${Date.now()}`,
      name,
      rollNumber: roll,
      email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@school.edu`,
      phone: '+1 (555) 000-1111',
      address: 'Registered School District Campus',
      parentName: 'Family Guardian',
      parentContact: '+1 (555) 000-2222',
      parentNotes: 'Primary home educator',
      grades: [],
      attendance: 100,
      performanceIndicator: 'good',
      statusIndicator: 'active',
      uploads: [],
      customFields: [
        { id: `cf-${Date.now()}-1`, label: 'Tutoring Status', type: 'tag', value: 'None', visibility: true },
        { id: `cf-${Date.now()}-2`, label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true }
      ],
      avatarSeed: name.split(' ')[0] || 'Student'
    };

    onUpdateWorkspace(workspace.id, {
      students: [...workspace.students, newStudent]
    });
    handleSelectStudent(newStudent.id);
  };

  const handleUpdateStudentDetails = (studentId: string, updatedFields: Partial<Student>) => {
    const updated = workspace.students.map(s => 
      s.id === studentId ? { ...s, ...updatedFields } : s
    );
    onUpdateWorkspace(workspace.id, { students: updated });
  };

  // Grade nested operations
  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newGradeName.trim()) return;

    const newGrade: Grade = {
      id: `g-${Date.now()}`,
      assessmentName: newGradeName.trim(),
      score: newGradeScore,
      maxScore: newGradeMax,
      date: new Date().toISOString().split('T')[0],
      feedback: newGradeFeedback.trim() || undefined
    };

    // Calculate performance indicator based on average score
    const newGrades = [...selectedStudent.grades, newGrade];
    const avgPercent = newGrades.length > 0 
      ? newGrades.reduce((acc, g) => acc + (g.score / g.maxScore), 0) / newGrades.length * 100
      : 80;

    let perf: Student['performanceIndicator'] = 'good';
    if (avgPercent >= 90) perf = 'excellent';
    else if (avgPercent >= 75) perf = 'good';
    else if (avgPercent >= 60) perf = 'average';
    else perf = 'critical';

    handleUpdateStudentDetails(selectedStudent.id, {
      grades: newGrades,
      performanceIndicator: perf
    });

    setNewGradeName('');
    setNewGradeFeedback('');
    setShowGradeForm(false);
  };

  const handleDeleteGrade = (gradeId: string) => {
    if (!selectedStudent) return;
    const filtered = selectedStudent.grades.filter(g => g.id !== gradeId);
    handleUpdateStudentDetails(selectedStudent.id, { grades: filtered });
  };

  // Custom contact-style attributes
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newCustomLabel.trim()) return;

    const newField: CustomField = {
      id: `cf-${Date.now()}`,
      label: newCustomLabel.trim(),
      type: newCustomType,
      value: newCustomVal.trim() || 'Unspecified',
      visibility: true
    };

    handleUpdateStudentDetails(selectedStudent.id, {
      customFields: [...selectedStudent.customFields, newField]
    });

    setNewCustomLabel('');
    setNewCustomVal('');
    setShowCustomForm(false);
  };

  const handleDeleteCustomField = (fieldId: string) => {
    if (!selectedStudent) return;
    const filtered = selectedStudent.customFields.filter(f => f.id !== fieldId);
    handleUpdateStudentDetails(selectedStudent.id, { customFields: filtered });
  };

  // Uploaded submissions
  const handleAddSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newUploadName.trim()) return;

    const newUpload: StudentUpload = {
      id: `up-${Date.now()}`,
      name: newUploadName.split('.').length > 1 ? newUploadName : `${newUploadName}.pdf`,
      type: newUploadType,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    handleUpdateStudentDetails(selectedStudent.id, {
      uploads: [...selectedStudent.uploads, newUpload]
    });

    setNewUploadName('');
    setShowUploadForm(false);
  };

  const handleDeleteSubmission = (upId: string) => {
    if (!selectedStudent) return;
    const filtered = selectedStudent.uploads.filter(u => u.id !== upId);
    handleUpdateStudentDetails(selectedStudent.id, { uploads: filtered });
  };

  const handleDeleteStudent = (studId: string) => {
    if (confirm("Remove this student portfolio entirely from clinical records?")) {
      const filtered = workspace.students.filter(s => s.id !== studId);
      onUpdateWorkspace(workspace.id, { students: filtered });
      setSelectedStudentId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-1">
      {/* Scrollable Bar Header layout */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-secondary-text font-display uppercase tracking-wider flex items-center gap-2">
          <Contact2 className="w-4 h-4 text-primary" />
          Roster Student Cards ({workspace.students.length})
        </h3>
        <button 
          onClick={handleAddNewStudent}
          className="text-xs font-bold text-primary hover:text-primary/95 flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-lg border border-primary/10 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Student
        </button>
      </div>

      {/* Horizontal Scroll bar */}
      <div 
        ref={carouselRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="flex items-center gap-3 overflow-x-auto pb-2.5 scrollbar-thin px-0.5 cursor-grab select-none active:cursor-grabbing"
      >
        {workspace.students.length === 0 ? (
          <div className="text-muted-text text-xs font-mono py-4 px-4 border border-dashed border-border-color/60 rounded-xl w-full text-center">
            No students registered in this class. Click Add Student above to begin roster.
          </div>
        ) : (
          workspace.students.map(stud => {
            const perf = getPerformanceStyles(stud.performanceIndicator);
            const initials = stud.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const isSelected = stud.id === selectedStudentId;

            return (
              <div 
                key={stud.id}
                onClick={(e) => handleCardClick(stud.id, e)}
                className={`group min-w-[210px] max-w-[220px] shrink-0 border rounded-xl p-3 flex flex-col gap-2.5 transition-all cursor-pointer relative overflow-hidden backdrop-blur ${
                  isSelected 
                    ? 'border-primary/80 bg-primary/5 shadow-[0_0_15px_rgba(37,99,235,0.1)] ring-1 ring-primary/20' 
                    : 'border-border-color bg-surface hover:border-muted-text/30 hover:bg-elevated/40'
                }`}
              >
                {/* Visual Avatar Row */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-elevated border border-border-color flex items-center justify-center font-bold text-xs text-primary uppercase select-none shrink-0">
                    {initials}
                  </div>
                  <div className="truncate flex-1">
                    <h4 className="text-xs font-bold font-display text-primary-text truncate group-hover:text-primary">{stud.name}</h4>
                    <span className="text-[10px] font-mono text-muted-text">{stud.rollNumber}</span>
                  </div>
                </div>

                {/* Status Badges Row */}
                <div className="flex items-center justify-between pt-1 border-t border-border-color/40">
                  <span className={`text-[9px] font-semibold px-2 py-0.5 font-mono border rounded-full ${perf.bg} ${perf.text} flex items-center gap-1.5`}>
                    <span className={`w-1.2 h-1.2 rounded-full ${perf.dot} inline-block`}></span>
                    {stud.performanceIndicator}
                  </span>
                  
                  <span className="text-[10px] font-mono text-secondary-text bg-elevated/55 px-1.5 py-0.2 rounded border border-border-color/40">
                    {stud.attendance}% attendance
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Student Portfolio Drawer sheet overlay */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-primary-text/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border-color rounded-3xl max-w-4xl w-full h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Close trigger handles */}
            <button 
              onClick={() => setSelectedStudentId(null)}
              className="absolute right-5 top-5 hover:bg-elevated p-2 rounded-xl text-muted-text hover:text-primary-text transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Profile Drawer Main Header */}
            <div className="p-6 border-b border-border-color bg-elevated/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center font-display font-semibold text-xl text-primary">
                  {selectedStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-display text-primary-text">{selectedStudent.name}</h3>
                    <span className="text-xs font-mono text-muted-text">ID: {selectedStudent.rollNumber}</span>
                  </div>
                  
                  {/* Status Selection list */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <select 
                      value={selectedStudent.statusIndicator}
                      onChange={(e) => handleUpdateStudentDetails(selectedStudent.id, { statusIndicator: e.target.value as Student['statusIndicator'] })}
                      className="bg-surface border border-border-color rounded px-2 py-0.5 text-[10px] font-mono text-primary outline-none cursor-pointer focus:border-primary"
                    >
                      <option value="active">Roster: Active</option>
                      <option value="inactive">Roster: Inactive</option>
                      <option value="needs-attention">Needs Care Attention</option>
                    </select>

                    <span className="text-[10px] font-mono text-muted-text">| Portfolio performance:</span>
                    <span className="text-[10px] font-mono text-primary capitalize bg-primary/5 px-1.5 py-0.2 rounded border border-primary/20">
                      {selectedStudent.performanceIndicator}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roster actions */}
              <div className="flex items-center gap-2 pr-12">
                <button 
                  onClick={() => handleDeleteStudent(selectedStudent.id)}
                  className="px-3.5 py-1.8 hover:bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                  Expel Student Records
                </button>
              </div>
            </div>

            {/* Split panels container */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Panel: Contacts & custom fields */}
              <div className="w-full md:w-80 border-r border-border-color p-6 overflow-y-auto space-y-6 shrink-0 bg-background/50">
                
                {/* Basic coordinates list */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold font-mono text-muted-text uppercase tracking-widest leading-none">Contact Dossier</h4>
                  
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2.5 text-xs">
                      <Mail className="w-3.5 h-3.5 text-muted-text shrink-0" />
                      <input 
                        type="text" 
                        value={selectedStudent.email}
                        onChange={(e) => handleUpdateStudentDetails(selectedStudent.id, { email: e.target.value })}
                        className="bg-transparent text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 truncate w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <Phone className="w-3.5 h-3.5 text-muted-text shrink-0" />
                      <input 
                        type="text" 
                        value={selectedStudent.phone}
                        onChange={(e) => handleUpdateStudentDetails(selectedStudent.id, { phone: e.target.value })}
                        className="bg-transparent text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full"
                      />
                    </div>
                    <div className="flex items-start gap-2.5 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-muted-text shrink-0 mt-0.5" />
                      <textarea 
                        value={selectedStudent.address}
                        onChange={(e) => handleUpdateStudentDetails(selectedStudent.id, { address: e.target.value })}
                        className="bg-transparent text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full h-11 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Parents Guardian block details */}
                <div className="space-y-4 pt-4 border-t border-border-color">
                  <h4 className="text-[10px] font-bold font-mono text-muted-text uppercase tracking-widest leading-none">Family & Guardians</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] text-muted-text font-mono block">PARENT GUARDIAN NAMES</label>
                      <input 
                        type="text" 
                        value={selectedStudent.parentName}
                        onChange={(e) => handleUpdateStudentDetails(selectedStudent.id, { parentName: e.target.value })}
                        className="bg-transparent text-xs text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full pt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-text font-mono block">URGENT CONTACT PREFERENCES</label>
                      <input 
                        type="text" 
                        value={selectedStudent.parentContact}
                        onChange={(e) => handleUpdateStudentDetails(selectedStudent.id, { parentContact: e.target.value })}
                        className="bg-transparent text-xs text-secondary-text focus:outline-none focus:border-b focus:border-primary/50 w-full pt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-text font-mono block">PARENT PORTAL FEEDBACK NOTES</label>
                      <textarea 
                        value={selectedStudent.parentNotes}
                        onChange={(e) => handleUpdateStudentDetails(selectedStudent.id, { parentNotes: e.target.value })}
                        className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-secondary-text h-16 resize-none focus:outline-none focus:border-primary/50 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Google Contacts-style Custom Attributes list */}
                <div className="space-y-4 pt-4 border-t border-border-color">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold font-mono text-muted-text uppercase tracking-widest leading-none">Custom Fields</h4>
                    <button 
                      onClick={() => setShowCustomForm(!showCustomForm)}
                      className="text-[10px] font-semibold text-primary hover:text-primary/80"
                    >
                      {showCustomForm ? 'Cancel' : '+ New Field'}
                    </button>
                  </div>

                  {showCustomForm && (
                    <form onSubmit={handleAddCustomField} className="bg-elevated border border-border-color rounded-lg p-3 space-y-2.5 shadow-sm">
                      <input 
                        type="text" 
                        placeholder="Label: IEP Accommodation" 
                        value={newCustomLabel} 
                        onChange={(e) => setNewCustomLabel(e.target.value)}
                        className="w-full bg-surface border border-border-color rounded p-1.5 text-xs text-primary-text focus:outline-none focus:border-primary"
                        required
                      />
                      <select 
                        value={newCustomType}
                        onChange={(e) => setNewCustomType(e.target.value as CustomField['type'])}
                        className="w-full bg-surface border border-border-color rounded p-1.5 text-xs text-secondary-text outline-none focus:border-primary"
                      >
                        <option value="text">Text Field</option>
                        <option value="tag">Status Tag</option>
                        <option value="boolean">Yes/No Flag</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Value: True or High tutoring" 
                        value={newCustomVal} 
                        onChange={(e) => setNewCustomVal(e.target.value)}
                        className="w-full bg-surface border border-border-color rounded p-1.5 text-xs text-primary-text focus:outline-none focus:border-primary"
                      />
                      <button 
                        type="submit"
                        className="w-full bg-primary text-white font-semibold text-[11px] py-1 rounded cursor-pointer"
                      >
                        Register Custom Field
                      </button>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {selectedStudent.customFields?.map(field => (
                      <div key={field.id} className="group bg-elevated border border-border-color rounded-lg p-2.5 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col truncate">
                          <span className="text-[9px] font-mono text-muted-text">{field.label}</span>
                          <span className="text-xs font-semibold text-primary mt-0.5 truncate">{field.value}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteCustomField(field.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-muted-text hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                </div>

              </div>

              {/* Right Panel: Academic scorecard and homework uploads */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* 1. Academic records scorecard */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      Academic Scorecard ({selectedStudent.grades.length} Grades)
                    </h4>
                    <button 
                      onClick={() => setShowGradeForm(!showGradeForm)}
                      className="text-xs font-bold text-primary hover:text-primary-text cursor-pointer"
                    >
                      {showGradeForm ? 'Cancel Score' : '+ Record Evaluation'}
                    </button>
                  </div>

                  {/* Inline Score feedback form */}
                  {showGradeForm && (
                    <form onSubmit={handleAddGrade} className="bg-elevated border border-border-color rounded-xl p-4 space-y-3.5 shadow-sm">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] text-muted-text font-mono">ASSESSMENT TITLE</label>
                          <input 
                            type="text" 
                            placeholder="Algebra Chapter 2 Quiz"
                            value={newGradeName}
                            onChange={(e) => setNewGradeName(e.target.value)}
                            className="w-full bg-surface border border-border-color rounded-lg p-1.8 text-xs text-primary-text outline-none focus:border-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-text font-mono">RAW SCORE</label>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={newGradeScore}
                              onChange={(e) => setNewGradeScore(parseInt(e.target.value) || 0)}
                              className="w-full bg-surface border border-border-color rounded-lg p-1.8 text-xs text-primary-text text-center focus:border-primary outline-none"
                              min="0"
                              required
                            />
                            <span className="text-muted-text">/</span>
                            <input 
                              type="number" 
                              value={newGradeMax}
                              onChange={(e) => setNewGradeMax(parseInt(e.target.value) || 100)}
                              className="w-14 bg-surface border border-border-color rounded-lg p-1.8 text-xs text-primary-text text-center focus:border-primary outline-none"
                              min="1"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-muted-text font-mono block">PORTFOLIO COMMENT FEEDBACK ENRICHMENT</label>
                        <textarea 
                          placeholder="Provide encouraging assessment on concept development, e.g. Demonstrated solid operational mechanics..."
                          value={newGradeFeedback}
                          onChange={(e) => setNewGradeFeedback(e.target.value)}
                          className="w-full bg-surface border border-border-color rounded-lg p-2 text-xs text-primary-text h-16 resize-none outline-none focus:border-primary"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer"
                      >
                        Commit Score Record
                      </button>
                    </form>
                  )}

                  {/* Scores tabular database */}
                  <div className="space-y-3">
                    {selectedStudent.grades.length === 0 ? (
                      <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                        No evaluations logged. Record a score to establish performance trends.
                      </div>
                    ) : (
                      selectedStudent.grades.map(grade => {
                        const gradePercent = (grade.score / grade.maxScore) * 100;
                        let gradeColor = 'text-success bg-success/10 border-success/20';
                        if (gradePercent < 60) gradeColor = 'text-error bg-error/10 border-error/20';
                        else if (gradePercent < 75) gradeColor = 'text-warning bg-warning/10 border-warning/20';

                        return (
                          <div key={grade.id} className="bg-elevated border border-border-color hover:border-primary/30 rounded-xl p-4 space-y-2 relative group transition-colors shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-primary-text">{grade.assessmentName}</span>
                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${gradeColor}`}>
                                  {grade.score} / {grade.maxScore} ({gradePercent.toFixed(0)}%)
                                </span>
                                <button 
                                  onClick={() => handleDeleteGrade(grade.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-muted-text hover:text-red-500 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {grade.feedback && (
                              <p className="text-[11px] text-secondary-text leading-relaxed bg-surface rounded-lg p-2.5 border border-border-color italic">
                                "{grade.feedback}"
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>

                {/* 2. File Upload Submissions repository */}
                <div className="space-y-3.5 pt-4 border-t border-border-color">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-primary-text font-display flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-success" />
                      Student Uploads & Homework Submissions ({selectedStudent.uploads?.length || 0} files)
                    </h4>
                    <button 
                      onClick={() => setShowUploadForm(!showUploadForm)}
                      className="text-xs font-bold text-success hover:text-success/80 cursor-pointer"
                    >
                      {showUploadForm ? 'Cancel Submission' : '+ Log Written Work'}
                    </button>
                  </div>

                  {showUploadForm && (
                    <form onSubmit={handleAddSubmission} className="bg-elevated border border-border-color rounded-xl p-4 space-y-3.5 shadow-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-text font-mono">FILE ATTACHMENT NAME</label>
                          <input 
                            type="text" 
                            placeholder="Midterm_Page3_SofiaRevision.pdf"
                            value={newUploadName}
                            onChange={(e) => setNewUploadName(e.target.value)}
                            className="w-full bg-surface border border-border-color rounded-lg p-1.8 text-xs text-primary-text outline-none focus:border-success"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-muted-text font-mono">ASSIGNMENT TYPE</label>
                          <select 
                            value={newUploadType}
                            onChange={(e) => setNewUploadType(e.target.value)}
                            className="w-full bg-surface border border-border-color rounded-lg p-1.8 text-xs text-secondary-text outline-none cursor-pointer focus:border-success"
                          >
                            <option value="Homework Submission">Homework Revision</option>
                            <option value="Written Midterm Submission">Written Exam Sheet</option>
                            <option value="Practical Lab Notebook">Lab notebook index</option>
                            <option value="Evaluation Sheet feedback">Remedial feedback draft</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="bg-success hover:bg-success/90 text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer"
                      >
                        Acknowledge File Log
                      </button>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {selectedStudent.uploads?.length === 0 ? (
                      <div className="text-center py-6 text-muted-text text-xs font-mono border border-dashed border-border-color rounded-xl">
                        No written answer sheets registered. Add a file to let AI analyze their calculations/handwriting structures.
                      </div>
                    ) : (
                      selectedStudent.uploads?.map(up => (
                        <div key={up.id} className="group bg-elevated border border-border-color hover:border-success/30 rounded-xl p-3 flex items-center justify-between transition-colors shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-surface rounded-lg text-secondary-text">
                              <FileText className="w-4 h-4 text-success" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-primary-text">{up.name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-mono text-muted-text">{up.date}</span>
                                <span className="w-1.2 h-1.2 rounded-full bg-border-color"></span>
                                <span className="text-[9px] font-mono text-primary/80">{up.type}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${up.status === 'graded' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                              {up.status}
                            </span>
                            <button 
                              onClick={() => handleDeleteSubmission(up.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-muted-text hover:text-red-500 rounded transition-opacity cursor-pointer animate-fade-in"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>
              
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
