import { supabase } from '@/lib/supabase';
import { ClassModel, Material, Instruction, Student, RAGSession } from '@/types/main';
import { studentService } from '@/services/studentService';
import { chatService } from '@/services/chatService';
import { logger } from '@/lib/logger';

function mapDbRowToClassModel(c: any, students: Student[], ragSessions: RAGSession[]): ClassModel {
  return {
    id: c.id,
    instituteId: c.institute_id,
    instituteName: c.institutes?.name,
    instituteAddress: c.institutes ? [c.institutes.city, c.institutes.state, c.institutes.country].filter(Boolean).join(', ') : undefined,
    name: c.name,
    academicYear: c.academic_year || '',
    semester: c.semester || '',
    subject: c.subject || '',
    teacherName: c.teacher_name || '',
    teachingStyle: c.teaching_style || [],
    experienceLevel: c.experience_level || '',
    specialNotes: c.special_notes || '',
    assessmentPreferences: c.assessment_preferences || [],
    isArchived: Boolean(c.is_archived),
    
    materials: (c.class_materials || []).map((cm: any) => {
      const m = cm.materials;
      if (!m) return null;
      const canonicalContent = (m.content || []).map((ci: any) => ({ ...ci, isShared: true }));
      const customContent = (cm.custom_content || []).map((ci: any) => ({ ...ci, isPrivate: true }));
      const mergedContent = [...canonicalContent, ...customContent];

      const canonicalRubric = (m.rubric_criteria || []).map((r: any) => ({ ...r, isPrivate: false }));
      const customRubric = (cm.custom_rubric_criteria || []).map((r: any) => ({ ...r, isPrivate: true }));
      const augmentedRubric = [...canonicalRubric, ...customRubric];

      return {
        id: m.id,
        name: m.name,
        category: m.category,
        content: mergedContent,
        customContent: cm.custom_content || [],
        uploadDate: m.created_at,
        size: m.size,
        tags: m.tags || [],
        dueAt: m.due_at,
        maxScore: m.max_score,
        toBeScored: m.to_be_scored || false,
        rubricCriteria: augmentedRubric,
        customRubricCriteria: cm.custom_rubric_criteria || [],
        versionHistory: m.version_history,
        isShared: true,
      } as Material;
    }).filter(Boolean) as Material[],

    instructions: (c.class_instructions || []).map((ci: any) => {
      const i = ci.instructions;
      return {
        id: i.id,
        title: i.title,
        type: i.type,
        content: i.content,
        whenToApply: i.when_to_apply,
      } as Instruction;
    }),

    students,
    ragSessions,
  };
}

export const classService = {
  async fetchClasses(): Promise<ClassModel[]> {
    return logger.measure('CLASS_SERVICE', 'fetchClasses', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          institutes ( name, city, state, country ),
          class_materials ( custom_content, custom_rubric_criteria, materials (*) ),
          class_instructions ( instructions (*) )
        `)
        .eq('user_id', user.id);

      if (error) {
        logger.error('CLASS_SERVICE', 'Failed to fetch classes', error);
        throw error;
      }

      const classes: ClassModel[] = await Promise.all(
        data.map(async (c: any) => {
          const [students, ragSessions] = await Promise.all([
            studentService.fetchStudentsForClass(c.id).catch(() => [] as Student[]),
            chatService.fetchSessions(c.id).catch(() => [] as RAGSession[])
          ]);
          return mapDbRowToClassModel(c, students, ragSessions);
        })
      );

      return classes;
    });
  },

  async fetchClassById(classId: string): Promise<ClassModel | null> {
    return logger.measure('CLASS_SERVICE', `fetchClassById:${classId}`, async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          institutes ( name, city, state, country ),
          class_materials ( custom_content, custom_rubric_criteria, materials (*) ),
          class_instructions ( instructions (*) )
        `)
        .eq('id', classId)
        .maybeSingle();

      if (error) {
        logger.error('CLASS_SERVICE', `Failed to fetch class ${classId}`, error);
        throw error;
      }

      if (!data) return null;

      const [students, ragSessions] = await Promise.all([
        studentService.fetchStudentsForClass(data.id).catch(() => [] as Student[]),
        chatService.fetchSessions(data.id).catch(() => [] as RAGSession[])
      ]);

      return mapDbRowToClassModel(data, students, ragSessions);
    });
  },

  async createClass(payload: Partial<ClassModel>): Promise<ClassModel> {
    return logger.measure('CLASS_SERVICE', `createClass:${payload.name || 'unnamed'}`, async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated user");

      const { data: c, error } = await supabase
        .from('classes')
        .insert({
          user_id: user.id,
          institute_id: payload.instituteId,
          name: payload.name,
          academic_year: payload.academicYear,
          semester: payload.semester,
          subject: payload.subject,
          teacher_name: payload.teacherName,
          teaching_style: payload.teachingStyle,
          experience_level: payload.experienceLevel,
          special_notes: payload.specialNotes,
          assessment_preferences: payload.assessmentPreferences,
        })
        .select(`
          *,
          institutes ( name, city, state, country )
        `)
        .single();

      if (error) {
        logger.error('CLASS_SERVICE', 'Failed to create class', error);
        throw error;
      }

      return {
        id: c.id,
        instituteId: c.institute_id,
        instituteName: c.institutes?.name,
        instituteAddress: c.institutes ? [c.institutes.city, c.institutes.state, c.institutes.country].filter(Boolean).join(', ') : undefined,
        name: c.name,
        academicYear: c.academic_year || '',
        semester: c.semester || '',
        subject: c.subject || '',
        teacherName: c.teacher_name || '',
        teachingStyle: c.teaching_style || [],
        experienceLevel: c.experience_level || '',
        specialNotes: c.special_notes || '',
        assessmentPreferences: c.assessment_preferences || [],
        isArchived: c.is_archived || false,
        materials: payload.materials || [],
        instructions: payload.instructions || [],
        students: [],
        ragSessions: [],
      };
    });
  },

  async updateClass(classId: string, updates: Partial<ClassModel>): Promise<void> {
    return logger.measure('CLASS_SERVICE', `updateClass:${classId}`, async () => {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.instituteId !== undefined) {
        dbUpdates.institute_id = updates.instituteId;
      } else if (updates.instituteName !== undefined) {
        const trimmed = updates.instituteName.trim();
        if (!trimmed) {
          dbUpdates.institute_id = null;
        } else {
          const { data: found } = await supabase
            .from('institutes')
            .select('id')
            .ilike('name', trimmed)
            .limit(1)
            .maybeSingle();

          if (found?.id) {
            dbUpdates.institute_id = found.id;
          } else {
            const { data: created } = await supabase
              .from('institutes')
              .insert({ name: trimmed })
              .select('id')
              .single();
            if (created?.id) {
              dbUpdates.institute_id = created.id;
            }
          }
        }
      }
      if (updates.academicYear !== undefined) dbUpdates.academic_year = updates.academicYear;
      if (updates.semester !== undefined) dbUpdates.semester = updates.semester;
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName;
      if (updates.teachingStyle !== undefined) dbUpdates.teaching_style = updates.teachingStyle;
      if (updates.experienceLevel !== undefined) dbUpdates.experience_level = updates.experienceLevel;
      if (updates.specialNotes !== undefined) dbUpdates.special_notes = updates.specialNotes;
      const targetArchived = updates.isArchived !== undefined
        ? updates.isArchived
        : (updates as any).archived;
      if (targetArchived !== undefined) dbUpdates.is_archived = targetArchived;

      const { error } = await supabase
        .from('classes')
        .update(dbUpdates)
        .eq('id', classId);

      if (error) {
        logger.error('CLASS_SERVICE', `Failed to update class ${classId}`, error);
        throw error;
      }
    });
  },

  async deleteClass(classId: string): Promise<void> {
    return logger.measure('CLASS_SERVICE', `deleteClass:${classId}`, async () => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) {
        logger.error('CLASS_SERVICE', `Failed to delete class ${classId}`, error);
        throw error;
      }
    });
  }
};
