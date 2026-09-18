import { supabase, isSupabaseConfigured } from './supabase';
import { mockDoctors } from '../data/doctors';

export interface PlatformMetrics {
  totalRegisteredUsers: number;
  totalAppointments: number;
  activeDoctors: number;
  activeEmergencyRequests: number;
  isLiveDatabase: boolean;
  dataSourceLabel: string;
}

export const statsService = {
  async getMetrics(): Promise<PlatformMetrics> {
    if (isSupabaseConfigured) {
      try {
        const [profilesRes, appointmentsRes, doctorsRes, emergencyRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          supabase.from('doctors').select('id', { count: 'exact', head: true }),
          supabase.from('emergency_requests').select('id', { count: 'exact', head: true }).eq('status', 'active')
        ]);

        const userCount = profilesRes.count ?? 0;
        const apptCount = appointmentsRes.count ?? 0;
        const docCount = doctorsRes.count ?? 0;
        const emgCount = emergencyRes.count ?? 0;

        if (userCount > 0 || apptCount > 0 || docCount > 0) {
          return {
            totalRegisteredUsers: userCount,
            totalAppointments: apptCount,
            activeDoctors: docCount,
            activeEmergencyRequests: emgCount,
            isLiveDatabase: true,
            dataSourceLabel: 'Live Database Metrics'
          };
        }
      } catch (err) {
        console.warn('Failed to fetch metrics from Supabase, using prototype fallback', err);
      }
    }

    // Default Prototype/Demo Data Metrics with explicit labeling
    return {
      totalRegisteredUsers: 48,
      totalAppointments: 16,
      activeDoctors: mockDoctors.length,
      activeEmergencyRequests: 0,
      isLiveDatabase: false,
      dataSourceLabel: 'Prototype Demo Metrics'
    };
  }
};
