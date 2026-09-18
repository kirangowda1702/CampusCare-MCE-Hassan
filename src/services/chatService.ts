import { supabase, isSupabaseConfigured } from './supabase';
import { ChatMessage, UserRole } from '../types';

const inMemoryChatMessages: Record<string, ChatMessage[]> = {};

export const chatService = {
  async getMessages(appointmentId: string): Promise<ChatMessage[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          senderId: d.sender_id,
          senderName: d.sender_name,
          senderRole: d.sender_role as UserRole,
          text: d.message_text,
          timestamp: d.created_at,
          isDoctorNote: d.is_doctor_note
        }));
      }
    }
    return inMemoryChatMessages[appointmentId] || [];
  },

  async sendMessage(
    appointmentId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      ...message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (!inMemoryChatMessages[appointmentId]) {
      inMemoryChatMessages[appointmentId] = [];
    }
    inMemoryChatMessages[appointmentId].push(newMsg);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('consultation_messages').insert([{
          id: newMsg.id,
          appointment_id: appointmentId,
          sender_id: newMsg.senderId,
          sender_name: newMsg.senderName,
          sender_role: newMsg.senderRole,
          message_text: newMsg.text,
          is_doctor_note: newMsg.isDoctorNote || false,
          created_at: new Date().toISOString()
        }]);
      } catch (e) {
        console.warn('Supabase chat insert warning:', e);
      }
    }

    return newMsg;
  },

  subscribeToMessages(appointmentId: string, onNewMessage: (msg: ChatMessage) => void) {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel(`chat:${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
          filter: `appointment_id=eq.${appointmentId}`
        },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            onNewMessage({
              id: row.id,
              senderId: row.sender_id,
              senderName: row.sender_name,
              senderRole: row.sender_role,
              text: row.message_text,
              timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isDoctorNote: row.is_doctor_note
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
