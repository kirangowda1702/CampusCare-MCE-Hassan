import { supabase, isSupabaseConfigured } from './supabase';
import { NotificationItem } from '../types';
import { mockNotifications } from '../data/notifications';

const STORAGE_KEY = 'campuscare_notifications';

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

// Check for valid UUID format
export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Doctor identifier aliases (maps doctor IDs to user account IDs and vice versa)
export const DOCTOR_USER_MAP: Record<string, string[]> = {
  'DOC001': ['usr-doctor-kiran', 'DOC001'],
  'usr-doctor-kiran': ['DOC001', 'usr-doctor-kiran'],
  'DOC002': ['usr-doctor-madan', 'DOC002'],
  'usr-doctor-madan': ['DOC002', 'usr-doctor-madan'],
  'doc-1': ['usr-doctor-kiran', 'DOC001', 'doc-1']
};

export function getEquivalentUserIds(userId: string): string[] {
  const mapped = DOCTOR_USER_MAP[userId];
  if (mapped && mapped.length > 0) return mapped;
  return [userId];
}

function mapDbToNotification(row: any): NotificationItem {
  return {
    id: row.id || `notif-${Date.now()}`,
    userId: row.user_id || row.userId || '',
    title: row.title || 'Notification',
    message: row.message || '',
    type: row.type || 'appointment',
    link: row.link || undefined,
    isRead: Boolean(row.is_read ?? row.isRead),
    timestamp: row.created_at || row.timestamp || new Date().toISOString()
  };
}

let inMemoryNotifications: NotificationItem[] = (() => {
  const saved = getLocalItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [...mockNotifications];
    }
  }
  return [...mockNotifications];
})();

type NotificationListener = (notif: NotificationItem) => void;
const activeListeners = new Set<NotificationListener>();

function notifyAllListeners(notif: NotificationItem) {
  activeListeners.forEach(listener => {
    try {
      listener(notif);
    } catch (err) {
      console.warn('[notificationService] listener callback error:', err);
    }
  });
}

export const notificationService = {
  /**
   * Fetch notifications from Supabase and synchronize with local storage.
   * Can optionally filter for a specific user ID or doctor ID alias.
   */
  async getNotifications(userId?: string): Promise<NotificationItem[]> {
    let results: NotificationItem[] = [];

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (userId && isValidUuid(userId)) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          results = data.map(mapDbToNotification);
        }
      } catch (err) {
        console.warn('[notificationService] Supabase fetch error, using local fallback:', err);
      }
    }

    // Merge with in-memory / local storage records
    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try {
        inMemoryNotifications = JSON.parse(saved);
      } catch {}
    }

    // Combine distinct notifications by ID
    const map = new Map<string, NotificationItem>();
    results.forEach(n => map.set(n.id, n));
    inMemoryNotifications.forEach(n => {
      if (!map.has(n.id)) {
        map.set(n.id, n);
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    inMemoryNotifications = merged;
    setLocalItem(STORAGE_KEY, JSON.stringify(merged));

    if (!userId) {
      return merged;
    }

    const equivalentIds = getEquivalentUserIds(userId);
    return merged.filter(n => equivalentIds.includes(n.userId));
  },

  async markAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured && isValidUuid(id)) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (err) {
        console.warn('[notificationService] Supabase markAsRead error:', err);
      }
    }
    inMemoryNotifications = inMemoryNotifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryNotifications));
  },

  async markAllAsRead(userId?: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('notifications').update({ is_read: true });
        if (userId && isValidUuid(userId)) {
          query = query.eq('user_id', userId);
        } else {
          query = query.neq('id', '00000000-0000-0000-0000-000000000000');
        }
        await query;
      } catch (err) {
        console.warn('[notificationService] Supabase markAllAsRead error:', err);
      }
    }

    const equivalentIds = userId ? getEquivalentUserIds(userId) : null;
    inMemoryNotifications = inMemoryNotifications.map(n => {
      if (!equivalentIds || equivalentIds.includes(n.userId)) {
        return { ...n, isRead: true };
      }
      return n;
    });
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryNotifications));
  },

  /**
   * Create a new notification. Stores in Supabase when possible and broadcasts in realtime.
   */
  async createNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'> & { id?: string }): Promise<NotificationItem> {
    const timestamp = new Date().toISOString();
    const id = notif.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

    const newNotif: NotificationItem = {
      id,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      link: notif.link,
      isRead: false,
      timestamp
    };

    if (isSupabaseConfigured) {
      try {
        const dbPayload: any = {
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          link: newNotif.link || null,
          is_read: false,
          created_at: newNotif.timestamp
        };

        if (isValidUuid(newNotif.id)) {
          dbPayload.id = newNotif.id;
        }

        if (isValidUuid(newNotif.userId)) {
          dbPayload.user_id = newNotif.userId;
        }

        await supabase.from('notifications').insert([dbPayload]);
      } catch (err) {
        console.warn('[notificationService] Supabase insert error, saved locally:', err);
      }
    }

    inMemoryNotifications = [newNotif, ...inMemoryNotifications.filter(n => n.id !== newNotif.id)];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryNotifications));

    // Broadcast realtime event to all listening components
    notifyAllListeners(newNotif);

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

  /**
   * Subscribe to realtime notifications.
   * Listens to both Supabase Realtime postgres_changes and local in-memory event dispatch.
   */
  subscribeToNotifications(userId?: string, onNewNotif?: NotificationListener) {
    let callback: NotificationListener | null = null;

    if (onNewNotif) {
      const equivalentIds = userId ? getEquivalentUserIds(userId) : null;
      callback = (notif: NotificationItem) => {
        if (!equivalentIds || equivalentIds.includes(notif.userId)) {
          onNewNotif(notif);
        }
      };
      activeListeners.add(callback);
    }

    let supabaseUnsub = () => {};

    if (isSupabaseConfigured) {
      try {
        const channelId = `notifications:${userId || 'all'}:${Date.now()}`;
        const channel = supabase
          .channel(channelId)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              ...(userId && isValidUuid(userId) ? { filter: `user_id=eq.${userId}` } : {})
            },
            (payload: any) => {
              if (payload.new) {
                const item = mapDbToNotification(payload.new);
                if (callback) {
                  callback(item);
                }
              }
            }
          )
          .subscribe();

        supabaseUnsub = () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        console.warn('[notificationService] Realtime channel setup error:', err);
      }
    }

    return () => {
      if (callback) {
        activeListeners.delete(callback);
      }
      supabaseUnsub();
    };
  }
};
