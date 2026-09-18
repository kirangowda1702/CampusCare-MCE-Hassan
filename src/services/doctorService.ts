import { supabase, isSupabaseConfigured } from './supabase';
import { Doctor, ProviderStatus } from '../types';
import { mockDoctors } from '../data/doctors';

export const doctorService = {
  async getDoctors(): Promise<Doctor[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('doctor_profiles')
          .select('*')
          .order('doctor_name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            doctorId: d.doctor_id || d.id,
            doctor_name: d.doctor_name || d.name,
            name: d.doctor_name || d.name,
            specialization: d.specialization || 'Consultant Specialist',
            qualification: d.qualification || 'Not publicly listed',
            hospital_name: d.hospital_name || 'Karna Hospital, Hassan',
            city: d.city || 'Hassan',
            state: d.state || 'Karnataka',
            availability_days: d.availability_days || ['Daily (Mon-Sun)'],
            availability_time: d.availability_time || 'Daily: 9:30 AM - 2:00 PM & 5:00 PM - 8:00 PM',
            availableDays: d.availability_days || ['Daily (Mon-Sun)'],
            timeSlots: d.time_slots || ['09:30 AM', '11:00 AM', '01:00 PM', '05:00 PM', '06:30 PM', '07:30 PM'],
            consultation_type: d.consultation_type || 'in_person',
            source_url: d.source_url || 'https://karnahospital.in/',
            data_source: d.data_source || 'Official hospital website',
            verified_public_profile: d.verified_public_profile ?? true,
            provider_status: (d.provider_status as ProviderStatus) || 'directory_only',
            campuscare_enabled: d.campuscare_enabled ?? false,
            appointment_enabled: d.appointment_enabled ?? false,
            video_consultation_enabled: d.video_consultation_enabled ?? false,
            consent_status: (d.consent_status as any) || 'pending',
            consent_date: d.consent_date || null,
            image_url: d.image_url,
            avatarUrl: d.image_url,
            image_source_url: d.image_source_url,
            image_source_type: d.image_source_type || 'Official hospital profile',
            image_verified: d.image_verified ?? true,
            initials: d.initials || (d.doctor_name || d.name).split(' ').filter((w: string) => !w.includes('.')).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
            isAvailable: d.is_available ?? true,
            phone: d.phone,
            email: d.email,
            roomNumber: d.room_number,
            bio: d.bio,
            isCampusDoctor: false,
            isDemo: false,
            dataSource: 'Official hospital website'
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch doctors from Supabase, using verified directory fallback', err);
      }
    }

    // Default to verified Hassan doctor records
    return mockDoctors;
  },

  async getDoctorById(id: string): Promise<Doctor | undefined> {
    const doctors = await this.getDoctors();
    return doctors.find(d => d.id === id || d.doctorId === id);
  },

  async setDoctorAvailability(id: string, isAvailable: boolean): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('doctor_profiles')
          .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.warn('Failed to update doctor availability in Supabase', err);
      }
    }
    const doc = mockDoctors.find(d => d.id === id);
    if (doc) doc.isAvailable = isAvailable;
    return true;
  },

  async updateProviderStatus(id: string, status: ProviderStatus): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('doctor_profiles')
          .update({ provider_status: status, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.warn('Failed to update provider status in Supabase', err);
      }
    }
    const doc = mockDoctors.find(d => d.id === id);
    if (doc) doc.provider_status = status;
    return true;
  },

  async updateVideoConsultationStatus(id: string, enabled: boolean): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('doctor_profiles')
          .update({ video_consultation_enabled: enabled, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.warn('Failed to update video consultation status in Supabase', err);
      }
    }
    const doc = mockDoctors.find(d => d.id === id);
    if (doc) doc.video_consultation_enabled = enabled;
    return true;
  },

  async updateConsentStatus(id: string, consentStatus: 'pending' | 'verified' | 'declined', consentDate?: string): Promise<boolean> {
    const date = consentStatus === 'verified' ? (consentDate || new Date().toISOString().split('T')[0]) : null;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('doctor_profiles')
          .update({ 
            consent_status: consentStatus, 
            consent_date: date,
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.warn('Failed to update consent status in Supabase', err);
      }
    }
    const doc = mockDoctors.find(d => d.id === id);
    if (doc) {
      doc.consent_status = consentStatus;
      doc.consent_date = date;
      if (consentStatus !== 'verified') {
        doc.campuscare_enabled = false;
        doc.appointment_enabled = false;
        doc.video_consultation_enabled = false;
      }
    }
    return true;
  },

  async updateDoctorOnboarding(
    id: string,
    updates: {
      provider_status?: ProviderStatus;
      campuscare_enabled?: boolean;
      appointment_enabled?: boolean;
      video_consultation_enabled?: boolean;
      consent_status?: 'pending' | 'verified' | 'declined';
      consent_date?: string | null;
    }
  ): Promise<boolean> {
    const doc = mockDoctors.find(d => d.id === id);
    
    // Guard: CampusCare services can only be enabled if consent is verified
    const finalConsentStatus = updates.consent_status || doc?.consent_status || 'pending';
    if (updates.campuscare_enabled && finalConsentStatus !== 'verified') {
      throw new Error('Consent must be verified before enabling CampusCare services.');
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('doctor_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.warn('Failed to update doctor onboarding in Supabase', err);
      }
    }

    if (doc) {
      Object.assign(doc, updates);
    }
    return true;
  }
};
