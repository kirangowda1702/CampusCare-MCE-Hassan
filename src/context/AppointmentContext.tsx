import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment, AppointmentStatus, ConsultationType } from '../types';
import { mockAppointments } from '../data/appointments';
import { appointmentService, isAppointmentForDoctor } from '../services/appointmentService';
import { appointmentReminderService } from '../services/appointmentReminderService';
import { useAuth } from './AuthContext';

interface AppointmentContextType {
  appointments: Appointment[];
  loading: boolean;
  getAppointmentById: (id: string) => Appointment | undefined;
  createAppointment: (data: {
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    doctorAvatar?: string;
    serviceId: string;
    serviceName: string;
    appointmentDate: string;
    timeSlot: string;
    startTime?: string;
    endTime?: string;
    consultationType: ConsultationType;
    reason: string;
    symptoms: string[];
    patientId: string;
    patientName: string;
    patientRole: any;
    patientEmail: string;
    patientPhone: string;
    patientUSNorEmpId?: string;
    status?: AppointmentStatus;
  }) => Promise<Appointment>;
  updateStatus: (id: string, status: AppointmentStatus, notes?: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  rescheduleAppointment: (id: string, newDate: string, newSlot: string) => Promise<void>;
  getUserAppointments: (userId: string) => Appointment[];
  getDoctorAppointments: (doctorIdOrUser: string | any) => Appointment[];
  refreshAppointments: () => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const AppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('campuscare_appointments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const refreshAppointments = async () => {
    try {
      const data = await appointmentService.getAppointments(user);
      if (Array.isArray(data)) {
        setAppointments(data);
      }
    } catch (e) {
      console.warn('[AppointmentContext] refresh error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAppointments().then(() => {
      appointmentReminderService.checkUpcomingAppointments().catch(() => {});
    });

    // 1. Subscribe to real-time updates (Supabase Realtime + local broadcasts)
    const unsubscribe = appointmentService.subscribeToAppointments(() => {
      refreshAppointments().then(() => {
        appointmentReminderService.checkUpcomingAppointments().catch(() => {});
      });
    });

    // 2. Window focus & Tab visibility listener (re-syncs immediately when Doctor or Student switches to the app)
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshAppointments().catch(() => {});
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // 3. Periodic background synchronization across disparate networks (Mobile Data <-> Wi-Fi)
    const pollInterval = setInterval(() => {
      refreshAppointments().catch(() => {});
    }, 8000);

    // 4. Background appointment reminder daemon
    const stopReminderDaemon = appointmentReminderService.startDaemon(30000);

    // 5. Cross-tab synchronization via local storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'campuscare_appointments' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAppointments(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      clearInterval(pollInterval);
      stopReminderDaemon();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem('campuscare_appointments', JSON.stringify(appointments));
  }, [appointments]);

  const getAppointmentById = (id: string) => {
    if (!id) return undefined;
    const clean = id.trim();
    // 1. Authoritative ID lookup first
    const byId = appointments.find(a => a.id === clean);
    if (byId) return byId;
    // 2. Booking ID lookup
    return appointments.find(a => a.bookingId === clean || (a as any).booking_id === clean);
  };

  const createAppointment = async (data: {
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    doctorAvatar?: string;
    serviceId: string;
    serviceName: string;
    appointmentDate: string;
    timeSlot: string;
    startTime?: string;
    endTime?: string;
    consultationType: ConsultationType;
    reason: string;
    symptoms: string[];
    patientId: string;
    patientName: string;
    patientRole: any;
    patientEmail: string;
    patientPhone: string;
    patientUSNorEmpId?: string;
    status?: AppointmentStatus;
  }): Promise<Appointment> => {
    const newApt = await appointmentService.createAppointment({
      ...data,
      patientId: data.patientId || user?.id || 'usr-student-1',
      status: data.status || 'pending'
    }, user);
    setAppointments(prev => [newApt, ...prev.filter(a => a.id !== newApt.id)]);
    return newApt;
  };

  const updateStatus = async (id: string, status: AppointmentStatus, notes?: string) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id || a.bookingId === id ? { ...a, status, notes: notes !== undefined ? notes : a.notes } : a))
    );
    await appointmentService.updateAppointmentStatus(id, status, notes, user);
  };

  const cancelAppointment = async (id: string) => {
    await updateStatus(id, 'cancelled');
  };

  const rescheduleAppointment = async (id: string, newDate: string, newSlot: string) => {
    await appointmentService.rescheduleAppointment(id, newDate, newSlot);
    setAppointments(prev =>
      prev.map(a => 
        a.id === id || a.bookingId === id 
          ? { ...a, appointmentDate: newDate, timeSlot: newSlot, status: 'rescheduled' } 
          : a
      )
    );
  };

  const getUserAppointments = (userId: string) => {
    return appointments.filter(a => a.patientId === userId);
  };

  const getDoctorAppointments = (doctorIdOrUser: string | any) => {
    if (typeof doctorIdOrUser === 'object' && doctorIdOrUser !== null) {
      return appointments.filter(a => isAppointmentForDoctor(a, doctorIdOrUser));
    }
    return appointments.filter(a => isAppointmentForDoctor(a, { doctorId: doctorIdOrUser, id: doctorIdOrUser }));
  };

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        loading,
        getAppointmentById,
        createAppointment,
        updateStatus,
        cancelAppointment,
        rescheduleAppointment,
        getUserAppointments,
        getDoctorAppointments,
        refreshAppointments
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) throw new Error('useAppointments must be used within AppointmentProvider');
  return context;
};
