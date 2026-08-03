import { supabase } from '../lib/supabase';
import { Material } from '../types/main';

export const materialService = {
  async uploadMaterial(classId: string, file: File): Promise<Material> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${user.id}/${classId}/${fileName}`;

    // 1. Upload to Supabase Storage Bucket
    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    // Determine type
    const typeMap: Record<string, string> = {
      pdf: 'pdf',
      doc: 'doc',
      docx: 'doc',
    };
    const materialType = (fileExt && typeMap[fileExt.toLowerCase()]) ? typeMap[fileExt.toLowerCase()] : 'custom';

    // 2. Insert metadata into public.materials table
    const { data: material, error: dbError } = await supabase
      .from('materials')
      .insert({
        user_id: user.id,
        name: file.name,
        category: 'study_material',
        content_type: 'file',
        storage_paths: [storagePath],
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        tags: [],
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Link material to class
    const { error: linkError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        material_id: material.id,
      });

    if (linkError) throw linkError;

    return {
      id: material.id,
      name: material.name,
      type: materialType as any,
      uploadDate: material.created_at,
      size: material.size || '0 MB',
      tags: material.tags || [],
    };
  },

  async getMaterialDownloadUrl(storagePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from('materials')
      .createSignedUrl(storagePath, 60 * 60); // 1 hour

    if (!data?.signedUrl) throw new Error("Could not generate download URL");
    return data.signedUrl;
  },

  async uploadMaterialFile(classId: string, file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${user.id}/${classId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(storagePath, file);

    if (uploadError) throw uploadError;
    return storagePath;
  },

  async createMaterial(classId: string, payload: Partial<Material> & { url?: string }): Promise<Material> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const storagePaths = payload.url ? [payload.url] : [];

    const { data: material, error: dbError } = await supabase
      .from('materials')
      .insert({
        user_id: user.id,
        name: payload.name || 'Untitled Document',
        category: 'study_material',
        content_type: payload.url ? 'file' : 'link',
        storage_paths: storagePaths,
        size: payload.size || '0 MB',
        tags: payload.tags || [],
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const { error: linkError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        material_id: material.id,
      });

    if (linkError) throw linkError;

    return {
      id: material.id,
      name: material.name,
      type: (payload.type || 'pdf') as any,
      uploadDate: material.created_at,
      size: material.size || '0 MB',
      tags: material.tags || [],
    };
  },

  async deleteMaterial(materialId: string): Promise<void> {
    // Unlink and remove material
    await supabase
      .from('class_materials')
      .delete()
      .eq('material_id', materialId);

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (error) throw error;
  }
};

