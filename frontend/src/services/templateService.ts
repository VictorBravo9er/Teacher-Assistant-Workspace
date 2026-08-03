import { supabase } from '../lib/supabase';
import { Template, Instruction, Material } from '../types/main';

export const templateService = {
  async fetchTemplates(): Promise<Template[]> {
    const { data, error } = await supabase
      .from('templates')
      .select(`
        *,
        template_instructions ( instructions (*) ),
        template_materials ( materials (*) )
      `);

    if (error) throw error;

    return data.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      subject: t.subject || '',
      teachingStyle: t.teaching_style || '',
      instructions: (t.template_instructions || []).map((ti: any) => ({
        type: ti.instructions.type || 'global',
        title: ti.instructions.title,
        content: ti.instructions.content,
      })),
      materialsPreset: (t.template_materials || []).map((tm: any) => ({
        name: tm.materials.name,
        type: 'pdf', // derived ideally
        size: tm.materials.size || '0 MB',
        tags: tm.materials.tags || [],
      })),
    }));
  },

  async createTemplate(payload: Partial<Template>): Promise<Template> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name: payload.name,
        description: payload.description,
        subject: payload.subject,
        teaching_style: payload.teachingStyle,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      subject: data.subject || '',
      teachingStyle: data.teaching_style || '',
      instructions: payload.instructions || [],
      materialsPreset: payload.materialsPreset || [],
    };
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

