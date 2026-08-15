import { supabase } from '../lib/supabase';
import { RAGSession, Message } from '../types/main';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const chatService = {
  async fetchSessions(classId: string): Promise<RAGSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('class_id', classId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chat sessions from public.chat_sessions:', error);
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
  },

  async createSession(classId: string, payload: Partial<RAGSession>): Promise<RAGSession> {
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

    if (error) throw error;

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
  },

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  },

  async fetchMessageHistory(threadId: string): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/history`);
    if (!response.ok) throw new Error("Failed to fetch message history");
    return response.json();
  },

  async sendChatMessage(threadId: string, payload: any): Promise<Response> {
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
    
    if (!response.ok) throw new Error("Failed to send chat message");
    return response;
  }
};

