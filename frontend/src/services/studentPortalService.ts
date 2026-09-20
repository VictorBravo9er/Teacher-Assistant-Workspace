import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Material, Instruction, StudentSubmission, ContentCategory } from '@/types/main';

export interface EnrolledClass {
  id: string;
  name: string;
  subject?: string;
  academicYear?: string;
  semester?: string;
  teacherName?: string;
  instituteName?: string;
  description?: string;
  currentScore?: number;
  currentGrade?: string;
  performanceTier?: string;
  learningStyle?: string;
  generalFeedback?: string;
}

export const studentPortalService = {
  /**
   * Fetches all classes that the student is actively enrolled in.
   */
  async fetchEnrolledClasses(studentId: string): Promise<EnrolledClass[]> {
    return logger.measure('STUDENT_PORTAL', `fetchEnrolledClasses:${studentId}`, async () => {
      const { data, error } = await supabase
        .from('class_students')
        .select(`
          current_score,
          current_grade,
          performance_tier,
          learning_style,
          general_feedback,
          classes (
            id,
            name,
            subject,
            academic_year,
            semester,
            teacher_name,
            is_archived,
            institutes (
              name
            )
          )
        `)
        .eq('student_id', studentId);

      if (error) {
        logger.error('STUDENT_PORTAL', 'Failed to fetch enrolled classes', { error });
        throw error;
      }

      if (!data) return [];

      return data
        .filter((row: any) => row.classes && !row.classes.is_archived)
        .map((row: any) => {
          const c = row.classes;
          return {
            id: c.id,
            name: c.name,
            subject: c.subject || 'General Studies',
            academicYear: c.academic_year,
            semester: c.semester,
            teacherName: c.teacher_name || 'Classroom Instructor',
            instituteName: c.institutes?.name || 'Independent',
            currentScore: row.current_score,
            currentGrade: row.current_grade,
            performanceTier: row.performance_tier || 'Average',
            learningStyle: row.learning_style,
            generalFeedback: row.general_feedback,
          };
        });
    });
  },

  /**
   * Fetches learning materials and assignments assigned to the class.
   */
  async fetchClassMaterials(classId: string): Promise<Material[]> {
    return logger.measure('STUDENT_PORTAL', `fetchClassMaterials:${classId}`, async () => {
      const { data, error } = await supabase
        .from('class_materials')
        .select(`
          custom_content,
          custom_rubric_criteria,
          materials (
            id,
            name,
            category,
            content,
            due_at,
            max_score,
            to_be_scored,
            rubric_criteria,
            tags,
            created_at,
            is_archived
          )
        `)
        .eq('class_id', classId);

      if (error) {
        logger.error('STUDENT_PORTAL', 'Failed to fetch class materials', { error });
        throw error;
      }

      if (!data) return [];

      return data
        .filter((row: any) => row.materials && !row.materials.is_archived)
        .map((row: any) => {
          const m = row.materials;
          return {
            id: m.id,
            name: m.name,
            category: (m.category || 'Study Material') as ContentCategory,
            content: row.custom_content || m.content || [],
            uploadDate: m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Recent',
            dueAt: m.due_at,
            maxScore: m.max_score || 100,
            toBeScored: m.to_be_scored || false,
            rubricCriteria: row.custom_rubric_criteria || m.rubric_criteria || [],
            tags: m.tags || [],
          };
        });
    });
  },

  /**
   * Fetches guidelines/instructions assigned to the class.
   */
  async fetchClassInstructions(classId: string): Promise<Instruction[]> {
    return logger.measure('STUDENT_PORTAL', `fetchClassInstructions:${classId}`, async () => {
      const { data, error } = await supabase
        .from('class_instructions')
        .select(`
          instructions (
            id,
            title,
            type,
            content,
            when_to_apply,
            is_archived
          )
        `)
        .eq('class_id', classId);

      if (error) {
        logger.error('STUDENT_PORTAL', 'Failed to fetch class instructions', { error });
        throw error;
      }

      if (!data) return [];

      return data
        .filter((row: any) => row.instructions && !row.instructions.is_archived)
        .map((row: any) => {
          const inst = row.instructions;
          return {
            id: inst.id,
            title: inst.title,
            type: inst.type,
            content: inst.content,
            whenToApply: inst.when_to_apply,
          };
        });
    });
  },

  /**
   * Fetches submissions made by the active student for this class.
   */
  async fetchMySubmissions(classId: string, studentId: string): Promise<StudentSubmission[]> {
    return logger.measure('STUDENT_PORTAL', `fetchMySubmissions:${classId}:${studentId}`, async () => {
      const { data, error } = await supabase
        .from('student_submissions')
        .select(`
          id,
          class_id,
          student_id,
          material_id,
          content,
          status,
          score,
          grade,
          feedback,
          rubric_breakdown,
          submitted_at,
          materials (
            name,
            max_score,
            due_at
          )
        `)
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (error) {
        logger.error('STUDENT_PORTAL', 'Failed to fetch student submissions', { error });
        throw error;
      }

      if (!data) return [];

      return data.map((row: any) => ({
        id: row.id,
        classId: row.class_id,
        studentId: row.student_id,
        materialId: row.material_id,
        materialName: row.materials?.name || 'Assignment',
        content: row.content || [],
        status: row.status || 'Submitted',
        score: row.score,
        maxScore: row.materials?.max_score || 100,
        grade: row.grade,
        feedback: row.feedback,
        rubric_breakdown: row.rubric_breakdown,
      }));
    });
  },

  /**
   * Submits an assignment (file upload or written text response).
   */
  async submitAssignment(
    classId: string,
    materialId: string,
    studentId: string,
    submission: { file?: File; text?: string }
  ): Promise<StudentSubmission> {
    return logger.measure('STUDENT_PORTAL', `submitAssignment:${classId}:${materialId}`, async () => {
      const contentItemId = crypto.randomUUID();
      const contentList: any[] = [];

      if (submission.file) {
        const file = submission.file;
        const storagePath = `${materialId}/${contentItemId}`;

        const { error: uploadError } = await supabase.storage
          .from('student-submissions')
          .upload(storagePath, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          logger.error('STUDENT_PORTAL', 'Failed to upload submission file', { uploadError });
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        contentList.push({
          id: contentItemId,
          name: file.name,
          type: 'File',
          path: storagePath,
          size_bytes: file.size,
          mime_type: file.type,
        });
      } else if (submission.text && submission.text.trim()) {
        contentList.push({
          id: contentItemId,
          name: 'Written Response',
          type: 'Text',
          path: '',
          value: submission.text.trim(),
          description: 'Student written submission',
        });
      } else {
        throw new Error('Please provide either an attached file or written response.');
      }

      // Check for existing submission to update or insert
      const { data: existing } = await supabase
        .from('student_submissions')
        .select('id, content')
        .eq('class_id', classId)
        .eq('material_id', materialId)
        .eq('student_id', studentId)
        .maybeSingle();

      let resultData: any;

      if (existing?.id) {
        // Merge with existing or overwrite with newly submitted content
        const { data: updated, error: updateError } = await supabase
          .from('student_submissions')
          .update({
            content: contentList,
            status: 'Submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        resultData = updated;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('student_submissions')
          .insert({
            class_id: classId,
            material_id: materialId,
            student_id: studentId,
            content: contentList,
            status: 'Submitted',
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        resultData = inserted;
      }

      // Best-effort non-blocking notification trigger (Plan 08.5 companion)
      try {
        await supabase.functions.invoke('notify-submission', {
          body: { submission_id: resultData.id, class_id: classId },
        });
      } catch {
        // Silently continue if notification function is not yet deployed
      }

      return {
        id: resultData.id,
        classId: resultData.class_id,
        studentId: resultData.student_id,
        materialId: resultData.material_id,
        content: resultData.content,
        status: resultData.status,
        score: resultData.score,
        grade: resultData.grade,
        feedback: resultData.feedback,
      };
    });
  },
};
