import React, { useState, useEffect } from 'react';
import {
  Student,
  AttendanceRecord,
  AttendanceStatus,
} from '@/types/main';
import { studentService } from '@/services/studentService';
import { calculateAttendanceRate } from '@/lib/studentCalculations';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Save,
  UserCheck,
} from 'lucide-react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';

interface AttendanceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  students: Student[];
  onAttendanceUpdated: (updatedStudents: Student[]) => void;
  onTriggerToast?: (msg: string) => void;
}

export default function AttendanceManagerModal({
  isOpen,
  onClose,
  classId,
  className,
  students,
  onAttendanceUpdated,
  onTriggerToast,
}: AttendanceManagerModalProps) {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const map: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students.forEach((stud) => {
      const record = (stud.attendanceRecords || []).find((r) => r.date === selectedDate);
      if (record) {
        map[stud.id] = { status: record.status, notes: record.notes || '' };
      } else {
        map[stud.id] = { status: 'Present', notes: '' };
      }
    });
    setAttendanceMap(map);
  }, [selectedDate, students]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students.forEach((s) => {
      updated[s.id] = { status, notes: attendanceMap[s.id]?.notes || '' };
    });
    setAttendanceMap(updated);
  };

  const values = Object.values(attendanceMap);
  const totalCount = students.length;
  const presentCount = values.filter((v) => v.status === 'Present').length;
  const lateCount = values.filter((v) => v.status === 'Late').length;
  const absentCount = values.filter((v) => v.status === 'Absent').length;
  const excusedCount = values.filter((v) => v.status === 'Excused').length;
  const effectivePresentPct =
    totalCount > 0
      ? Math.round(((presentCount + excusedCount + lateCount * 0.5) / totalCount) * 100)
      : 100;

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const recordsToInsert = students.map((s) => ({
        studentId: s.id,
        date: selectedDate,
        status: attendanceMap[s.id]?.status || 'Present',
        notes: attendanceMap[s.id]?.notes || undefined,
      }));

      await studentService.bulkLogAttendance(classId, recordsToInsert);

      const updatedStudents = students.map((s) => {
        const studentRecord: AttendanceRecord = {
          classId,
          studentId: s.id,
          date: selectedDate,
          status: attendanceMap[s.id]?.status || 'Present',
          notes: attendanceMap[s.id]?.notes || undefined,
        };

        const existingRecords = (s.attendanceRecords || []).filter(
          (r) => r.date !== selectedDate
        );
        const allRecords = [...existingRecords, studentRecord];
        const newPct = calculateAttendanceRate(allRecords);

        return {
          ...s,
          attendance: newPct,
          attendanceRecords: allRecords,
        };
      });

      onAttendanceUpdated(updatedStudents);
      if (onTriggerToast) onTriggerToast(`Attendance saved for ${selectedDate}!`);
      onClose();
    } catch (err: any) {
      if (onTriggerToast) onTriggerToast(`Failed to save attendance: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions: { label: AttendanceStatus; color: string; activeColor: string; icon: any }[] = [
    {
      label: 'Present',
      color: 'hover:bg-success/15 hover:text-success border-success/20 text-muted-text',
      activeColor: 'bg-success text-white border-success shadow-sm',
      icon: CheckCircle2,
    },
    {
      label: 'Late',
      color: 'hover:bg-warning/15 hover:text-warning border-warning/20 text-muted-text',
      activeColor: 'bg-warning text-white border-warning shadow-sm',
      icon: Clock,
    },
    {
      label: 'Absent',
      color: 'hover:bg-error/15 hover:text-error border-error/20 text-muted-text',
      activeColor: 'bg-error text-white border-error shadow-sm',
      icon: XCircle,
    },
    {
      label: 'Excused',
      color: 'hover:bg-primary/15 hover:text-primary border-primary/20 text-muted-text',
      activeColor: 'bg-primary text-white border-primary shadow-sm',
      icon: ShieldAlert,
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="attendance-manager-modal" size="lg">
      <ModalHeader
        title="Class Attendance & Daily Register"
        subtitle={`${className} • ${students.length} Students Enrolled`}
        icon={<UserCheck className="w-5 h-5 text-primary" />}
        onClose={onClose}
      >
        <div className="flex items-center gap-2 bg-surface border border-border-color rounded-xl px-3 py-1.5 shadow-sm mr-2">
          <Calendar className="w-4 h-4 text-primary" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs text-primary-text font-mono font-semibold focus:outline-none cursor-pointer"
          />
        </div>
      </ModalHeader>

      {/* Quick Bulk Actions & Stats Banner */}
      <div className="p-4 border-b border-border-color bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-text font-semibold">Bulk Set:</span>
          <button
            onClick={() => handleMarkAll('Present')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-success/10 hover:bg-success/20 text-success border border-success/30 transition-colors cursor-pointer"
          >
            Mark All Present
          </button>
          <button
            onClick={() => handleMarkAll('Absent')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-error/10 hover:bg-error/20 text-error border border-error/30 transition-colors cursor-pointer"
          >
            Mark All Absent
          </button>
          <button
            onClick={() => handleMarkAll('Excused')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors cursor-pointer"
          >
            Mark All Excused
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-success font-bold">{presentCount} Present</span>
          <span className="text-muted-text">•</span>
          <span className="text-warning font-bold">{lateCount} Late</span>
          <span className="text-muted-text">•</span>
          <span className="text-error font-bold">{absentCount} Absent</span>
          <span className="text-muted-text">•</span>
          <span className="text-primary font-bold">{effectivePresentPct}% Cohort Rate</span>
        </div>
      </div>

      <ModalBody className="p-5 space-y-3">
        {students.map((student) => {
          const currentEntry = attendanceMap[student.id] || { status: 'Present', notes: '' };

          return (
            <div
              key={student.id}
              className="bg-elevated/40 border border-border-color rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs font-display">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary-text font-display">
                    {student.name}
                  </h4>
                  <span className="text-[10px] font-mono text-muted-text">
                    Roll: {student.rollNumber || '—'} • Cumulative: {student.attendance || 100}%
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-surface border border-border-color rounded-xl p-1 gap-1">
                  {statusOptions.map((opt) => {
                    const isSelected = currentEntry.status === opt.label;
                    const Icon = opt.icon;

                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleStatusChange(student.id, opt.label)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected ? opt.activeColor : opt.color
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Notes (e.g. Doctor note, field trip)"
                  value={currentEntry.notes}
                  onChange={(e) => handleNotesChange(student.id, e.target.value)}
                  className="w-48 bg-surface border border-border-color rounded-xl px-2.5 py-1 text-xs text-primary-text placeholder-muted-text focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>
          );
        })}
      </ModalBody>

      <ModalFooter className="p-4 justify-between">
        <span className="text-xs text-muted-text font-mono">
          Ready to commit {students.length} student records for <strong>{selectedDate}</strong>
        </span>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAttendance}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Commit Attendance
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
