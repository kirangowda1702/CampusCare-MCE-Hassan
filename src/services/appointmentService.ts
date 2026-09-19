import { supabase, isSupabaseConfigured } from './supabase';
import { Appointment, AppointmentStatus } from '../types';
import { mockAppointments } from '../data/appointments';
import { notificationService } from './notificationService';

const STORAGE_KEY = 'campuscare_appointments';
let inMemoryAppointments: Appointment[] = [...mockAppointments];
const listeners: Set<(appointments: Appointment[]) => void> = new Set();

function notifyLocalListeners() {
  listeners.forEach(cb => cb([...inMemoryAppointments]));
}

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export const appointmentService = {
  async getAppointments(): Promise<Appointment[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data as Appointment[];
      } catch (err) {
        console.warn('Supabase fetch appointments error:', err);
      }
    }
    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try { 
        inMemoryAppointments = JSON.parse(saved);
        return inMemoryAppointments; 
      } catch (e) { 
        return inMemoryAppointments; 
      }
    }
    return inMemoryAppointments;
  },

  async createAppointment(appointment: Omit<Appointment, 'id' | 'bookingId' | 'createdAt'>): Promise<Appointment> {
    // 1. Double booking prevention check
    const existing = await this.getAppointments();
    const isDoubleBooked = existing.some(
      a =>
        a.doctorId === appointment.doctorId &&
        a.appointmentDate === appointment.appointmentDate &&
        (a.timeSlot === appointment.timeSlot || (a.startTime && appointment.startTime && a.startTime === appointment.startTime)) &&
        a.status !== 'cancelled' &&
        a.status !== 'rejected'
    );

    if (isDoubleBooked) {
      throw new Error(`The time slot ${appointment.timeSlot} on ${appointment.appointmentDate} is already reserved for this doctor.`);
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newApt: Appointment = {
      id: 'apt-' + Date.now(),
      bookingId: `MCE-APT-2026-${randomNum}`,
      ...appointment,
      status: appointment.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('appointments').insert([newApt]);
      } catch (err) {
        console.warn('Supabase insert error:', err);
      }
    }

    inMemoryAppointments = [newApt, ...inMemoryAppointments];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryAppointments));
    notifyLocalListeners();

    // Trigger Notification for patient & doctor
    try {
      await notificationService.notifyAppointmentEvent({
        userId: newApt.patientId,
        title: 'Appointment Request Submitted',
        message: `Your consultation request for ${newApt.doctorName} on ${newApt.appointmentDate} at ${newApt.timeSlot} has been created (ID: ${newApt.bookingId}).`,
        type: 'appointment',
        link: `/appointments/${newApt.id}`
      });
      await notificationService.notifyAppointmentEvent({
        userId: newApt.doctorId,
        title: 'New Appointment Request',
        message: `New appointment request from ${newApt.patientName}`,
        type: 'appointment',
        link: `/appointments/${newApt.id}`
      });
    } catch (e) {}

    return newApt;
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string): Promise<void> {
    const existing = await this.getAppointments();
    const target = existing.find(a => a.id === id || a.bookingId === id);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('appointments')
          .update({ 
            status, 
            notes: notes !== undefined ? notes : target?.notes,
            updated_at: new Date().toISOString() 
          })
          .eq('id', target?.id || id);
      } catch (err) {
        console.warn('Supabase status update error:', err);
      }
    }

    inMemoryAppointments = inMemoryAppointments.map(a => 
      a.id === id || a.bookingId === id 
        ? { ...a, status, notes: notes !== undefined ? notes : a.notes, updatedAt: new Date().toISOString() } 
        : a
    );
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryAppointments));
    notifyLocalListeners();

    // Send notifications based on status change
    if (target) {
      const docName = target.doctorName.startsWith('Dr.') || target.doctorName.startsWith('Dr ')
        ? target.doctorName
        : `Dr. ${target.doctorName}`;

      let statusTitle = `Appointment ${status.toUpperCase()}`;
      let statusMsg = `Your appointment (${target.bookingId}) with ${docName} on ${target.appointmentDate} is now marked as ${status}.`;

      if (status === 'confirmed') {
        statusTitle = 'Appointment Confirmed';
        statusMsg = `Your appointment with ${docName} has been confirmed.`;
      } else if (status === 'rejected') {
        statusTitle = 'Appointment Rejected';
        statusMsg = 'Your appointment request was rejected.';
      } else if (status === 'in_progress') {
        statusTitle = 'Consultation Started';
        statusMsg = `${docName} has started the consultation session. Click to join video room.`;
      } else if (status === 'completed') {
        statusTitle = 'Consultation Completed';
        statusMsg = `Your consultation with ${docName} has ended. Review your prescription and medical records.`;
      }

      try {
        await notificationService.notifyAppointmentEvent({
          userId: target.patientId,
          title: statusTitle,
          message: statusMsg,
          type: 'appointment',
          link: `/appointments/${target.id}`
        });
      } catch (e) {}
    }
  },

  async rescheduleAppointment(id: string, newDate: string, newSlot: string): Promise<void> {
    const existing = await this.getAppointments();
    const target = existing.find(a => a.id === id || a.bookingId === id);
    if (target) {
      const isClashing = existing.some(
        a =>
          a.id !== target.id &&
          a.doctorId === target.doctorId &&
          a.appointmentDate === newDate &&
          a.timeSlot === newSlot &&
          a.status !== 'cancelled' &&
          a.status !== 'rejected'
      );
      if (isClashing) {
        throw new Error(`The slot ${newSlot} on ${newDate} is already reserved.`);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('appointments').update({
          appointment_date: newDate,
          time_slot: newSlot,
          status: 'rescheduled',
          updated_at: new Date().toISOString()
        }).eq('id', target?.id || id);
      } catch (err) {
        console.warn('Supabase reschedule update error:', err);
      }
    }

    inMemoryAppointments = inMemoryAppointments.map(a => 
      a.id === id || a.bookingId === id 
        ? { ...a, appointmentDate: newDate, timeSlot: newSlot, status: 'rescheduled', updatedAt: new Date().toISOString() } 
        : a
    );
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryAppointments));
    notifyLocalListeners();

    if (target) {
      try {
        await notificationService.notifyAppointmentEvent({
          userId: target.patientId,
          title: 'Appointment Rescheduled',
          message: `Your appointment with ${target.doctorName} has been moved to ${newDate} at ${newSlot}.`,
          type: 'appointment',
          link: `/appointments/${target.id}`
        });
      } catch (e) {}
    }
  },

  subscribeToAppointments(onUpdate: (payload: any) => void) {
    listeners.add(onUpdate);

    let supabaseUnsub = () => {};
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('realtime:appointments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onUpdate)
        .subscribe();
      supabaseUnsub = () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      listeners.delete(onUpdate);
      supabaseUnsub();
    };
  }
};
