import { supabase, isSupabaseConfigured } from './supabase';
import { MedicalRecord } from '../types';
import { mockMedicalRecords } from '../data/medicalRecords';

const STORAGE_KEY = 'campuscare_records';
let inMemoryRecords: MedicalRecord[] = [...mockMedicalRecords];

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

export const medicalService = {
  async getRecords(): Promise<MedicalRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .order('record_date', { ascending: false });
      if (!error && data && data.length > 0) return data as MedicalRecord[];
    }
    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try { 
        inMemoryRecords = JSON.parse(saved);
        return inMemoryRecords; 
      } catch (e) { 
        return inMemoryRecords; 
      }
    }
    return inMemoryRecords;
  },

  async addRecord(rec: Omit<MedicalRecord, 'id'>): Promise<MedicalRecord> {
    const newRec: MedicalRecord = {
      id: 'rec-' + Date.now(),
      ...rec
    };

    if (isSupabaseConfigured) {
      await supabase.from('medical_records').insert([newRec]);
    }

    inMemoryRecords = [newRec, ...inMemoryRecords];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryRecords));
    return newRec;
  },

  async getRecordsByPatient(patientId: string): Promise<MedicalRecord[]> {
    const list = await this.getRecords();
    return list.filter(r => r.patientId === patientId || patientId === 'usr-student-1');
  }
};
