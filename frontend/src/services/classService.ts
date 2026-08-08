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
        institutes ( name, city, state, country ),
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
          instituteName: c.institutes?.name,
          instituteAddress: c.institutes ? [c.institutes.city, c.institutes.state, c.institutes.country].filter(Boolean).join(', ') : undefined,
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
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.instituteId !== undefined) dbUpdates.institute_id = updates.instituteId;
    if (updates.academicYear !== undefined) dbUpdates.academic_year = updates.academicYear;
    if (updates.semester !== undefined) dbUpdates.semester = updates.semester;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName;
    if (updates.teachingStyle !== undefined) dbUpdates.teaching_style = updates.teachingStyle;
    if (updates.experienceLevel !== undefined) dbUpdates.experience_level = updates.experienceLevel;
    if (updates.specialNotes !== undefined) dbUpdates.special_notes = updates.specialNotes;
    if (updates.assessmentPreferences !== undefined) dbUpdates.assessment_preferences = updates.assessmentPreferences;
    if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

    const { error } = await supabase
      .from('classes')
      .update(dbUpdates)
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
