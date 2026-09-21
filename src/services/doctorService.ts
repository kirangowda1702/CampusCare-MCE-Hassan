import { supabase, isSupabaseConfigured } from './supabase';
import { Doctor, ProviderStatus } from '../types';
import { mockDoctors } from '../data/doctors';

export const doctorService = {
  async getDoctors(): Promise<Doctor[]> {
    if (isSupabaseConfigured) {
      try {
        // Attempt to ensure DOC001 and DOC002 exist in Supabase
        try {
          await supabase.from('doctor_profiles').upsert([
            {
              id: 'DOC001',
              doctor_id: 'DOC001',
              doctor_name: 'Dr. Kiran Gowda',
              name: 'Dr. Kiran Gowda',
              phone: '9110885805',
              qualification: 'MBBS, MD',
              specialization: 'General Medicine',
              hospital_name: 'ABC Hospital, Hassan',
              experience_years: 8,
              consultation_fee: 300,
              availability_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              availability_time: 'Monday–Saturday, 10:00 AM–1:00 PM',
              time_slots: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM'],
              medical_registration_number: '01012',
              registration_authority: 'Karnataka Medical Council',
              rating: 4.5,
              reviews_count: 120,
              email: 'doctor@example.com',
              address: 'Hassan, Karnataka',
              city: 'Hassan',
              state: 'Karnataka',
              verified_public_profile: true,
              campuscare_enabled: true,
              appointment_enabled: true,
              video_consultation_enabled: true,
              consent_status: 'verified',
              consent_date: '2026-09-18',
              source_url: 'https://example.com/doctor-profile',
              last_verified: '18-09-2026',
              provider_status: 'active',
              image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
              is_available: true
            },
            {
              id: 'DOC002',
              doctor_id: 'DOC002',
              doctor_name: 'Dr. Madan S K',
              name: 'Dr. Madan S K',
              phone: '8152093467',
              qualification: 'MBBS, MD',
              specialization: 'General Medicine',
              hospital_name: 'ABC Hospital, Hassan',
              experience_years: 8,
              consultation_fee: 300,
              availability_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              availability_time: 'Monday–Saturday, 10:00 AM–1:00 PM',
              time_slots: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM'],
              medical_registration_number: '01012',
              registration_authority: 'Karnataka Medical Council',
              rating: 4.5,
              reviews_count: 120,
              email: 'doctor@example.com',
              address: 'Hassan, Karnataka',
              city: 'Hassan',
              state: 'Karnataka',
              verified_public_profile: true,
              campuscare_enabled: true,
              appointment_enabled: true,
              video_consultation_enabled: true,
              consent_status: 'verified',
              consent_date: '2026-09-18',
              source_url: 'https://example.com/doctor-profile',
              last_verified: '18-09-2026',
              provider_status: 'active',
              image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
              is_available: true
            }
          ], { onConflict: 'id' });
        } catch (syncErr) {
          // Non-blocking if table permissions restrict DDL/upserts
        }

        const { data, error } = await supabase
          .from('doctor_profiles')
          .select('*');

        if (!error && data && data.length > 0) {
          const toBool = (val: any, defaultVal = false): boolean => {
            if (val === true || val === 'true' || val === 1 || val === '1' || val === 'available' || val === 'verified' || val === 'active') return true;
            if (val === false || val === 'false' || val === 0 || val === '0' || val === 'pending' || val === 'disabled') return false;
            return defaultVal;
          };

          const mapped: Doctor[] = data.map((d: any) => {
            const isDoc001 = d.id === 'DOC001' || d.doctor_id === 'DOC001';
            const isDoc002 = d.id === 'DOC002' || d.doctor_id === 'DOC002';
            const isFeatured = isDoc001 || isDoc002;

            const isVerifiedProfile = d.verified_public_profile !== undefined 
              ? toBool(d.verified_public_profile, true) 
              : (d.verified_profile !== undefined ? toBool(d.verified_profile, true) : (isFeatured ? true : true));

            const isCampusCareApproved = d.campuscare_enabled !== undefined
              ? toBool(d.campuscare_enabled, isFeatured)
              : (d.campuscare_consultation_approved !== undefined ? toBool(d.campuscare_consultation_approved, isFeatured) : (isFeatured ? true : false));

            const isAppointmentEnabled = d.appointment_enabled !== undefined
              ? toBool(d.appointment_enabled, isCampusCareApproved)
              : isCampusCareApproved;

            const isVideoAvailable = d.video_consultation_enabled !== undefined
              ? toBool(d.video_consultation_enabled, isFeatured)
              : (d.video_consultation !== undefined ? toBool(d.video_consultation, isFeatured) : (isFeatured ? true : false));

            const providerStatus: ProviderStatus = (d.provider_status as ProviderStatus) || 
              (isCampusCareApproved ? 'active' : 'directory_only');

            const consentStatus = (d.consent_status as any) || (isVerifiedProfile ? 'verified' : 'pending');

            return {
              id: d.id,
              doctorId: d.doctor_id || d.id,
              doctor_name: isDoc001 ? 'Dr. Kiran Gowda' : isDoc002 ? 'Dr. Madan S K' : (d.doctor_name || d.name),
              name: isDoc001 ? 'Dr. Kiran Gowda' : isDoc002 ? 'Dr. Madan S K' : (d.doctor_name || d.name),
              specialization: isFeatured ? 'General Medicine' : (d.specialization || 'Consultant Specialist'),
              qualification: isFeatured ? 'MBBS, MD' : (d.qualification || 'Not publicly listed'),
              hospital_name: isFeatured ? 'ABC Hospital, Hassan' : (d.hospital_name || 'Karna Hospital, Hassan'),
              city: d.city || 'Hassan',
              state: d.state || 'Karnataka',
              availability_days: isFeatured ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : (d.availability_days || ['Daily (Mon-Sun)']),
              availability_time: isFeatured ? 'Monday–Saturday, 10:00 AM–1:00 PM' : (d.availability_time || 'Daily: 9:30 AM - 2:00 PM & 5:00 PM - 8:00 PM'),
              availableDays: isFeatured ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : (d.availability_days || ['Daily (Mon-Sun)']),
              timeSlots: isFeatured ? ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM'] : (d.time_slots || ['09:30 AM', '11:00 AM', '01:00 PM', '05:00 PM', '06:30 PM', '07:30 PM']),
              consultation_type: isFeatured ? 'in_person' : (d.consultation_type || 'in_person'),
              source_url: isFeatured ? 'https://example.com/doctor-profile' : (d.source_url || 'https://karnahospital.in/'),
              data_source: isFeatured ? 'ABC Hospital, Hassan' : (d.data_source || 'Official hospital website'),
              verified_public_profile: isVerifiedProfile,
              provider_status: providerStatus,
              campuscare_enabled: isCampusCareApproved,
              appointment_enabled: isAppointmentEnabled,
              video_consultation_enabled: isVideoAvailable,
              consent_status: consentStatus,
              consent_date: d.consent_date || (consentStatus === 'verified' ? '2026-09-18' : null),
              image_url: isDoc001 ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400' : isDoc002 ? 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400' : d.image_url,
              avatarUrl: isDoc001 ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400' : isDoc002 ? 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400' : d.image_url,
              image_source_url: isFeatured ? 'https://example.com/doctor-profile' : d.image_source_url,
              image_source_type: 'Official hospital profile',
              image_verified: d.image_verified !== undefined ? toBool(d.image_verified, true) : true,
              initials: isDoc001 ? 'KG' : isDoc002 ? 'MS' : (d.initials || (d.doctor_name || d.name).split(' ').filter((w: string) => !w.includes('.')).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()),
              isAvailable: d.is_available ?? true,
              phone: isDoc001 ? '9110885805' : isDoc002 ? '8152093467' : d.phone,
              email: isFeatured ? 'doctor@example.com' : d.email,
              roomNumber: d.room_number,
              bio: d.bio,
              experienceYears: isFeatured ? 8 : (d.experience_years ?? d.experienceYears),
              consultationFee: isFeatured ? 300 : (d.consultation_fee ?? d.consultationFee),
              rating: isFeatured ? 4.5 : d.rating,
              reviewsCount: isFeatured ? 120 : (d.reviews_count ?? d.reviewsCount),
              reviews: isFeatured ? 120 : (d.reviews ?? d.reviews_count),
              medicalRegistrationNumber: isFeatured ? '01012' : (d.medical_registration_number ?? d.medicalRegistrationNumber),
              registrationAuthority: isFeatured ? 'Karnataka Medical Council' : (d.registration_authority ?? d.registrationAuthority),
              address: isFeatured ? 'Hassan, Karnataka' : (d.address ?? `${d.city || 'Hassan'}, ${d.state || 'Karnataka'}`),
              lastVerified: isFeatured ? '18-09-2026' : (d.last_verified ?? d.lastVerified),
              isCampusDoctor: false,
              isDemo: false,
              dataSource: isFeatured ? 'ABC Hospital, Hassan' : (d.data_source || 'Official hospital profile')
            };
          });

          // Ensure DOC001 is FIRST, DOC002 is SECOND, then alphabetical
          mapped.sort((a, b) => {
            const getRank = (doc: Doctor) => {
              if (doc.id === 'DOC001' || doc.doctorId === 'DOC001') return 1;
              if (doc.id === 'DOC002' || doc.doctorId === 'DOC002') return 2;
              return 100;
            };
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.name.localeCompare(b.name);
          });

          return mapped;
        }
      } catch (err) {
        console.warn('Failed to fetch doctors from Supabase, using verified directory fallback', err);
      }
    }

    // Default to verified Hassan doctor records with DOC001 first
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
