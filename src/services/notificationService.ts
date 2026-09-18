import { supabase, isSupabaseConfigured } from './supabase';
import { NotificationItem } from '../types';
import { mockNotifications } from '../data/notifications';

const STORAGE_KEY = 'campuscare_notifications';
let inMemoryNotifications: NotificationItem[] = [...mockNotifications];

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) return data as NotificationItem[];
    }
    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try { 
        inMemoryNotifications = JSON.parse(saved);
        return inMemoryNotifications; 
      } catch (e) { 
        return inMemoryNotifications; 
      }
    }
    return inMemoryNotifications;
  },

  async markAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
    inMemoryNotifications = inMemoryNotifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryNotifications));
  },

  async markAllAsRead(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.from('notifications').update({ is_read: true }).neq('id', '');
    }
    inMemoryNotifications = inMemoryNotifications.map(n => ({ ...n, isRead: true }));
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryNotifications));
  },

  async createNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      ...notif,
      isRead: false,
      timestamp: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      await supabase.from('notifications').insert([newNotif]);
    }

    inMemoryNotifications = [newNotif, ...inMemoryNotifications];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryNotifications));
    return newNotif;
  },

  async notifyAppointmentEvent(params: {
    userId: string;
    title: string;
    message: string;
    type: 'appointment' | 'prescription' | 'reminder' | 'emergency' | 'system';
    link?: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link
    });
  },

  subscribeToNotifications(userId: string, onNewNotif: (notif: NotificationItem) => void) {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.new) onNewNotif(payload.new as NotificationItem);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
