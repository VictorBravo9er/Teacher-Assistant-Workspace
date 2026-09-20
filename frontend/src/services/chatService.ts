import { supabase } from '@/lib/supabase';
import { RAGSession, Message } from '@/types/main';
import { logger } from '@/lib/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const chatService = {
  async fetchSessions(classId: string): Promise<RAGSession[]> {
    return logger.measure('APP', `fetchSessions:${classId}`, async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('class_id', classId)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('APP', 'Error fetching chat sessions from public.chat_sessions', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title || 'Untitled Chat',
        type: row.type || 'general',
        scopeType: row.scope_type || 'class',
        selectedIds: row.selected_ids || [],
        customInstructions: row.custom_instructions || '',
        messages: row.messages || [],
        createdAt: row.created_at,
        isArchived: row.is_archived || false,
      }));
    });
  },

  async createSession(classId: string, payload: Partial<RAGSession>): Promise<RAGSession> {
    return logger.measure('APP', `createSession:${classId}`, async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated user");

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          class_id: classId,
          user_id: user.id,
          title: payload.title || 'New Conversation',
          type: payload.type || 'general',
          scope_type: payload.scopeType || 'class',
          selected_ids: payload.selectedIds || [],
          custom_instructions: payload.customInstructions || '',
          messages: payload.messages || [],
        })
        .select()
        .single();

      if (error) {
        logger.error('APP', 'Failed to create chat session', error);
        throw error;
      }

      return {
        id: data.id,
        title: data.title,
        type: data.type,
        scopeType: data.scope_type,
        selectedIds: data.selected_ids,
        customInstructions: data.custom_instructions,
        messages: data.messages,
        createdAt: data.created_at,
        isArchived: data.is_archived,
      };
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    return logger.measure('APP', `deleteSession:${sessionId}`, async () => {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        logger.error('APP', `Failed to delete chat session ${sessionId}`, error);
        throw error;
      }
    });
  },

  async updateSession(sessionId: string, updates: Partial<RAGSession>): Promise<void> {
    return logger.measure('APP', `updateSession:${sessionId}`, async () => {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.scopeType !== undefined) dbUpdates.scope_type = updates.scopeType;
      if (updates.selectedIds !== undefined) dbUpdates.selected_ids = updates.selectedIds;
      if (updates.customInstructions !== undefined) dbUpdates.custom_instructions = updates.customInstructions;
      if (updates.messages !== undefined) dbUpdates.messages = updates.messages;
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('chat_sessions')
        .update(dbUpdates)
        .eq('id', sessionId);

      if (error) {
        logger.error('APP', `Failed to update chat session ${sessionId}`, error);
        throw error;
      }
    });
  },

  async fetchMessageHistory(threadId: string): Promise<Message[]> {
    return logger.measure('APP', `fetchMessageHistory:${threadId}`, async () => {
      const response = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/history`);
      if (!response.ok) {
        const err = new Error(`Failed to fetch message history: ${response.statusText}`);
        logger.error('APP', 'fetchMessageHistory failed', err);
        throw err;
      }
      return response.json();
    });
  },

  async sendChatMessage(threadId: string, payload: any): Promise<Response> {
    return logger.measure('APP', `sendChatMessage:${threadId}`, async () => {
      // Return the Response directly to allow streaming parsing in the component
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: threadId,
          ...payload
        }),
      });

      if (!response.ok) {
        const err = new Error(`Failed to send chat message: ${response.statusText}`);
        logger.error('APP', 'sendChatMessage failed', err);
        throw err;
      }
      return response;
    });
  }
};

