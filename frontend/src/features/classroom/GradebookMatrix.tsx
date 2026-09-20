import React, { useState, useMemo } from 'react';
import {
  ClassModel,
  Student,
  Material,
  StudentSubmission,
} from '@/types/main';
import SubmissionGradingModal from '@/features/students/SubmissionGradingModal';
import {
  calculateAverageScore,
  getPerformanceStyles,
  getPerformanceTier,
} from '@/lib/studentCalculations';
import {
  Download,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GraduationCap,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';

interface GradebookMatrixProps {
  classItem: ClassModel;
  onUpdateClass: (id: string, updates: Partial<ClassModel>) => void;
  onTriggerToast?: (msg: string) => void;
}

type SortField = 'name' | 'roll' | 'score' | 'attendance' | string;

export default function GradebookMatrix({
  classItem,
  onUpdateClass,
  onTriggerToast,
}: GradebookMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Selected cell for direct review modal
  const [gradingModalState, setGradingModalState] = useState<{
    student: Student;
    submission: StudentSubmission;
    material?: Material;
  } | null>(null);

  const students = classItem.students || [];

  const scoredMaterials = useMemo(() => {
    return (classItem.materials || []).filter(
      (m) => m.toBeScored || ['Assignment', 'Test', 'Exam', 'Practical'].includes(m.category)
    );
  }, [classItem.materials]);

  const getSubmissionForMaterial = (student: Student, material: Material): StudentSubmission | undefined => {
    return (student.submissions || []).find(
      (s) =>
        s.materialId === material.id ||
        s.material_id === material.id ||
        (s.content && s.content[0]?.value?.includes(material.name))
    );
  };

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
        const effectiveTier = s.performanceTier || getPerformanceTier(calculateAverageScore(s.submissions, s.currentScore));
        const matchesTier =
          tierFilter === 'all' || effectiveTier.toLowerCase() === tierFilter.toLowerCase();
        return matchesSearch && matchesTier;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'roll') {
          diff = (a.rollNumber || '').localeCompare(b.rollNumber || '');
        } else if (sortField === 'score') {
          diff =
            calculateAverageScore(a.submissions, a.currentScore) -
            calculateAverageScore(b.submissions, b.currentScore);
        } else if (sortField === 'attendance') {
          diff = (a.attendance || 100) - (b.attendance || 100);
        } else {
          const mat = scoredMaterials.find((m) => m.id === sortField);
          if (mat) {
            const subA = getSubmissionForMaterial(a, mat);
            const subB = getSubmissionForMaterial(b, mat);
            const scoreA = subA?.score ?? -1;
            const scoreB = subB?.score ?? -1;
            diff = scoreA - scoreB;
          }
        }
        return sortAsc ? diff : -diff;
      });
  }, [students, searchTerm, tierFilter, sortField, sortAsc, scoredMaterials]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      if (onTriggerToast) onTriggerToast('No student data to export.');
      return;
    }

    const headers = [
      'Student Name',
      'Roll Number',
      'Email',
      'Performance Tier',
      'Attendance %',
      'Average Grade %',
      ...scoredMaterials.map((m) => `"${m.name} (Max ${m.maxScore || 100})"`),
    ];

    const rows = students.map((stud) => {
      const avg = calculateAverageScore(stud.submissions, stud.currentScore);
      const tier = stud.performanceTier || getPerformanceTier(avg);
      const row = [
        `"${stud.name}"`,
        `"${stud.rollNumber || ''}"`,
        `"${stud.email || ''}"`,
        `"${tier}"`,
        stud.attendance || 100,
        `${avg}%`,
        ...scoredMaterials.map((m) => {
          const sub = getSubmissionForMaterial(stud, m);
          if (!sub || sub.score === undefined || sub.score === null) {
            return `"${sub?.status || 'Assigned'}"`;
          }
          return sub.score;
        }),
      ];
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${classItem.name.replace(/\s+/g, '_')}_Gradebook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onTriggerToast) onTriggerToast('Gradebook spreadsheet exported successfully!');
  };

  const handleCellClick = (student: Student, material: Material) => {
    let sub = getSubmissionForMaterial(student, material);
    if (!sub) {
      sub = {
        id: crypto.randomUUID(),
        classId: classItem.id,
        studentId: student.id,
        materialId: material.id,
        materialName: material.name,
        content: [],
        status: 'Assigned',
        maxScore: material.maxScore || 100,
      };
    }

    setGradingModalState({
      student,
      submission: sub,
      material,
    });
  };

  const handleSaveSubmissionFromModal = (updatedSub: StudentSubmission) => {
    if (!gradingModalState) return;

    const studentId = gradingModalState.student.id;
    const updatedStudents = students.map((s) => {
      if (s.id !== studentId) return s;
      const currentSubs = s.submissions || [];
      const existsIndex = currentSubs.findIndex(
        (x) => x.id === updatedSub.id || (x.materialId && x.materialId === updatedSub.materialId)
      );

      let newSubs = [...currentSubs];
      if (existsIndex >= 0) {
        newSubs[existsIndex] = updatedSub;
      } else {
        newSubs.push(updatedSub);
      }

      const avg = calculateAverageScore(newSubs);
      const tier = getPerformanceTier(avg);

      return {
        ...s,
        currentScore: avg,
        performanceTier: tier,
        performanceIndicator: tier === 'High' ? 'excellent' : tier === 'Average' ? 'good' : 'critical',
        submissions: newSubs,
      };
    });

    onUpdateClass(classItem.id, { students: updatedStudents as Student[] });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-muted-text opacity-50" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary" />
    );
  };

  return (
    <div
      id="gradebook-matrix-container"
      className="bg-surface border border-border-color rounded-3xl overflow-hidden flex flex-col h-full shadow-sm"
    >
      {/* Gradebook Header & Toolbar */}
      <div className="p-4 border-b border-border-color bg-elevated/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary-text font-display">
                Class Gradebook & Assessment Matrix
              </h3>
              <Badge variant="primary">{scoredMaterials.length} Scored Units</Badge>
            </div>
            <p className="text-xs text-secondary-text mt-0.5">
              Click on any assessment score cell to open the real-time Grading Review & Assessment Drawer.
            </p>
          </div>
        </div>

        {/* Filter and Export Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-text absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface border border-border-color rounded-xl pl-8 pr-3 py-1.5 text-xs text-primary-text placeholder-muted-text focus:outline-none focus:border-primary shadow-sm w-44"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface border border-border-color rounded-xl px-2 py-1 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-muted-text" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-transparent text-xs text-secondary-text outline-none cursor-pointer"
            >
              <option value="all">All Tiers</option>
              <option value="high">High Tier</option>
              <option value="average">Average Tier</option>
              <option value="at risk">At Risk</option>
            </select>
          </div>

          <Button
            size="xs"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            title="Download CSV spreadsheet of full gradebook matrix"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Gradebook Matrix Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-elevated/80 border-b border-border-color sticky top-0 z-10 text-[11px] font-mono text-muted-text uppercase select-none">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="p-3 pl-5 font-bold cursor-pointer hover:text-primary transition-colors min-w-[200px]"
              >
                <div className="flex items-center gap-1.5">
                  Student Name {renderSortIcon('name')}
                </div>
              </th>

              <th
                onClick={() => handleSort('roll')}
                className="p-3 font-bold cursor-pointer hover:text-primary transition-colors w-24"
              >
                <div className="flex items-center gap-1.5">
                  Roll ID {renderSortIcon('roll')}
                </div>
              </th>

              <th
                onClick={() => handleSort('score')}
                className="p-3 font-bold cursor-pointer hover:text-primary transition-colors w-28 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  Overall % {renderSortIcon('score')}
                </div>
              </th>

              <th
                onClick={() => handleSort('attendance')}
                className="p-3 font-bold cursor-pointer hover:text-primary transition-colors w-28 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  Attendance {renderSortIcon('attendance')}
                </div>
              </th>

              {scoredMaterials.map((mat) => (
                <th
                  key={mat.id}
                  onClick={() => handleSort(mat.id)}
                  className="p-3 font-bold cursor-pointer hover:text-primary transition-colors min-w-[130px] text-center"
                >
                  <div className="flex flex-col items-center">
                    <span className="truncate max-w-[120px] font-semibold text-primary-text" title={mat.name}>
                      {mat.name}
                    </span>
                    <span className="text-[9px] text-muted-text lowercase font-normal">
                      max {mat.maxScore || 100} pts
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-color/60 text-xs">
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + scoredMaterials.length}
                  className="py-12 text-center text-muted-text font-mono"
                >
                  No student records match the search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((stud) => {
                const avgScore = calculateAverageScore(stud.submissions, stud.currentScore);
                const tier = stud.performanceTier || getPerformanceTier(avgScore);
                const perfStyles = getPerformanceStyles(tier);

                return (
                  <tr
                    key={stud.id}
                    className="hover:bg-elevated/40 transition-colors group"
                  >
                    <td className="p-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {stud.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-primary-text block font-display">
                            {stud.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold inline-block mt-0.5 ${perfStyles.bg} ${perfStyles.text}`}
                          >
                            {tier}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-mono text-muted-text text-[11px]">
                      {stud.rollNumber || 'M10'}
                    </td>

                    <td className="p-3 text-center">
                      <span className="font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
                        {avgScore}%
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono text-secondary-text">
                      {stud.attendance || 100}%
                    </td>

                    {scoredMaterials.map((mat) => {
                      const sub = getSubmissionForMaterial(stud, mat);
                      const hasScore = sub && sub.score !== undefined && sub.score !== null;
                      const maxScore = mat.maxScore || sub?.maxScore || 100;
                      const scorePct = hasScore ? Math.round(((sub.score || 0) / maxScore) * 100) : 0;

                      return (
                        <td
                          key={mat.id}
                          onClick={() => handleCellClick(stud, mat)}
                          className="p-3 text-center cursor-pointer hover:bg-primary/10 transition-colors"
                          title="Click to Review & Grade"
                        >
                          {hasScore ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="font-mono font-bold text-primary-text">
                                {sub.score} / {maxScore}
                              </span>
                              <span className="text-[9px] font-mono text-success font-semibold">
                                {scorePct}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-elevated text-muted-text border border-border-color">
                              {sub?.status || 'Assigned'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grading Modal */}
      {gradingModalState && (
        <SubmissionGradingModal
          isOpen={!!gradingModalState}
          onClose={() => setGradingModalState(null)}
          student={gradingModalState.student}
          submission={gradingModalState.submission}
          material={gradingModalState.material}
          onSave={handleSaveSubmissionFromModal}
          onTriggerToast={onTriggerToast}
        />
      )}
    </div>
  );
}
