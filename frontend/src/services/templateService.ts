import { supabase } from '@/lib/supabase';
import { Template, Instruction, Material } from '@/types/main';

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
      teachingStyle: t.teaching_style || [],
      assessmentPreferences: t.assessment_preferences || [],
      instructions: (t.template_instructions || []).map((ti: any) => ({
        type: ti.instructions.type || 'global',
        title: ti.instructions.title,
        content: ti.instructions.content,
        whenToApply: ti.instructions.when_to_apply,
      })),
      materialsPreset: (t.template_materials || []).map((tm: any) => ({
        name: tm.materials.name,
        category: tm.materials.category,
        content: tm.materials.content || [],
        size: tm.materials.size || '0 MB',
        tags: tm.materials.tags || [],
        dueAt: tm.materials.due_at,
        maxScore: tm.materials.max_score,
        rubricCriteria: tm.materials.rubric_criteria,
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
        assessment_preferences: payload.assessmentPreferences,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Insert instructions and link to template
    const savedInstructions = [];
    if (payload.instructions && payload.instructions.length > 0) {
      for (const inst of payload.instructions) {
        // Insert into instructions
        const { data: instData, error: instError } = await supabase
          .from('instructions')
          .insert({
            user_id: user.id,
            title: inst.title || 'Custom Instruction',
            type: inst.type || 'System Persona',
            content: inst.content || '',
            when_to_apply: inst.whenToApply,
          })
          .select()
          .single();

        if (instError) throw instError;

        // Link to template
        const { error: linkError } = await supabase
          .from('template_instructions')
          .insert({
            template_id: data.id,
            instruction_id: instData.id,
          });

        if (linkError) throw linkError;
        
        savedInstructions.push({
          type: instData.type,
          title: instData.title,
          content: instData.content,
          whenToApply: instData.when_to_apply,
        });
      }
    }

    // 3. Insert materials and link to template
    const savedMaterials = [];
    if (payload.materialsPreset && payload.materialsPreset.length > 0) {
      for (const mat of payload.materialsPreset) {
        // Insert into materials
        const { data: matData, error: matError } = await supabase
          .from('materials')
          .insert({
            user_id: user.id,
            name: mat.name || 'Untitled Document',
            category: mat.category || 'Study Material',
            content: mat.content || [],
            tags: mat.tags || [],
            due_at: mat.dueAt,
            max_score: mat.maxScore,
            rubric_criteria: mat.rubricCriteria,
          })
          .select()
          .single();

        if (matError) throw matError;

        // Link to template
        const { error: linkError } = await supabase
          .from('template_materials')
          .insert({
            template_id: data.id,
            material_id: matData.id,
          });

        if (linkError) throw linkError;

        savedMaterials.push({
          name: matData.name,
          category: matData.category,
          content: matData.content || [],
          size: matData.size || '0 MB',
          tags: matData.tags || [],
          dueAt: matData.due_at,
          maxScore: matData.max_score,
          rubricCriteria: matData.rubric_criteria,
        });
      }
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      subject: data.subject || '',
      teachingStyle: data.teaching_style || [],
      assessmentPreferences: data.assessment_preferences || [],
      instructions: savedInstructions,
      materialsPreset: savedMaterials,
    };
  },

  async updateTemplate(id: string, payload: Partial<Template>): Promise<Template> {
    const { data, error } = await supabase
      .from('templates')
      .update({
        name: payload.name,
        description: payload.description,
        subject: payload.subject,
        teaching_style: payload.teachingStyle,
        assessment_preferences: payload.assessmentPreferences,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      subject: data.subject || '',
      teachingStyle: data.teaching_style || [],
      assessmentPreferences: data.assessment_preferences || [],
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
