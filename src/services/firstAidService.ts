import { supabase, isSupabaseConfigured } from './supabase';
import { FirstAidCentre, EmergencyContact, HospitalReferral, EmergencyRequest, EmergencyCampusStatus } from '../types';

const FIRST_AID_STORAGE_KEY = 'campuscare_first_aid_centre';
const CONTACTS_STORAGE_KEY = 'campuscare_emergency_contacts';
const REFERRALS_STORAGE_KEY = 'campuscare_hospital_referrals';

export const defaultFirstAidCentre: FirstAidCentre = {
  id: 'fac-mce-001',
  name: 'MCE Campus First-Aid & Health Centre',
  location: 'Near Gymnasium & Silver Jubilee Complex, MCE Campus, Salagame Road',
  building: 'Silver Jubilee Complex',
  roomNumber: 'Room 101',
  officialPhone: '9110885805',
  secondaryPhone: '9110885805',
  operatingHours: '24x7 Emergency First Aid On Call',
  afterHoursContact: '9110885805',
  services: [
    'Emergency First Aid & Triage',
    'Minor Injury Wound Dressing',
    'Blood Pressure & Vitals Monitoring',
    'Initial Assessment & Stabilisation',
    'Emergency Response Coordination'
  ],
  source: 'MCE Campus Health & Safety Protocol',
  verified: true,
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-22T00:00:00Z'
};

export const defaultEmergencyContacts: EmergencyContact[] = [
  {
    id: 'ec-001',
    name: 'MCE Campus First-Aid Responder Desk',
    category: 'Campus First Aid',
    phone: '9110885805',
    description: 'On-campus triage, immediate medical stabilization, and duty responder dispatch.',
    availableHours: '24 Hours Emergency On Call',
    source: 'MCE First-Aid Protocol',
    verified: true,
    isActive: true
  },
  {
    id: 'ec-002',
    name: 'MCE Campus Emergency Safety Coordinator',
    category: 'Campus Security',
    phone: '9110885805',
    description: 'Campus emergency dispatch and immediate gate clearance for first aid assistance.',
    availableHours: '24 Hours',
    source: 'MCE Emergency Registry',
    verified: true,
    isActive: true
  }
];

let inMemoryCentre: FirstAidCentre = { ...defaultFirstAidCentre };
let inMemoryContacts: EmergencyContact[] = [...defaultEmergencyContacts];
let inMemoryReferrals: HospitalReferral[] = [];

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

export const firstAidService = {
  // ==================== FIRST AID CENTRE ====================
  async getFirstAidCentre(): Promise<FirstAidCentre> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('first_aid_centre')
          .select('*')
          .eq('id', 'fac-mce-001')
          .maybeSingle();

        if (!error && data) {
          inMemoryCentre = {
            id: data.id,
            name: data.name,
            location: data.location,
            building: data.building,
            roomNumber: data.room_number,
            officialPhone: data.official_phone,
            secondaryPhone: data.secondary_phone,
            operatingHours: data.operating_hours,
            afterHoursContact: data.after_hours_contact,
            services: data.services || [],
            source: data.source,
            verified: Boolean(data.verified),
            isActive: Boolean(data.is_active),
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          return inMemoryCentre;
        }
      } catch (err) {
        console.warn('Supabase getFirstAidCentre error:', err);
      }
    }

    const saved = getLocalItem(FIRST_AID_STORAGE_KEY);
    if (saved) {
      try {
        inMemoryCentre = JSON.parse(saved);
      } catch (e) {}
    }
    return inMemoryCentre;
  },

  async updateFirstAidCentre(updates: Partial<FirstAidCentre>): Promise<FirstAidCentre> {
    const updated: FirstAidCentre = {
      ...inMemoryCentre,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('first_aid_centre').upsert({
          id: updated.id,
          name: updated.name,
          location: updated.location,
          building: updated.building,
          room_number: updated.roomNumber,
          official_phone: updated.officialPhone,
          secondary_phone: updated.secondaryPhone,
          operating_hours: updated.operatingHours,
          after_hours_contact: updated.afterHoursContact,
          services: updated.services,
          source: updated.source,
          verified: updated.verified,
          is_active: updated.isActive,
          updated_at: updated.updatedAt
        });
      } catch (err) {
        console.warn('Supabase updateFirstAidCentre error:', err);
      }
    }

    inMemoryCentre = updated;
    setLocalItem(FIRST_AID_STORAGE_KEY, JSON.stringify(inMemoryCentre));
    return inMemoryCentre;
  },

  // ==================== EMERGENCY CONTACTS ====================
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          inMemoryContacts = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            phone: d.phone,
            description: d.description,
            availableHours: d.available_hours,
            source: d.source,
            verified: Boolean(d.verified),
            isActive: Boolean(d.is_active),
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
          return inMemoryContacts;
        }
      } catch (err) {
        console.warn('Supabase getEmergencyContacts error:', err);
      }
    }

    const saved = getLocalItem(CONTACTS_STORAGE_KEY);
    if (saved) {
      try {
        inMemoryContacts = JSON.parse(saved);
      } catch (e) {}
    }
    return inMemoryContacts;
  },

  async updateEmergencyContact(id: string, updates: Partial<EmergencyContact>): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('emergency_contacts')
          .update({
            name: updates.name,
            phone: updates.phone,
            description: updates.description,
            available_hours: updates.availableHours,
            source: updates.source,
            verified: updates.verified,
            is_active: updates.isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase updateEmergencyContact error:', err);
      }
    }

    inMemoryContacts = inMemoryContacts.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    );
    setLocalItem(CONTACTS_STORAGE_KEY, JSON.stringify(inMemoryContacts));
  },

  // ==================== HOSPITAL REFERRALS ====================
  async createHospitalReferral(referral: Omit<HospitalReferral, 'id' | 'createdAt'>): Promise<HospitalReferral> {
    const newRef: HospitalReferral = {
      id: 'ref-' + Date.now(),
      ...referral,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('hospital_referrals').insert([{
          id: newRef.id,
          emergency_request_id: newRef.emergencyRequestId,
          hospital_id: newRef.hospitalId,
          referred_by: newRef.referredBy,
          reason: newRef.reason,
          status: newRef.status
        }]);
      } catch (err) {
        console.warn('Supabase createHospitalReferral error:', err);
      }
    }

    inMemoryReferrals = [newRef, ...inMemoryReferrals];
    setLocalItem(REFERRALS_STORAGE_KEY, JSON.stringify(inMemoryReferrals));
    return newRef;
  },

  async getReferralsForEmergency(emergencyRequestId: string): Promise<HospitalReferral[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('hospital_referrals')
          .select('*')
          .eq('emergency_request_id', emergencyRequestId);

        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            emergencyRequestId: d.emergency_request_id,
            hospitalId: d.hospital_id,
            referredBy: d.referred_by,
            reason: d.reason,
            status: d.status,
            createdAt: d.created_at,
            updatedAt: d.updated_at
          }));
        }
      } catch (err) {}
    }
    return inMemoryReferrals.filter(r => r.emergencyRequestId === emergencyRequestId);
  },

  // ==================== REALTIME SUBSCRIPTIONS ====================
  subscribeToFirstAidUpdates(onUpdate: () => void) {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel('realtime:first_aid_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'first_aid_centre' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_contacts' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_referrals' }, onUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
