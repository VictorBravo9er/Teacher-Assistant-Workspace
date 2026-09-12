import { supabase } from '@/lib/supabase';
import { Material, ContentCategory, ContentItem } from '@/types/main';

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
      rubricCriteria?: any[];
    }
  ): Promise<Material> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const materialId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const storagePath = `${user.id}/${materialId}/${itemId}`;

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
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
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
      rubric_criteria: options?.rubricCriteria || null,
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
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      tags: insertedMat.tags || [],
      dueAt: insertedMat.due_at || undefined,
      maxScore: insertedMat.max_score || undefined,
      toBeScored: insertedMat.to_be_scored || false,
      rubricCriteria: insertedMat.rubric_criteria || undefined,
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
      rubricCriteria: insertedMat.rubric_criteria || undefined,
    };
  },

  /**
   * Check if a material is shared across multiple classes or templates.
   */
  async checkMaterialSharing(materialId: string): Promise<{ isShared: boolean; classCount: number; templateCount: number }> {
    const [{ count: classCount }, { count: templateCount }] = await Promise.all([
      supabase.from('class_materials').select('*', { count: 'exact', head: true }).eq('material_id', materialId),
      supabase.from('template_materials').select('*', { count: 'exact', head: true }).eq('material_id', materialId),
    ]);

    const total = (classCount || 0) + (templateCount || 0);
    return {
      isShared: total > 1,
      classCount: classCount || 0,
      templateCount: templateCount || 0,
    };
  },

  /**
   * Update or attach a Rubric to an existing Material, supporting Public (Base) vs Class-Private augmentation.
   */
  async updateMaterialRubric(
    materialId: string,
    criteria: RubricCriterion[],
    maxScore?: number,
    classId?: string
  ): Promise<void> {
    const publicCriteria = criteria.filter((c) => !c.isPrivate);
    const privateCriteria = criteria.filter((c) => c.isPrivate);

    // 1. Update public/base criteria in canonical materials table
    const payload: any = {
      rubric_criteria: publicCriteria.length > 0 ? publicCriteria : (privateCriteria.length > 0 ? [] : null),
    };
    if (maxScore !== undefined) {
      payload.max_score = maxScore;
    }

    const { error: matError } = await supabase
      .from('materials')
      .update(payload)
      .eq('id', materialId);

    if (matError) {
      console.error("Database error updating material rubric:", matError);
      throw matError;
    }

    // 2. If classId provided, update custom_rubric_criteria in class_materials
    if (classId) {
      const { error: linkError } = await supabase
        .from('class_materials')
        .update({
          custom_rubric_criteria: privateCriteria.length > 0 ? privateCriteria : null,
        })
        .eq('class_id', classId)
        .eq('material_id', materialId);

      if (linkError) {
        console.error("Database error updating class custom rubric:", linkError);
        throw linkError;
      }
    }
  },

  /**
   * Add a content item to a material, optionally routing to class_materials.custom_content if private.
   */
  async addMaterialContent(
    materialId: string,
    item: { name: string; url?: string; file?: File },
    options: { classId?: string; isClassPrivate?: boolean }
  ): Promise<ContentItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const itemId = crypto.randomUUID();
    let storagePath: string | undefined = undefined;

    if (item.file) {
      storagePath = `${user.id}/${materialId}/${itemId}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, item.file);

      if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const newItem: ContentItem = {
      id: itemId,
      name: item.name.trim(),
      type: item.file ? 'File' : 'URL',
      path: item.file ? storagePath : (item.url || 'https://example.com'),
      size_bytes: item.file?.size,
      mime_type: item.file?.type || (item.file ? 'application/octet-stream' : undefined),
      description: item.file ? `Uploaded file for ${item.name}` : `Web resource: ${item.url}`,
      isPrivate: options.isClassPrivate || false,
      isShared: !options.isClassPrivate,
    };

    if (options.isClassPrivate && options.classId) {
      // Fetch current custom_content
      const { data: linkData } = await supabase
        .from('class_materials')
        .select('custom_content')
        .eq('class_id', options.classId)
        .eq('material_id', materialId)
        .single();

      const existingCustom: ContentItem[] = Array.isArray(linkData?.custom_content) ? linkData.custom_content : [];
      const updatedCustom = [...existingCustom, newItem];

      const { error: updateLinkErr } = await supabase
        .from('class_materials')
        .update({ custom_content: updatedCustom })
        .eq('class_id', options.classId)
        .eq('material_id', materialId);

      if (updateLinkErr) throw updateLinkErr;
    } else {
      // Fetch current canonical content
      const { data: matData } = await supabase
        .from('materials')
        .select('content')
        .eq('id', materialId)
        .single();

      const existingCanonical: ContentItem[] = Array.isArray(matData?.content) ? matData.content : [];
      const updatedCanonical = [...existingCanonical, newItem];

      const { error: updateMatErr } = await supabase
        .from('materials')
        .update({ content: updatedCanonical })
        .eq('id', materialId);

      if (updateMatErr) throw updateMatErr;
    }

    return newItem;
  },

  /**
   * Fetch signed download URLs for a material via Edge Function or client SDK fallback.
   */
  async getMaterialDownloadUrl(
    materialId: string,
    classId?: string,
    storagePath?: string,
    contentItemId?: string
  ): Promise<string> {
    if (classId) {
      try {
        const { data, error } = await supabase.functions.invoke('get-material-url', {
          body: {
            material_id: materialId,
            class_id: classId,
            content_item_id: contentItemId,
          },
        });

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }

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
      if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        return storagePath;
      }
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
   * Unlink a material from a specific class without deleting the material globally.
   */
  async unlinkMaterialFromClass(classId: string, materialId: string): Promise<void> {
    const { error } = await supabase.rpc('unlink_material_from_class', {
      p_class_id: classId,
      p_material_id: materialId,
    });

    if (error) {
      // Fallback to direct DELETE on class_materials
      const { error: directErr } = await supabase
        .from('class_materials')
        .delete()
        .eq('class_id', classId)
        .eq('material_id', materialId);

      if (directErr) {
        throw new Error(`Failed to unlink material: ${directErr.message}`);
      }
    }
  },

  /**
   * Soft-archive a material so it is hidden but historical submissions are preserved.
   */
  async archiveMaterial(materialId: string): Promise<void> {
    const { error } = await supabase
      .from('materials')
      .update({ is_archived: true })
      .eq('id', materialId);

    if (error) {
      throw new Error(`Failed to archive material: ${error.message}`);
    }
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
   * Fork material for a new class by creating an independent material record (reusing storage files).
   */
  async forkMaterial(classId: string, material: Material): Promise<Material> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated user");

    const newMaterialId = crypto.randomUUID();
    const materialInsertPayload: any = {
      id: newMaterialId,
      user_id: user.id,
      name: material.name,
      category: material.category || 'Study Material',
      content: material.content || [],
      tags: material.tags || ['General'],
      due_at: material.dueAt || null,
      max_score: material.maxScore ?? 100,
      to_be_scored: material.toBeScored ?? false,
      rubric_criteria: material.rubricCriteria || null,
    };

    const { data: insertedMat, error: insertError } = await supabase
      .from('materials')
      .insert(materialInsertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Fork material insert failed:", insertError);
      throw new Error(`Failed to fork material: ${insertError.message}`);
    }

    // Link new independent material to target class
    const { error: linkError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        material_id: newMaterialId,
      });

    if (linkError) {
      console.error("Class link error on fork:", linkError);
      throw new Error(`Failed to link forked material: ${linkError.message}`);
    }

    return {
      id: insertedMat.id,
      name: insertedMat.name,
      category: insertedMat.category as ContentCategory,
      content: insertedMat.content as ContentItem[],
      uploadDate: insertedMat.created_at,
      size: material.size || '0 MB',
      tags: insertedMat.tags || [],
      dueAt: insertedMat.due_at || undefined,
      maxScore: insertedMat.max_score || undefined,
      toBeScored: insertedMat.to_be_scored || false,
      rubricCriteria: insertedMat.rubric_criteria || undefined,
    };
  },

  /**
   * Link an existing material directly to a class as a shared reference.
   */
  async linkSharedMaterial(classId: string, material: Material): Promise<Material> {
    const { error: linkError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        material_id: material.id,
      });

    if (linkError) {
      console.warn("Class link error on shared link:", linkError);
    }

    return { ...material };
  },

  /**
   * Duplicate material (defaults to forking for complete class-level rubric isolation).
   */
  async duplicateMaterial(classId: string, material: Material, fork: boolean = true): Promise<Material> {
    if (fork) {
      return this.forkMaterial(classId, material);
    }
    return this.linkSharedMaterial(classId, material);
  }
};
