import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment, AppointmentStatus, ConsultationType } from '../types';
import { mockAppointments } from '../data/appointments';
import { appointmentService } from '../services/appointmentService';

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
  getDoctorAppointments: (doctorId: string) => Appointment[];
  refreshAppointments: () => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const AppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('campuscare_appointments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return mockAppointments; }
    }
    return mockAppointments;
  });

  const refreshAppointments = async () => {
    try {
      const data = await appointmentService.getAppointments();
      if (data && data.length > 0) {
        setAppointments(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAppointments();

    // Subscribe to real-time updates (Supabase Realtime + local broadcasts)
    const unsubscribe = appointmentService.subscribeToAppointments(() => {
      refreshAppointments();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('campuscare_appointments', JSON.stringify(appointments));
  }, [appointments]);

  const getAppointmentById = (id: string) => {
    return appointments.find(a => a.id === id || a.bookingId === id);
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
      status: data.status || 'pending'
    });
    setAppointments(prev => [newApt, ...prev.filter(a => a.id !== newApt.id)]);
    return newApt;
  };

  const updateStatus = async (id: string, status: AppointmentStatus, notes?: string) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id || a.bookingId === id ? { ...a, status, notes: notes !== undefined ? notes : a.notes } : a))
    );
    await appointmentService.updateAppointmentStatus(id, status, notes);
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

  const getDoctorAppointments = (doctorId: string) => {
    return appointments.filter(a => a.doctorId === doctorId || doctorId === 'doc-1');
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
