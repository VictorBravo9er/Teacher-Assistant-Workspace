import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { NotificationLog } from '@/types/main';

export const notificationService = {
  /**
   * Dispatches announcement notification via Supabase Edge Function.
   */
  async notifyAnnouncement(
    announcementId: string,
    classId: string,
    notifyParents: boolean = false
  ): Promise<void> {
    return logger.measure('NOTIFICATION', `notifyAnnouncement:${announcementId}`, async () => {
      try {
        const { error } = await supabase.functions.invoke('notify-announcement', {
          body: {
            announcement_id: announcementId,
            class_id: classId,
            notify_parents: notifyParents,
          },
        });
        if (error) {
          logger.warn('NOTIFICATION', 'Edge function notify-announcement returned error (may not be deployed yet)', { error });
        }
      } catch (err) {
        logger.warn('NOTIFICATION', 'Failed to invoke notify-announcement (graceful fallback)', { err });
      }
    });
  },

  /**
   * Dispatches material publication/update notification via Supabase Edge Function.
   */
  async notifyMaterial(
    materialId: string,
    classId: string,
    eventType: 'published' | 'updated',
    notifyParents: boolean = false
  ): Promise<void> {
    return logger.measure('NOTIFICATION', `notifyMaterial:${materialId}`, async () => {
      try {
        const { error } = await supabase.functions.invoke('notify-material', {
          body: {
            material_id: materialId,
            class_id: classId,
            event_type: eventType,
            notify_parents: notifyParents,
          },
        });
        if (error) {
          logger.warn('NOTIFICATION', 'Edge function notify-material returned error', { error });
        }
      } catch (err) {
        logger.warn('NOTIFICATION', 'Failed to invoke notify-material (graceful fallback)', { err });
      }
    });
  },

  /**
   * Dispatches student submission turn-in notification to teacher via Supabase Edge Function.
   */
  async notifySubmission(submissionId: string, classId: string): Promise<void> {
    return logger.measure('NOTIFICATION', `notifySubmission:${submissionId}`, async () => {
      try {
        const { error } = await supabase.functions.invoke('notify-submission', {
          body: {
            submission_id: submissionId,
            class_id: classId,
          },
        });
        if (error) {
          logger.warn('NOTIFICATION', 'Edge function notify-submission returned error', { error });
        }
      } catch (err) {
        logger.warn('NOTIFICATION', 'Failed to invoke notify-submission (graceful fallback)', { err });
      }
    });
  },

  /**
   * Fetches notification logs for a class to display delivery transparency.
   */
  async fetchNotificationLogs(classId: string): Promise<NotificationLog[]> {
    return logger.measure('NOTIFICATION', `fetchNotificationLogs:${classId}`, async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('NOTIFICATION', 'Failed to fetch notification logs', { error, classId });
        return [];
      }

      if (!data) return [];

      return data.map((row: any) => ({
        id: row.id,
        classId: row.class_id,
        announcementId: row.announcement_id,
        materialId: row.material_id,
        submissionId: row.submission_id,
        notificationType: row.notification_type,
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
        recipientType: row.recipient_type,
        studentId: row.student_id,
        resendEmailId: row.resend_email_id,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    });
  },
};
