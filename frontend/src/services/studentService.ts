import { supabase } from '../lib/supabase';
import { Student } from '../types/main';

export const studentService = {
  async fetchStudentsForClass(classId: string): Promise<Student[]> {
    // Query class_students and join students
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        performance_tier,
        grades,
        attendance,
        behavioral_notes,
        students (*)
      `)
      .eq('class_id', classId);

    if (error) throw error;

    return data.map((row: any) => {
      const student = row.students;
      return {
        id: student.id,
        name: student.name,
        rollNumber: student.id.substring(0, 8), // Mapped fallback
        email: student.email || '',
        phone: '', // Needs mapping if we add phone
        address: '',
        parentName: '',
        parentContact: '',
        parentNotes: '',
        grades: row.grades || [],
        attendance: 100, // Derived ideally from attendance records
        performanceIndicator: (row.performance_tier?.toLowerCase() || 'average') as any,
        statusIndicator: 'active',
        uploads: [], // Fetch separately or join student_materials
        customFields: [],
        avatarSeed: student.name,
      };
    });
  },

  async addStudentToClass(classId: string, payload: Partial<Student>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    // Insert student globally
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id: user.id,
        name: payload.name,
        email: payload.email,
      })
      .select()
      .single();

    if (studentError) throw studentError;

    // Link to class
    const { error: linkError } = await supabase
      .from('class_students')
      .insert({
        class_id: classId,
        student_id: student.id,
        performance_tier: payload.performanceIndicator || 'average',
        grades: payload.grades || [],
      });


    if (linkError) throw linkError;
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

  async updateGrade(studentMaterialId: string, score: number, feedback: string): Promise<void> {
    const { error } = await supabase
      .from('student_materials')
      .update({
        score,
        feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', studentMaterialId);

    if (error) throw error;
  },

  async updateStudentClassData(classId: string, studentId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('class_students')
      .update({
        performance_tier: updates.performanceIndicator,
        grades: updates.grades,
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
