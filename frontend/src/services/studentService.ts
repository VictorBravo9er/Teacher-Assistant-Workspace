import { supabase } from '../lib/supabase';
import { Student } from '../types/main';

export const studentService = {
  async fetchStudentsForClass(classId: string): Promise<Student[]> {
    // Query class_students and join students
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        performance_tier,
        current_score,
        current_grade,
        general_feedback,
        behavioral_notes,
        students (*)
      `)
      .eq('class_id', classId);

    if (error) throw error;

    // Fetch submissions separately for this class
    const { data: submissionsData, error: subError } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('class_id', classId);

    if (subError) throw subError;

    return data.map((row: any) => {
      const student = row.students;
      
      // Filter submissions for this specific student
      const studentSubs = submissionsData.filter((sub: any) => sub.student_id === student.id);
      return {
        id: student.id,
        name: student.name,
        email: student.email || '',
        learningStyle: student.learning_style || '',
        strengths: student.strengths || [],
        weaknesses: student.weaknesses || [],
        avatarUrl: student.avatar_url || '',
        
        currentScore: row.current_score,
        currentGrade: row.current_grade,
        generalFeedback: row.general_feedback,
        performanceTier: (row.performance_tier || 'Average') as any,
        behavioralNotes: row.behavioral_notes || '',
        
        attendance: 100, // Derived ideally from attendance records
        statusIndicator: 'active',
        submissions: studentSubs.map((sub: any) => ({
          id: sub.id,
          materialId: sub.material_id,
          studentId: sub.student_id,
          content: sub.content || [],
          status: sub.status,
          dueAt: sub.due_at,
          isLate: sub.is_late,
          grade: sub.grade,
          score: sub.score,
          rubricBreakdown: sub.rubric_breakdown,
          feedback: sub.feedback,
          privateTeacherNotes: sub.private_teacher_notes,
          submittedAt: sub.submitted_at,
          reviewedAt: sub.reviewed_at,
        })),
        customFields: [],
        isArchived: student.is_archived || false,
      };
    });
  },

  async addStudentToClass(classId: string, payload: Partial<Student>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    // Invoke the edge function to invite and add the student
    const { data, error: invokeError } = await supabase.functions.invoke('invite-student', {
      body: {
        email: payload.email,
        name: payload.name,
        class_id: classId,
        user_id: user.id,
        learning_style: payload.learningStyle ?? null,
        strengths: payload.strengths ?? [],
        weaknesses: payload.weaknesses ?? [],
        performance_tier: payload.performanceTier ?? 'Average',
        current_score: payload.currentScore ?? null,
        current_grade: payload.currentGrade ?? null,
        general_feedback: payload.generalFeedback ?? '',
        behavioral_notes: payload.behavioralNotes ?? '',
      }
    });

    if (invokeError) throw invokeError;
    if (data?.error) throw new Error(data.error);
  },

  async updateAttendance(classId: string, studentId: string, date: string, status: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_records')
      .insert({
        class_id: classId,
        student_id: studentId,
        date: date,
        status: status,
        notes: notes,
      });

    if (error) throw error;
  },

  async updateGrade(studentSubmissionId: string, score: number, feedback: string, grade: string): Promise<void> {
    const { error } = await supabase
      .from('student_submissions')
      .update({
        score,
        grade,
        feedback,
        status: 'Graded',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', studentSubmissionId);

    if (error) throw error;
  },

  async updateStudentClassData(classId: string, studentId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('class_students')
      .update({
        performance_tier: updates.performanceTier,
        current_score: updates.currentScore,
        current_grade: updates.currentGrade,
        general_feedback: updates.generalFeedback,
        behavioral_notes: updates.behavioralNotes,
      })
      .eq('class_id', classId)
      .eq('student_id', studentId);
      
    if (error) throw error;
  },

  async removeStudentFromClass(classId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('class_students')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId);
      
    if (error) throw error;
  }
};
