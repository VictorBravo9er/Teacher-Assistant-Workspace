import { supabase } from '../lib/supabase';
import { ClassModel, Material, Instruction, Student, RAGSession } from '../types/main';
import { studentService } from './studentService';
import { chatService } from './chatService';

export const classService = {
  async fetchClasses(): Promise<ClassModel[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_materials ( materials (*) ),
        class_instructions ( instructions (*) )
      `)
      .eq('user_id', user.id)
      .eq('archived', false);

    if (error) throw error;

    const classes: ClassModel[] = await Promise.all(
      data.map(async (c: any) => {
        // Fetch students and sessions in parallel for each class
        // In a real optimized scenario, we'd probably want to lazy load these or do a more complex join, 
        // but for now we follow the existing model structure.
        const [students, ragSessions] = await Promise.all([
          studentService.fetchStudentsForClass(c.id).catch(() => [] as Student[]),
          chatService.fetchSessions(c.id).catch(() => [] as RAGSession[])
        ]);

        return {
          id: c.id,
          instituteId: c.institute_id,
          name: c.name,
          academicYear: c.academic_year || '',
          semester: c.semester || '',
          subject: c.subject || '',
          teacherName: c.teacher_name || '',
          teachingStyle: c.teaching_style || '',
          experienceLevel: c.experience_level || '',
          specialNotes: c.special_notes || '',
          assessmentPreferences: c.assessment_preferences || '',
          archived: c.archived || false,
          
          materials: (c.class_materials || []).map((cm: any) => {
            const m = cm.materials;
            return {
              id: m.id,
              name: m.name,
              type: m.content_type === 'file' && m.name.endsWith('.pdf') ? 'pdf' : 'custom',
              uploadDate: m.created_at,
              size: m.size || '0 MB',
              tags: m.tags || [],
            } as Material;
          }),

          instructions: (c.class_instructions || []).map((ci: any) => {
            const i = ci.instructions;
            return {
              id: i.id,
              title: i.title,
              type: i.type || 'global',
              content: i.content,
            } as Instruction;
          }),

          students,
          ragSessions,
        };
      })
    );

    return classes;
  },

  async createClass(payload: Partial<ClassModel>): Promise<ClassModel> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const { data: c, error } = await supabase
      .from('classes')
      .insert({
        user_id: user.id,
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
      .select()
      .single();

    if (error) throw error;

    return {
      id: c.id,
      instituteId: c.institute_id,
      name: c.name,
      academicYear: c.academic_year || '',
      semester: c.semester || '',
      subject: c.subject || '',
      teacherName: c.teacher_name || '',
      teachingStyle: c.teaching_style || '',
      experienceLevel: c.experience_level || '',
      specialNotes: c.special_notes || '',
      assessmentPreferences: c.assessment_preferences || '',
      archived: c.archived || false,
      materials: payload.materials || [],
      instructions: payload.instructions || [],
      students: [],
      ragSessions: [],
    };
  },

  async updateClass(classId: string, updates: Partial<ClassModel>): Promise<void> {
    const { error } = await supabase
      .from('classes')
      .update({
        name: updates.name,
        academic_year: updates.academicYear,
        semester: updates.semester,
        subject: updates.subject,
        teacher_name: updates.teacherName,
        teaching_style: updates.teachingStyle,
        experience_level: updates.experienceLevel,
        special_notes: updates.specialNotes,
        assessment_preferences: updates.assessmentPreferences,
        archived: updates.archived,
      })
      .eq('id', classId);

    if (error) throw error;
  },

  async deleteClass(classId: string): Promise<void> {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) throw error;
  }
};
