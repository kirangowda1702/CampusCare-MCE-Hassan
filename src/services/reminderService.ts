import { supabase, isSupabaseConfigured } from './supabase';
import { MedicineReminder, ReminderStatus } from '../types';

const STORAGE_KEY = 'campuscare_reminders';

const defaultReminders: MedicineReminder[] = [
  {
    id: 'rem-1',
    prescriptionId: 'rx-2026-001',
    medicineName: 'Aceclofenac + Paracetamol (Zerodol-P)',
    dosage: '1 Tablet',
    frequency: 'Twice Daily',
    timeOfDay: '09:00 AM',
    mealTiming: 'After Food',
    startDate: '2026-09-10',
    endDate: '2026-09-19',
    status: 'taken',
    takenAt: '09:15 AM'
  },
  {
    id: 'rem-2',
    prescriptionId: 'rx-2026-001',
    medicineName: 'Trypsin Chymotrypsin (Chymoral Forte)',
    dosage: '1 Tablet',
    frequency: 'Twice Daily',
    timeOfDay: '01:30 PM',
    mealTiming: 'Before Food',
    startDate: '2026-09-10',
    endDate: '2026-09-19',
    status: 'upcoming'
  },
  {
    id: 'rem-3',
    prescriptionId: 'rx-2026-001',
    medicineName: 'Aceclofenac + Paracetamol (Zerodol-P)',
    dosage: '1 Tablet',
    frequency: 'Twice Daily',
    timeOfDay: '08:30 PM',
    mealTiming: 'After Food',
    startDate: '2026-09-10',
    endDate: '2026-09-19',
    status: 'upcoming'
  }
];

let inMemoryReminders: MedicineReminder[] = [...defaultReminders];

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

export const reminderService = {
  async getReminders(): Promise<MedicineReminder[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('medicine_reminders').select('*');
      if (!error && data && data.length > 0) return data as MedicineReminder[];
    }
    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try { 
        inMemoryReminders = JSON.parse(saved);
        return inMemoryReminders; 
      } catch (e) { 
        return inMemoryReminders; 
      }
    }
    return inMemoryReminders;
  },

  async addReminder(rem: Omit<MedicineReminder, 'id'>): Promise<MedicineReminder> {
    const newRem: MedicineReminder = {
      id: 'rem-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      ...rem
    };

    if (isSupabaseConfigured) {
      await supabase.from('medicine_reminders').insert([newRem]);
    }

    inMemoryReminders = [newRem, ...inMemoryReminders];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryReminders));
    return newRem;
  },

  async updateReminderStatus(id: string, status: ReminderStatus): Promise<void> {
    const takenAt = status === 'taken' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
    if (isSupabaseConfigured) {
      await supabase.from('medicine_reminders').update({ status, taken_at: takenAt }).eq('id', id);
    }
    inMemoryReminders = inMemoryReminders.map(r => r.id === id ? { ...r, status, takenAt } : r);
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryReminders));
  },

  async deleteReminder(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.from('medicine_reminders').delete().eq('id', id);
    }
    inMemoryReminders = inMemoryReminders.filter(r => r.id !== id);
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryReminders));
  }
};
