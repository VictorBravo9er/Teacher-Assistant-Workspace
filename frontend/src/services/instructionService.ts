import { supabase } from '../lib/supabase';
import { Instruction } from '../types/main';

export const instructionService = {
  async fetchInstructionsForClass(classId: string): Promise<Instruction[]> {
    const { data, error } = await supabase
      .from('class_instructions')
      .select(`
        instructions (*)
      `)
      .eq('class_id', classId);

    if (error) throw error;

    return (data || []).map((row: any) => {
      const i = row.instructions;
      return {
        id: i.id,
        title: i.title,
        type: (i.type || 'global') as any,
        content: i.content,
      } as Instruction;
    });
  },

  async createInstruction(classId: string, payload: Omit<Instruction, 'id'>): Promise<Instruction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    // 1. Insert into public.instructions
    const { data: instruction, error: dbError } = await supabase
      .from('instructions')
      .insert({
        user_id: user.id,
        title: payload.title || 'Custom Instruction',
        type: payload.type || 'global',
        content: payload.content || '',
        is_active: true,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Link instruction to class in public.class_instructions
    const { error: linkError } = await supabase
      .from('class_instructions')
      .insert({
        class_id: classId,
        instruction_id: instruction.id,
      });

    if (linkError) throw linkError;

    return {
      id: instruction.id,
      title: instruction.title,
      type: (instruction.type || 'global') as any,
      content: instruction.content,
    };
  },

  async deleteInstruction(classId: string, instructionId: string): Promise<void> {
    // 1. Unlink from class_instructions
    const { error: linkError } = await supabase
      .from('class_instructions')
      .delete()
      .eq('class_id', classId)
      .eq('instruction_id', instructionId);

    if (linkError) {
      console.error('Error removing link from class_instructions:', linkError);
    }

    // 2. Delete from instructions table
    const { error: dbError } = await supabase
      .from('instructions')
      .delete()
      .eq('id', instructionId);

    if (dbError) throw dbError;
  }
};
