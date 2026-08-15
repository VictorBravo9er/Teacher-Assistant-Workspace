import { supabase } from '../lib/supabase';
import { Material, ContentCategory, ContentItem } from '../types/main';

const BUCKET_NAME = 'class-materials';

export const materialService = {
  /**
   * Upload a physical file to 'class-materials' bucket & save material record in database.
   */
  async uploadMaterial(
    classId: string,
    file: File,
    options?: {
      name?: string;
      category?: ContentCategory;
      tags?: string[];
      dueAt?: string;
      maxScore?: number;
    }
  ): Promise<Material> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const materialId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const storagePath = `${user.id}/materials/${materialId}/${Date.now()}_${sanitizedFileName}`;

    // 1. Upload to Supabase Storage Bucket 'class-materials'
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file);

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const category: ContentCategory = options?.category || 'Study Material';
    const scoredCategories: ContentCategory[] = ['Assignment', 'Test', 'Exam', 'Practical'];
    const toBeScored = scoredCategories.includes(category);

    const contentItems: ContentItem[] = [
      {
        id: itemId,
        name: file.name,
        type: 'File',
        path: storagePath,
        description: `Uploaded document for ${options?.name || file.name}`
      }
    ];

    // 2. Insert record into public.materials
    const materialInsertPayload: any = {
      id: materialId,
      user_id: user.id,
      name: options?.name?.trim() || file.name,
      category,
      content: contentItems,
      to_be_scored: toBeScored,
      tags: options?.tags || ['General'],
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    };

    if (toBeScored) {
      materialInsertPayload.due_at = options?.dueAt || new Date(Date.now() + 7 * 86400000).toISOString();
      materialInsertPayload.max_score = options?.maxScore ?? 100;
    } else if (options?.dueAt) {
      materialInsertPayload.due_at = options.dueAt;
      materialInsertPayload.max_score = options?.maxScore ?? 100;
    }

    const { data: insertedMat, error: matDbError } = await supabase
      .from('materials')
      .insert(materialInsertPayload)
      .select()
      .single();

    if (matDbError) {
      console.error("Database insert materials failed:", matDbError);
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      throw new Error(`Database error: ${matDbError.message}`);
    }

    // 3. Link to class via public.class_materials
    const { error: linkError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        material_id: materialId,
      });

    if (linkError) {
      console.error("Link class_materials failed:", linkError);
      throw new Error(`Failed to link material to class: ${linkError.message}`);
    }

    return {
      id: insertedMat.id,
      name: insertedMat.name,
      category: insertedMat.category as ContentCategory,
      content: insertedMat.content as ContentItem[],
      uploadDate: insertedMat.created_at,
      size: insertedMat.size || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      tags: insertedMat.tags || [],
      dueAt: insertedMat.due_at || undefined,
      maxScore: insertedMat.max_score || undefined,
      toBeScored: insertedMat.to_be_scored || false,
    };
  },

  /**
   * Create a Web URL or Link material and save record in database.
   */
  async createLinkMaterial(
    classId: string,
    payload: {
      name: string;
      url: string;
      category?: ContentCategory;
      tags?: string[];
      dueAt?: string;
      maxScore?: number;
    }
  ): Promise<Material> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const materialId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const category: ContentCategory = payload.category || 'Link';
    const scoredCategories: ContentCategory[] = ['Assignment', 'Test', 'Exam', 'Practical'];
    const toBeScored = scoredCategories.includes(category);

    const contentItems: ContentItem[] = [
      {
        id: itemId,
        name: payload.name,
        type: 'URL',
        path: payload.url,
        description: `Web link: ${payload.url}`
      }
    ];

    const materialInsertPayload: any = {
      id: materialId,
      user_id: user.id,
      name: payload.name.trim() || 'Untitled Link',
      category,
      content: contentItems,
      to_be_scored: toBeScored,
      tags: payload.tags || ['Web Link'],
      size: '0 MB',
    };

    if (toBeScored) {
      materialInsertPayload.due_at = payload.dueAt || new Date(Date.now() + 7 * 86400000).toISOString();
      materialInsertPayload.max_score = payload.maxScore ?? 100;
    } else if (payload.dueAt) {
      materialInsertPayload.due_at = payload.dueAt;
      materialInsertPayload.max_score = payload.maxScore ?? 100;
    }

    const { data: insertedMat, error: matDbError } = await supabase
      .from('materials')
      .insert(materialInsertPayload)
      .select()
      .single();

    if (matDbError) {
      throw new Error(`Database error: ${matDbError.message}`);
    }

    const { error: linkError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        material_id: materialId,
      });

    if (linkError) {
      throw new Error(`Failed to link link-material to class: ${linkError.message}`);
    }

    return {
      id: insertedMat.id,
      name: insertedMat.name,
      category: insertedMat.category as ContentCategory,
      content: insertedMat.content as ContentItem[],
      uploadDate: insertedMat.created_at,
      size: '0 MB',
      tags: insertedMat.tags || [],
      dueAt: insertedMat.due_at || undefined,
      maxScore: insertedMat.max_score || undefined,
      toBeScored: insertedMat.to_be_scored || false,
    };
  },

  /**
   * Fetch signed download URLs for a material via Edge Function or client SDK fallback.
   */
  async getMaterialDownloadUrl(materialId: string, classId?: string, storagePath?: string): Promise<string> {
    if (classId) {
      try {
        const { data, error } = await supabase.functions.invoke('get-material-url', {
          body: { material_id: materialId, class_id: classId },
        });

        const items = data?.items || data?.urls;
        if (!error && items && items.length > 0) {
          const firstItem = items[0];
          if (firstItem.signedUrl) {
            return firstItem.signedUrl;
          }
        }
      } catch (err) {
        console.warn("Edge Function get-material-url fallback to client SDK:", err);
      }
    }

    // Direct fallback for teacher client if path provided
    if (storagePath) {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, 60 * 60);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    }

    throw new Error("Could not generate signed download URL for material");
  },

  /**
   * Hard-delete a material using delete_material RPC and clean up storage.
   */
  async deleteMaterial(materialId: string): Promise<void> {
    // 1. Call RPC delete_material
    const { data: deletedPaths, error: rpcError } = await supabase.rpc('delete_material', {
      p_material_id: materialId,
    });

    if (rpcError) {
      throw new Error(`Delete material error: ${rpcError.message}`);
    }

    // 2. Remove physical storage objects from bucket 'class-materials'
    if (Array.isArray(deletedPaths) && deletedPaths.length > 0) {
      const { error: storageDelError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(deletedPaths);

      if (storageDelError) {
        console.warn("Storage files removal error:", storageDelError);
      }
    }
  },

  /**
   * Duplicate material for a new class by inserting a link into class_materials.
   */
  async duplicateMaterial(classId: string, material: Material): Promise<Material> {
    const { error: linkError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        material_id: material.id,
      });

    if (linkError) {
      console.warn("Class link error on duplicate:", linkError);
    }

    return { ...material };
  }
};
