import { supabase, isSupabaseConfigured } from './supabase';
import { doctorService } from './doctorService';
import { appointmentService } from './appointmentService';

export interface PlatformMetrics {
  totalRegisteredUsers: number;
  totalAppointments: number;
  activeDoctors: number;
  availableDoctors: number;
  activeEmergencyRequests: number;
  isLiveDatabase: boolean;
  dataSourceLabel: string;
}

export const statsService = {
  async getMetrics(): Promise<PlatformMetrics> {
    if (isSupabaseConfigured) {
      try {
        const [usersRes, appointmentsRes, doctorsRes, emergencyRes] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          supabase.from('doctor_profiles').select('id, is_available', { count: 'exact' }),
          supabase.from('emergency_requests').select('id', { count: 'exact', head: true }).in('status', ['REQUESTED', 'PENDING', 'ACKNOWLEDGED', 'ASSISTANCE_IN_PROGRESS', 'IN_PROGRESS'])
        ]);

        const userCount = usersRes.count ?? 0;
        const apptCount = appointmentsRes.count ?? 0;
        const docCount = doctorsRes.count ?? 0;
        const emgCount = emergencyRes.count ?? 0;
        const availableDocs = Array.isArray(doctorsRes.data) ? doctorsRes.data.filter((d: any) => d.is_available !== false).length : docCount;

        return {
          totalRegisteredUsers: userCount,
          totalAppointments: apptCount,
          activeDoctors: docCount,
          availableDoctors: availableDocs,
          activeEmergencyRequests: emgCount,
          isLiveDatabase: true,
          dataSourceLabel: 'Live Supabase Metrics'
        };
      } catch (err) {
        console.warn('Failed to fetch metrics from Supabase:', err);
      }
    }

    // Dynamic metrics from actual loaded state
    try {
      const doctors = await doctorService.getDoctors();
      const appointments = await appointmentService.getAppointments();
      const availableDocs = doctors.filter(d => d.isAvailable !== false).length;

      return {
        totalRegisteredUsers: 0,
        totalAppointments: appointments.length,
        activeDoctors: doctors.length,
        availableDoctors: availableDocs,
        activeEmergencyRequests: 0,
        isLiveDatabase: false,
        dataSourceLabel: 'Configured Provider Metrics'
      };
    } catch (e) {
      return {
        totalRegisteredUsers: 0,
        totalAppointments: 0,
        activeDoctors: 0,
        availableDoctors: 0,
        activeEmergencyRequests: 0,
        isLiveDatabase: false,
        dataSourceLabel: 'Database Offline'
      };
    }
  }
};

