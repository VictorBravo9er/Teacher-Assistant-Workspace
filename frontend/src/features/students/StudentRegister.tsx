import React, { useState, useRef, useEffect } from 'react';
import {
  ClassModel,
  Student,
  StudentSubmission,
  Material,
} from '@/types/main';
import { ConfirmModal } from '@/components/shared/CustomDialogs';
import { studentService } from '@/services/studentService';
import SubmissionGradingModal from '@/features/students/SubmissionGradingModal';
import StudentSubmissionUploadModal from '@/features/students/StudentSubmissionUploadModal';
import AttendanceManagerModal from '@/features/students/AttendanceManagerModal';
import ReportCardModal from '@/features/students/ReportCardModal';
import StudentDetailModal from '@/features/students/StudentDetailModal';
import { getPerformanceStyles, calculateAverageScore, getPerformanceTier } from '@/lib/studentCalculations';
import {
  Plus,
  Contact2,
  UserCheck,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, FormField, Input } from '@/components/ui';
import { logger } from '@/lib/logger';

interface StudentRegisterProps {
  classItem: ClassModel;
  onUpdateClass: (id: string, updatedFields: Partial<ClassModel>) => void;
  onTriggerToast?: (text: string) => void;
}

export default function StudentRegister({
  classItem,
  onUpdateClass,
  onTriggerToast,
}: StudentRegisterProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const classItemRef = useRef(classItem);
  useEffect(() => {
    classItemRef.current = classItem;
  }, [classItem]);

  const notify = (msg: string) => {
    if (onTriggerToast) {
      onTriggerToast(msg);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current && e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const nonPendingStudents = classItem.students.filter((s) => !s.isPending);
  const selectedStudentIndex = nonPendingStudents.findIndex((s) => s.id === selectedStudentId);
  const selectedStudent = selectedStudentIndex !== -1 ? nonPendingStudents[selectedStudentIndex] : undefined;
  const previousStudent = selectedStudentIndex > 0 ? nonPendingStudents[selectedStudentIndex - 1] : null;
  const nextStudent =
    selectedStudentIndex !== -1 && selectedStudentIndex < nonPendingStudents.length - 1
      ? nonPendingStudents[selectedStudentIndex + 1]
      : null;

  const [isAddStudentPromptOpen, setIsAddStudentPromptOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  // Modals State
  const [gradingModalState, setGradingModalState] = useState<{
    student: Student;
    submission: StudentSubmission;
    material?: Material;
  } | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [reportCardStudentId, setReportCardStudentId] = useState<string | null>(null);

  const handleAddNewStudent = (payload: { name: string; email: string }) => {
    if (!payload.name.trim() || !payload.email.trim()) return;
    const currentStudents = classItemRef.current.students;
    const roll = `M10-0${currentStudents.length + 1}`;

    const tempId = crypto.randomUUID();
    const newStudent: Student = {
      id: tempId,
      name: payload.name.trim(),
      rollNumber: roll,
      email: payload.email.trim(),
      phone: '',
      address: '',
      parentName: '',
      parentContact: '',
      parentNotes: '',
      performanceIndicator: 'good',
      statusIndicator: 'active',
      submissions: [],
      customFields: [
        { id: `cf-${Date.now()}-1`, label: 'Tutoring Status', type: 'tag', value: 'None', visibility: true },
        { id: `cf-${Date.now()}-2`, label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true },
      ],
      avatarSeed: payload.name.trim().split(' ')[0] || 'Student',
      isPending: true,
    };

    // Optimistically inject into local state immediately
    const nextStudents = [...currentStudents, newStudent];
    classItemRef.current = { ...classItemRef.current, students: nextStudents };
    onUpdateClass(classItem.id, { students: nextStudents });

    // Non-blocking background invitation
    studentService
      .addStudentToClass(classItem.id, newStudent)
      .then((realStudentId) => {
        const latestStudents = classItemRef.current.students;
        const updated = latestStudents.map((s) =>
          s.id === tempId ? { ...s, id: realStudentId || tempId, isPending: false } : s
        );
        classItemRef.current = { ...classItemRef.current, students: updated };
        onUpdateClass(classItem.id, { students: updated });
        notify(`Invitation sent to ${newStudent.name}!`);
      })
      .catch((e: unknown) => {
        logger.error('STUDENT_SERVICE', 'Failed to add student to class', e);
        const latestStudents = classItemRef.current.students;
        const rolledBack = latestStudents.filter((s) => s.id !== tempId);
        classItemRef.current = { ...classItemRef.current, students: rolledBack };
        onUpdateClass(classItem.id, { students: rolledBack });
        const errMsg = e instanceof Error ? e.message : String(e);
        notify(`Failed to invite ${newStudent.name}: ${errMsg}`);
      });
  };

  const handleUpdateStudentDetails = (studentId: string, updatedFields: Partial<Student>) => {
    const previousStudents = [...classItemRef.current.students];
    const updated = previousStudents.map((s) =>
      s.id === studentId ? { ...s, ...updatedFields } : s
    );
    classItemRef.current = { ...classItemRef.current, students: updated };
    onUpdateClass(classItem.id, { students: updated });

    const student = updated.find((s) => s.id === studentId);
    if (student) {
      studentService
        .updateStudentClassData(classItem.id, studentId, student)
        .catch((e: unknown) => {
          logger.error('STUDENT_SERVICE', 'Failed to persist student details', e);
          classItemRef.current = { ...classItemRef.current, students: previousStudents };
          onUpdateClass(classItem.id, { students: previousStudents });
          const errMsg = e instanceof Error ? e.message : String(e);
          notify(`Failed to save student details: ${errMsg}`);
        });
    }
  };

  const handleDeleteStudent = (studId: string) => {
    const previousStudents = [...classItemRef.current.students];
    const filtered = previousStudents.filter((s) => s.id !== studId);
    classItemRef.current = { ...classItemRef.current, students: filtered };
    onUpdateClass(classItem.id, { students: filtered });
    setSelectedStudentId(null);

    studentService
      .removeStudentFromClass(classItem.id, studId)
      .then(() => {
        notify('Student portfolio removed.');
      })
      .catch((e: unknown) => {
        logger.error('STUDENT_SERVICE', 'Failed to remove student from class', e);
        classItemRef.current = { ...classItemRef.current, students: previousStudents };
        onUpdateClass(classItem.id, { students: previousStudents });
        const errMsg = e instanceof Error ? e.message : String(e);
        notify(`Failed to delete student: ${errMsg}`);
      });
  };

  const handleSaveGradingFromModal = (updatedSub: StudentSubmission) => {
    if (!gradingModalState) return;
    const studentId = gradingModalState.student.id;
    const student = classItem.students.find((s) => s.id === studentId);
    if (!student) return;

    const existingSubs = student.submissions || [];
    const idx = existingSubs.findIndex(
      (s) => s.id === updatedSub.id || (s.materialId && s.materialId === updatedSub.materialId)
    );
    const newSubs = [...existingSubs];
    if (idx >= 0) {
      newSubs[idx] = updatedSub;
    } else {
      newSubs.push(updatedSub);
    }

    const avg = calculateAverageScore(newSubs);
    const tier = getPerformanceTier(avg);

    handleUpdateStudentDetails(studentId, {
      submissions: newSubs,
      performanceIndicator: tier === 'High' ? 'excellent' : tier === 'Average' ? 'good' : 'critical',
      performanceTier: tier,
      currentScore: avg,
    });
  };

  const handleSubmissionCreatedFromModal = (studentId: string, newSubmission: StudentSubmission) => {
    const student = classItem.students.find((s) => s.id === studentId);
    if (!student) return;
    const newSubs = [...(student.submissions || []), newSubmission];
    handleUpdateStudentDetails(studentId, { submissions: newSubs });
  };

  const handleAttendanceUpdatedFromModal = (updatedStudents: Student[]) => {
    onUpdateClass(classItem.id, { students: updatedStudents });
  };

  return (
    <div id="student-register-container" className="flex flex-col gap-3 py-1">
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-secondary-text font-display uppercase tracking-wider flex items-center gap-2">
          <Contact2 className="w-4 h-4 text-primary" />
          Roster Student Cards ({classItem.students.length})
        </h3>

        <div className="flex items-center gap-2">
          <Button
            id="student-register-attendance-button"
            variant="secondary"
            size="xs"
            onClick={() => setIsAttendanceModalOpen(true)}
            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
            title="Log and manage daily cohort attendance"
          >
            Daily Attendance
          </Button>

          <Button
            id="student-register-upload-button"
            variant="success"
            size="xs"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={classItem.students.length === 0}
            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            title="Log student work or homework file"
          >
            Log Submission
          </Button>

          <Button
            id="student-register-add-button"
            variant="primary"
            size="xs"
            onClick={() => setIsAddStudentPromptOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Student
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex items-center gap-3 overflow-x-auto pb-2.5 px-0.5"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {classItem.students.length === 0 ? (
          <div className="text-muted-text text-xs font-mono py-4 px-4 border border-dashed border-border-color/60 rounded-xl w-full text-center">
            No students registered in this class. Click Add Student above to begin roster.
          </div>
        ) : (
          classItem.students.map((stud) => {
            const perf = getPerformanceStyles(stud.performanceIndicator);
            const initials = stud.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();
            const isSelected = stud.id === selectedStudentId;

            return (
              <div
                key={stud.id}
                id={`student-card-${stud.id}`}
                onClick={() => !stud.isPending && setSelectedStudentId(stud.id)}
                className={`group min-w-52.5 max-w-55 shrink-0 border rounded-xl p-3 flex flex-col gap-2.5 transition-all relative overflow-hidden backdrop-blur ${
                  stud.isPending
                    ? 'border-primary/40 bg-surface/60 cursor-not-allowed select-none opacity-90'
                    : isSelected
                    ? 'border-primary/80 bg-primary/5 shadow-[0_0_15px_rgba(37,99,235,0.1)] ring-1 ring-primary/20 cursor-pointer'
                    : 'border-border-color bg-surface hover:border-muted-text/30 hover:bg-elevated/40 cursor-pointer'
                }`}
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-elevated border border-border-color flex items-center justify-center font-bold text-xs text-primary uppercase select-none shrink-0">
                    {initials}
                  </div>
                  <div className="truncate flex-1">
                    <h4 className="text-xs font-bold font-display text-primary-text truncate group-hover:text-primary">
                      {stud.name}
                    </h4>
                    <span className="text-[10px] font-mono text-muted-text">{stud.rollNumber}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border-color/40">
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 font-mono border rounded-full ${perf.bg} ${perf.text} flex items-center gap-1.5`}
                  >
                    <span className={`w-1.2 h-1.2 rounded-full ${perf.dot} inline-block`}></span>
                    {stud.performanceIndicator}
                  </span>

                  <span className="text-[10px] font-mono text-secondary-text bg-elevated/55 px-1.5 py-0.2 rounded border border-border-color/40">
                    {stud.attendance ?? 100}% attendance
                  </span>
                </div>

                {stud.isPending && (
                  <div
                    className="absolute inset-0 bg-background/80 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-1.5 p-2 animate-fade-in"
                    title="Sending invitation and enrolling student..."
                  >
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-[10px] font-mono font-medium text-primary tracking-wide animate-pulse">
                      Inviting...
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Extracted Student Dossier Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          classItem={classItem}
          previousStudent={previousStudent}
          nextStudent={nextStudent}
          onClose={() => setSelectedStudentId(null)}
          onSelectStudent={(id) => setSelectedStudentId(id)}
          onUpdateStudentDetails={handleUpdateStudentDetails}
          onRequestDeleteStudent={(id) => setStudentToDelete(id)}
          onOpenGradingModal={(sub, mat) =>
            setGradingModalState({
              student: selectedStudent,
              submission: sub,
              material: mat,
            })
          }
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenReportCard={(id) => setReportCardStudentId(id)}
          onTriggerToast={onTriggerToast}
        />
      )}

      {/* Add Student Prompt Modal */}
      {isAddStudentPromptOpen && (
        <Modal
          isOpen={isAddStudentPromptOpen}
          onClose={() => setIsAddStudentPromptOpen(false)}
          size="sm"
        >
          <ModalHeader
            title="Add New Student"
            subtitle="Enter the student's name and email to invite and enroll them."
            icon={<Plus className="w-5 h-5 text-primary" />}
            onClose={() => setIsAddStudentPromptOpen(false)}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const email = formData.get('email') as string;
              if (name && email) {
                handleAddNewStudent({ name, email });
                setIsAddStudentPromptOpen(false);
              }
            }}
          >
            <ModalBody className="p-5 space-y-3">
              <FormField label="Full Name">
                <Input
                  required
                  name="name"
                  placeholder="e.g. Michael Chen"
                  autoFocus
                />
              </FormField>
              <FormField label="Email Address">
                <Input
                  required
                  name="email"
                  type="email"
                  placeholder="e.g. michael.c@school.edu"
                />
              </FormField>
            </ModalBody>
            <ModalFooter className="p-4">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setIsAddStudentPromptOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="xs">
                Invite Student
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Submission Grading Modal */}
      {gradingModalState && (
        <SubmissionGradingModal
          isOpen={!!gradingModalState}
          onClose={() => setGradingModalState(null)}
          student={gradingModalState.student}
          submission={gradingModalState.submission}
          material={gradingModalState.material}
          onSave={handleSaveGradingFromModal}
          onTriggerToast={onTriggerToast}
        />
      )}

      {/* Student Submission Upload Modal */}
      {isUploadModalOpen && (
        <StudentSubmissionUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          classId={classItem.id}
          student={selectedStudent || nonPendingStudents[0] || classItem.students[0]}
          materials={classItem.materials || []}
          onSubmissionCreated={handleSubmissionCreatedFromModal}
          onTriggerToast={onTriggerToast}
        />
      )}

      {/* Attendance Manager Modal */}
      {isAttendanceModalOpen && (
        <AttendanceManagerModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          classId={classItem.id}
          className={classItem.name}
          students={nonPendingStudents}
          onAttendanceUpdated={handleAttendanceUpdatedFromModal}
          onTriggerToast={onTriggerToast}
        />
      )}

      {/* Report Card Modal */}
      {reportCardStudentId && (
        <ReportCardModal
          isOpen={!!reportCardStudentId}
          onClose={() => setReportCardStudentId(null)}
          classItem={classItem}
          initialStudentId={reportCardStudentId}
          onTriggerToast={onTriggerToast}
        />
      )}

      <ConfirmModal
        isOpen={studentToDelete !== null}
        title="Expel Student Records"
        message="Remove this student portfolio entirely from clinical records? This action cannot be undone."
        confirmText="Remove Student"
        isDestructive={true}
        onConfirm={() => {
          if (studentToDelete) handleDeleteStudent(studentToDelete);
          setStudentToDelete(null);
        }}
        onCancel={() => setStudentToDelete(null)}
      />
    </div>
  );
}
