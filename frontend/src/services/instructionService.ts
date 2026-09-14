import { supabase } from '@/lib/supabase';
import { Instruction } from '@/types/main';
import { logger } from '@/lib/logger';

export const instructionService = {
  async fetchInstructionsForClass(classId: string): Promise<Instruction[]> {
    return logger.measure('INSTRUCTION_SERVICE', `fetchInstructionsForClass:${classId}`, async () => {
      const { data, error } = await supabase
        .from('class_instructions')
        .select(`
          instructions (*)
        `)
        .eq('class_id', classId);

      if (error) {
        logger.error('INSTRUCTION_SERVICE', `Failed to fetch instructions for class ${classId}`, error);
        throw error;
      }

      return (data || []).map((row: any) => {
        const i = row.instructions;
        return {
          id: i.id,
          title: i.title,
          type: i.type,
          content: i.content,
          whenToApply: i.when_to_apply,
        } as Instruction;
      });
    });
  },

  async createInstruction(classId: string, payload: Omit<Instruction, 'id'>): Promise<Instruction> {
    return logger.measure('INSTRUCTION_SERVICE', `createInstruction:${classId}`, async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated user");

      // 1. Insert into public.instructions
      const { data: instruction, error: dbError } = await supabase
        .from('instructions')
        .insert({
          user_id: user.id,
          title: payload.title || 'Custom Instruction',
          type: payload.type || 'System Persona', // Should match enum
          content: payload.content || '',
          when_to_apply: payload.whenToApply,
        })
        .select()
        .single();

      if (dbError) {
        logger.error('INSTRUCTION_SERVICE', 'Failed to insert instruction', dbError);
        throw dbError;
      }

      // 2. Link instruction to class in public.class_instructions
      const { error: linkError } = await supabase
        .from('class_instructions')
        .insert({
          class_id: classId,
          instruction_id: instruction.id,
        });

      if (linkError) {
        logger.error('INSTRUCTION_SERVICE', `Failed to link instruction ${instruction.id} to class ${classId}`, linkError);
        throw linkError;
      }

      return {
        id: instruction.id,
        title: instruction.title,
        type: instruction.type,
        content: instruction.content,
        whenToApply: instruction.when_to_apply,
      };
    });
  },

  async deleteInstruction(classId: string, instructionId: string): Promise<void> {
    return logger.measure('INSTRUCTION_SERVICE', `deleteInstruction:${instructionId}`, async () => {
      // 1. Unlink from class_instructions
      const { error: linkError } = await supabase
        .from('class_instructions')
        .delete()
        .eq('class_id', classId)
        .eq('instruction_id', instructionId);

      if (linkError) {
        logger.error('INSTRUCTION_SERVICE', 'Error removing link from class_instructions', linkError);
      }

      // 2. Delete from instructions table
      const { error: dbError } = await supabase
        .from('instructions')
        .delete()
        .eq('id', instructionId);

      if (dbError) {
        logger.error('INSTRUCTION_SERVICE', `Failed to delete instruction ${instructionId}`, dbError);
        throw dbError;
      }
    });
  }
};
