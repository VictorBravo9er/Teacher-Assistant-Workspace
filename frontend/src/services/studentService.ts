import { supabase } from '@/lib/supabase';
import { Student, StudentSubmission, AttendanceRecord, AttendanceStatus, PerformanceTier, ContentItem } from '@/types/main';
import { calculateAttendanceRate } from '@/lib/studentCalculations';

export const studentService = {
  async fetchStudentsForClass(classId: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        learning_style,
        strengths,
        weaknesses,
        performance_tier,
        current_score,
        current_grade,
        general_feedback,
        behavioral_notes,
        students (*)
      `)
      .eq('class_id', classId);

    if (error) throw error;

    const { data: submissionsData, error: subError } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('class_id', classId);

    if (subError) throw subError;

    const { data: attendanceData, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('class_id', classId);

    if (attError) throw attError;

    return (data || []).map((row: any) => {
      const student = row.students || {};
      
      const studentSubs = (submissionsData || []).filter((sub: any) => sub.student_id === student.id);
      
      const studentAttendance: AttendanceRecord[] = (attendanceData || [])
        .filter((att: any) => att.student_id === student.id)
        .map((att: any) => ({
          id: att.id,
          classId: att.class_id,
          studentId: att.student_id,
          date: att.date,
          status: att.status as AttendanceStatus,
          notes: att.notes || undefined,
        }));

      const calculatedAttendance = calculateAttendanceRate(studentAttendance);

      return {
        id: student.id,
        name: student.name || 'Unknown Student',
        email: student.email || '',
        learningStyle: row.learning_style || '',
        strengths: row.strengths || [],
        weaknesses: row.weaknesses || [],
        avatarUrl: student.avatar_url || '',
        
        currentScore: row.current_score !== null ? Number(row.current_score) : undefined,
        currentGrade: row.current_grade || undefined,
        generalFeedback: row.general_feedback || '',
        performanceTier: (row.performance_tier || 'Average') as PerformanceTier,
        behavioralNotes: row.behavioral_notes || '',
        
        attendance: calculatedAttendance,
        attendanceRecords: studentAttendance,
        statusIndicator: 'active',
        submissions: studentSubs.map((sub: any) => ({
          id: sub.id,
          classId: sub.class_id,
          materialId: sub.material_id,
          studentId: sub.student_id,
          content: sub.content || [],
          status: sub.status,
          dueAt: sub.due_at,
          isLate: sub.is_late,
          grade: sub.grade,
          score: sub.score !== null ? Number(sub.score) : undefined,
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

  async addStudentToClass(classId: string, payload: Partial<Student>): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

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

    const studentId = data?.student_id || payload.id;
    return studentId;
  },

  async updateAttendance(classId: string, studentId: string, date: string, status: AttendanceStatus, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_records')
      .upsert(
        {
          class_id: classId,
          student_id: studentId,
          date: date,
          status: status,
          notes: notes || null,
        },
        { onConflict: 'class_id,student_id,date' }
      );

    if (error) throw error;
  },

  async bulkLogAttendance(
    classId: string,
    records: { studentId: string; date: string; status: AttendanceStatus; notes?: string }[]
  ): Promise<void> {
    if (records.length === 0) return;

    const rows = records.map(r => ({
      class_id: classId,
      student_id: r.studentId,
      date: r.date,
      status: r.status,
      notes: r.notes || null,
    }));

    const { error } = await supabase
      .from('attendance_records')
      .upsert(rows, { onConflict: 'class_id,student_id,date' });

    if (error) throw error;
  },

  async fetchAttendanceRecords(classId: string, date?: string): Promise<AttendanceRecord[]> {
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('class_id', classId);

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      classId: r.class_id,
      studentId: r.student_id,
      date: r.date,
      status: r.status as AttendanceStatus,
      notes: r.notes || undefined,
    }));
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

  async saveSubmissionReview(
    studentSubmissionId: string,
    review: {
      classId?: string;
      studentId?: string;
      materialId?: string;
      score: number;
      grade?: string;
      feedback?: string;
      privateTeacherNotes?: string;
      rubricBreakdown?: any[];
      status?: string;
      content?: ContentItem[];
    }
  ): Promise<StudentSubmission> {
    const payload: any = {
      score: review.score,
      grade: review.grade || `${review.score}%`,
      feedback: review.feedback || null,
      private_teacher_notes: review.privateTeacherNotes || null,
      rubric_breakdown: review.rubricBreakdown || [],
      status: review.status || 'Graded',
      reviewed_at: new Date().toISOString(),
    };

    // Check if record exists
    const { data: existing } = await supabase
      .from('student_submissions')
      .select('id')
      .eq('id', studentSubmissionId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('student_submissions')
        .update(payload)
        .eq('id', studentSubmissionId)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        classId: data.class_id,
        studentId: data.student_id,
        materialId: data.material_id,
        content: data.content,
        status: data.status,
        score: data.score,
        grade: data.grade,
        feedback: data.feedback,
        privateTeacherNotes: data.private_teacher_notes,
        rubricBreakdown: data.rubric_breakdown,
        submittedAt: data.submitted_at,
        reviewedAt: data.reviewed_at,
      };
    } else {
      // Insert new submission
      const insertPayload = {
        id: studentSubmissionId,
        class_id: review.classId,
        student_id: review.studentId,
        material_id: review.materialId || null,
        content: review.content || [],
        ...payload,
      };

      const { data, error } = await supabase
        .from('student_submissions')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        classId: data.class_id,
        studentId: data.student_id,
        materialId: data.material_id,
        content: data.content,
        status: data.status,
        score: data.score,
        grade: data.grade,
        feedback: data.feedback,
        privateTeacherNotes: data.private_teacher_notes,
        rubricBreakdown: data.rubric_breakdown,
        submittedAt: data.submitted_at,
        reviewedAt: data.reviewed_at,
      };
    }
  },

  async createStudentSubmission(
    classId: string,
    studentId: string,
    submission: {
      id?: string;
      materialId?: string;
      content: ContentItem[];
      status?: string;
      dueAt?: string;
      score?: number;
      grade?: string;
      feedback?: string;
    }
  ): Promise<StudentSubmission> {
    const newId = submission.id || crypto.randomUUID();

    // Ensure content matches Postgres valid_content_shape constraint
    const normalizedContent = (submission.content || []).map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: item.name || 'Untitled Attachment',
      type: item.type || 'File',
      path: item.path || '',
      description: item.description || '',
    }));

    const insertPayload: any = {
      id: newId,
      class_id: classId,
      student_id: studentId,
      material_id: submission.materialId || null,
      content: normalizedContent,
      status: submission.status || 'Submitted',
      due_at: submission.dueAt || null,
      submitted_at: new Date().toISOString(),
      score: submission.score ?? null,
      grade: submission.grade ?? null,
      feedback: submission.feedback ?? null,
    };

    const { data, error } = await supabase
      .from('student_submissions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      classId: data.class_id,
      studentId: data.student_id,
      materialId: data.material_id,
      content: data.content,
      status: data.status,
      score: data.score,
      grade: data.grade,
      feedback: data.feedback,
      submittedAt: data.submitted_at,
      dueAt: data.due_at,
    };
  },

  async deleteStudentSubmission(studentSubmissionId: string): Promise<void> {
    // 1. Call RPC delete_submission_atomic to delete DB record and get storage paths
    const { data: deletedPaths, error: rpcError } = await supabase.rpc('delete_submission_atomic', {
      p_submission_id: studentSubmissionId,
    });

    if (rpcError) {
      // Fallback: direct delete from table if RPC is not available
      const { error: directError } = await supabase
        .from('student_submissions')
        .delete()
        .eq('id', studentSubmissionId);

      if (directError) throw directError;
    }

    // 2. Remove physical storage files if any were returned
    if (Array.isArray(deletedPaths) && deletedPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('student-submissions')
        .remove(deletedPaths);

      if (storageError) {
        console.warn("Storage submission cleanup warning:", storageError);
      }
    }
  },

  async updateStudentClassData(classId: string, studentId: string, updates: Partial<Student>): Promise<void> {
    const dbUpdates: Record<string, any> = {};
    if (updates.performanceTier !== undefined) dbUpdates.performance_tier = updates.performanceTier;
    if (updates.currentScore !== undefined) dbUpdates.current_score = updates.currentScore;
    if (updates.currentGrade !== undefined) dbUpdates.current_grade = updates.currentGrade;
    if (updates.generalFeedback !== undefined) dbUpdates.general_feedback = updates.generalFeedback;
    if (updates.behavioralNotes !== undefined) dbUpdates.behavioral_notes = updates.behavioralNotes;
    if (updates.learningStyle !== undefined) dbUpdates.learning_style = updates.learningStyle;
    if (updates.strengths !== undefined) dbUpdates.strengths = updates.strengths;
    if (updates.weaknesses !== undefined) dbUpdates.weaknesses = updates.weaknesses;

    const { error } = await supabase
      .from('class_students')
      .update(dbUpdates)
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
  },

  /**
   * Upload a physical file for a student submission to 'student-submissions' bucket.
   * Canonical path: /{material_id}/{content_item_id}
   */
  async uploadSubmissionFile(materialId: string, file: File): Promise<{ itemId: string; storagePath: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const itemId = crypto.randomUUID();
    const storagePath = `${materialId}/${itemId}`;

    const { error: uploadError } = await supabase.storage
      .from('student-submissions')
      .upload(storagePath, file);

    if (uploadError) {
      console.error("Student submission file upload failed:", uploadError);
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    return { itemId, storagePath };
  },

  /**
   * Fetch temporary signed download URL for a file in 'student-submissions' bucket.
   */
  async getSubmissionDownloadUrl(storagePath: string): Promise<string> {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('blob:')) {
      return storagePath;
    }

    const { data, error } = await supabase.storage
      .from('student-submissions')
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }
};
