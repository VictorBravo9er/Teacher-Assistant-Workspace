import React, { useState } from 'react';
import { ClassModel } from '@/types/main';
import { studentService } from '@/services/studentService';
import {
  calculateAverageScore,
  getPerformanceTier,
} from '@/lib/studentCalculations';
import {
  Printer,
  Award,
  User,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Save,
} from 'lucide-react';
import { Button, Modal, ModalHeader } from '@/components/ui';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: ClassModel;
  initialStudentId?: string;
  onTriggerToast?: (msg: string) => void;
}

export default function ReportCardModal({
  isOpen,
  onClose,
  classItem,
  initialStudentId,
  onTriggerToast,
}: ReportCardModalProps) {
  if (!isOpen) return null;

  const students = classItem.students || [];
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students[0]?.id || '')
  );
  const [isSavingNote, setIsSavingNote] = useState(false);

  const selectedIndex = students.findIndex((s) => s.id === selectedStudentId);
  const student = selectedIndex >= 0 ? students[selectedIndex] : students[0];

  const [customParentNote, setCustomParentNote] = useState<string>(() => {
    if (!student) return '';
    return (
      student.parentNotes ||
      student.behavioralNotes ||
      `Parent Briefing for ${student.name}: Demonstrates good classroom engagement. Recommend daily 20-min review of homework exercises and utilizing Socratic study guides before unit tests.`
    );
  });

  const handleStudentSwitch = (id: string) => {
    setSelectedStudentId(id);
    const target = students.find((s) => s.id === id);
    if (target) {
      setCustomParentNote(
        target.parentNotes ||
          target.behavioralNotes ||
          `Parent Briefing for ${target.name}: Demonstrates good classroom engagement. Recommend daily 20-min review of homework exercises and utilizing Socratic study guides before unit tests.`
      );
    }
  };

  const handleSaveParentNote = async () => {
    if (!student) return;
    setIsSavingNote(true);
    try {
      await studentService.updateStudentClassData(classItem.id, student.id, {
        behavioralNotes: customParentNote,
      });
      student.behavioralNotes = customParentNote;
      student.parentNotes = customParentNote;
      if (onTriggerToast) onTriggerToast('Parent briefing note saved to database!');
    } catch (err: any) {
      if (onTriggerToast) onTriggerToast(`Failed to save note: ${err.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePrint = () => {
    window.print();
    if (onTriggerToast) onTriggerToast('Opened system print dialog.');
  };

  if (!student) {
    return null;
  }

  const submissions = student.submissions || [];
  const evaluatedSubmissions = submissions.filter(
    (s) => s.score !== undefined && s.score !== null
  );

  const averageScore = calculateAverageScore(submissions, student.currentScore);
  const tier = student.performanceTier || getPerformanceTier(averageScore);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      id="report-card-modal"
      size="lg"
      className="max-w-4xl max-h-[92vh]"
    >
      {/* Header - Screen only */}
      <ModalHeader
        title="Student Progress Card & Parent Briefing"
        subtitle="Official cohort report card ready for parent-teacher conferences and export."
        icon={<Award className="w-5 h-5 text-primary" />}
        onClose={onClose}
      >
        <div className="flex items-center gap-2 mr-2">
          <div className="flex items-center gap-1 bg-surface border border-border-color rounded-xl px-2 py-1 shadow-sm">
            <User className="w-3.5 h-3.5 text-muted-text" />
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentSwitch(e.target.value)}
              className="bg-transparent text-xs text-primary-text font-semibold outline-none cursor-pointer"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.rollNumber || 'ID'})
                </option>
              ))}
            </select>
          </div>

          <Button
            size="xs"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print / Save PDF
          </Button>
        </div>
      </ModalHeader>

      {/* Printable Report Document Body */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-slate-900 print:p-6 print:overflow-visible">
        {/* Institution & Class Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500 font-bold block">
              {classItem.instituteName || 'TEACH&LEARN ACADEMIC COHORT'}
            </span>
            <h1 className="text-2xl font-black text-slate-900 font-display mt-0.5">
              Official Student Academic Report
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Course: <strong className="text-slate-900">{classItem.subject}</strong> • Term:{' '}
              <strong className="text-slate-900">
                {classItem.semester}, {classItem.academicYear}
              </strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 font-mono block">Instructor:</span>
            <span className="text-sm font-bold text-slate-900 block">
              {classItem.teacherName || 'Lead Educator'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              Date:{' '}
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Student Profile Card Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
              Student Name
            </span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5">{student.name}</span>
            <span className="text-xs text-slate-500 font-mono">
              ID: {student.rollNumber || 'M10-001'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
              Parent / Guardian
            </span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5">
              {student.parentName || 'Guardian on Record'}
            </span>
            <span className="text-xs text-slate-500 font-mono truncate block">
              {student.parentContact || student.email || 'Contact on File'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
              Attendance Rate
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5 font-mono">
              {student.attendance || 100}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Regular Attendance</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
              Overall Grade & Standing
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-blue-600 font-display">
                {averageScore}%
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                {tier}
              </span>
            </div>
          </div>
        </div>

        {/* Learning Profile: Strengths & Growth Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-bold uppercase font-mono text-emerald-800 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Demonstrated Strengths & Mastery
            </h4>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              {(student.strengths && student.strengths.length > 0
                ? student.strengths
                : [
                    'Strong logical intuition and consistent class participation.',
                    'Accurate application of core formula definitions in individual practice.',
                    'High collaboration in peer group workshops.',
                  ]
              ).map((str, idx) => (
                <li key={idx} className="leading-relaxed">
                  {str}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-bold uppercase font-mono text-amber-800 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Targeted Areas for Growth & Reinforcement
            </h4>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              {(student.weaknesses && student.weaknesses.length > 0
                ? student.weaknesses
                : [
                    'Multi-step algebraic verification checks prior to final response formulation.',
                    'Time management during timed test assessments.',
                    'Detailed scratchwork organization.',
                  ]
              ).map((w, idx) => (
                <li key={idx} className="leading-relaxed">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Assessment Breakdown Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase font-mono text-slate-500">
            Individual Assessment & Rubric Score Breakdown
          </h4>

          <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden text-xs">
            <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="p-2.5 font-bold">Assessment Unit</th>
                <th className="p-2.5 font-bold text-center w-24">Score</th>
                <th className="p-2.5 font-bold text-center w-20">Percentage</th>
                <th className="p-2.5 font-bold">Educator Feedback & Rubric Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {evaluatedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400 font-mono">
                    No scored evaluations recorded in this period.
                  </td>
                </tr>
              ) : (
                evaluatedSubmissions.map((sub, idx) => {
                  const maxScore = sub.maxScore || sub.max_score || 100;
                  const pct = Math.round(((sub.score || 0) / maxScore) * 100);
                  const title =
                    sub.materialName || sub.content?.[0]?.value || `Assessment Unit ${idx + 1}`;

                  return (
                    <tr key={sub.id || idx}>
                      <td className="p-2.5 font-semibold text-slate-900">{title}</td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        {sub.score} / {maxScore}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-blue-700">{pct}%</td>
                      <td className="p-2.5 text-slate-600 italic">
                        {sub.feedback || 'Demonstrated good conceptual approach.'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Parent Briefing Agenda & Teacher Guidance */}
        <div className="border border-blue-200 bg-blue-50/60 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase font-mono text-blue-900 flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-blue-700" />
              Personalized Parent Briefing & Action Plan
            </h4>
            <Button
              size="xs"
              variant="secondary"
              onClick={handleSaveParentNote}
              isLoading={isSavingNote}
              leftIcon={<Save className="w-3.5 h-3.5 text-blue-600" />}
              className="print:hidden bg-white hover:bg-blue-50 text-blue-800 border-blue-200"
            >
              Save Note
            </Button>
          </div>

          <textarea
            value={customParentNote}
            onChange={(e) => setCustomParentNote(e.target.value)}
            rows={3}
            className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-blue-500 transition-all resize-none shadow-sm print:border-none print:p-0 print:shadow-none"
          />
        </div>

        {/* Signature Signoff Lines */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-xs text-slate-600">
          <div>
            <div className="border-b border-slate-400 w-48 mb-1"></div>
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 block">
              Educator Signature
            </span>
            <span>{classItem.teacherName || 'Lead Teacher'}</span>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="border-b border-slate-400 w-48 mb-1"></div>
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 block">
              Parent / Guardian Acknowledgment
            </span>
            <span>Date: ____________________</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
