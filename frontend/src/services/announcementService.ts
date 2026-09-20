import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Announcement } from '@/types/main';

export const announcementService = {
  /**
   * Fetches all announcements for a class, pinned items first, then descending by creation date.
   */
  async fetchAnnouncements(classId: string): Promise<Announcement[]> {
    return logger.measure('ANNOUNCEMENT', `fetchAnnouncements:${classId}`, async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('class_id', classId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('ANNOUNCEMENT', 'Failed to fetch announcements', { error, classId });
        throw error;
      }

      if (!data) return [];

      return data.map((row: any) => ({
        id: row.id,
        classId: row.class_id,
        authorId: row.author_id,
        title: row.title,
        content: row.content,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    });
  },

  /**
   * Creates a new announcement for a class.
   */
  async createAnnouncement(
    classId: string,
    payload: { title: string; content: string; isPinned?: boolean }
  ): Promise<Announcement> {
    return logger.measure('ANNOUNCEMENT', `createAnnouncement:${classId}`, async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required to post an announcement.');

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          class_id: classId,
          author_id: user.id,
          title: payload.title.trim(),
          content: payload.content.trim(),
          is_pinned: payload.isPinned || false,
        })
        .select()
        .single();

      if (error) {
        logger.error('ANNOUNCEMENT', 'Failed to create announcement', { error, payload });
        throw error;
      }

      return {
        id: data.id,
        classId: data.class_id,
        authorId: data.author_id,
        title: data.title,
        content: data.content,
        isPinned: data.is_pinned,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    });
  },

  /**
   * Updates an announcement (e.g. edit content or toggle pin).
   */
  async updateAnnouncement(
    announcementId: string,
    updates: { title?: string; content?: string; isPinned?: boolean }
  ): Promise<Announcement> {
    return logger.measure('ANNOUNCEMENT', `updateAnnouncement:${announcementId}`, async () => {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
      if (updates.content !== undefined) dbUpdates.content = updates.content.trim();
      if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;

      const { data, error } = await supabase
        .from('announcements')
        .update(dbUpdates)
        .eq('id', announcementId)
        .select()
        .single();

      if (error) {
        logger.error('ANNOUNCEMENT', 'Failed to update announcement', { error, announcementId });
        throw error;
      }

      return {
        id: data.id,
        classId: data.class_id,
        authorId: data.author_id,
        title: data.title,
        content: data.content,
        isPinned: data.is_pinned,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    });
  },

  /**
   * Deletes an announcement.
   */
  async deleteAnnouncement(announcementId: string): Promise<void> {
    return logger.measure('ANNOUNCEMENT', `deleteAnnouncement:${announcementId}`, async () => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) {
        logger.error('ANNOUNCEMENT', 'Failed to delete announcement', { error, announcementId });
        throw error;
      }
    });
  },
};
