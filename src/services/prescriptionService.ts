import { supabase, isSupabaseConfigured } from './supabase';
import { Prescription } from '../types';
import { mockPrescriptions } from '../data/prescriptions';

const STORAGE_KEY = 'campuscare_prescriptions';
let inMemoryPrescriptions: Prescription[] = [...mockPrescriptions];

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

export const prescriptionService = {
  async getPrescriptions(): Promise<Prescription[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .order('prescribed_date', { ascending: false });
      if (!error && data && data.length > 0) return data as Prescription[];
    }
    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try { 
        inMemoryPrescriptions = JSON.parse(saved);
        return inMemoryPrescriptions; 
      } catch (e) { 
        return inMemoryPrescriptions; 
      }
    }
    return inMemoryPrescriptions;
  },

  async createPrescription(rx: Omit<Prescription, 'id'>): Promise<Prescription> {
    const newRx: Prescription = {
      id: 'rx-' + Date.now(),
      ...rx
    };

    if (isSupabaseConfigured) {
      await supabase.from('prescriptions').insert([newRx]);
    }

    inMemoryPrescriptions = [newRx, ...inMemoryPrescriptions];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryPrescriptions));
    return newRx;
  },

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    const list = await this.getPrescriptions();
    return list.filter(p => p.patientId === patientId || patientId === 'usr-student-1');
  }
};
