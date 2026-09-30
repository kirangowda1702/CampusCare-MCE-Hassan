import { supabase, isSupabaseConfigured } from './supabase';
import { Appointment, AppointmentStatus } from '../types';
import { mockAppointments } from '../data/appointments';
import { notificationService, getEquivalentUserIds } from './notificationService';
import { isDateInPast, isDateToday, isTimeSlotInPastToday } from '../utils/dateUtils';

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

function normalizeAppointment(d: any): Appointment {
  const rawStatus = (d.status || 'pending').toString().toLowerCase();
  let status: AppointmentStatus = 'pending';
  if (rawStatus === 'confirmed' || rawStatus === 'accepted') status = 'confirmed';
  else if (rawStatus === 'rejected' || rawStatus === 'declined') status = 'rejected';
  else if (rawStatus === 'in_progress') status = 'in_progress';
  else if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else if (rawStatus === 'rescheduled') status = 'rescheduled';

  return {
    id: d.id || d.appointment_id || ('apt-' + Date.now()),
    bookingId: d.bookingId || d.booking_id || d.id || 'MCE-APT-2026-0000',
    patientId: d.patientId || d.patient_id || d.student_id || d.user_id || 'usr-student-1',
    patientName: d.patientName || d.patient_name || d.student_name || 'Rahul Sharma',
    patientRole: d.patientRole || d.patient_role || 'student',
    patientEmail: d.patientEmail || d.patient_email || 'student@mcehassan.ac.in',
    patientPhone: d.patientPhone || d.patient_phone || '+91 98765 43210',
    patientUSNorEmpId: d.patientUSNorEmpId || d.patient_usn_or_emp_id || d.usn || d.employee_id,
    doctorId: (d.doctorId || d.doctor_id || 'DOC001').toString(),
    doctorName: d.doctorName || d.doctor_name || 'Dr. Kiran Gowda',
    doctorSpecialization: d.doctorSpecialization || d.doctor_specialization || 'General Medicine',
    doctorAvatar: d.doctorAvatar || d.doctor_avatar || d.avatar_url,
    serviceId: d.serviceId || d.service_id || 'srv-1',
    serviceName: d.serviceName || d.service_name || 'General Consultation',
    appointmentDate: d.appointmentDate || d.appointment_date || d.date || new Date().toISOString().split('T')[0],
    timeSlot: d.timeSlot || d.time_slot || d.time || '10:00 AM',
    startTime: d.startTime || d.start_time,
    endTime: d.endTime || d.end_time,
    consultationType: (d.consultationType || d.consultation_type || 'video') as any,
    reason: d.reason || '',
    symptoms: Array.isArray(d.symptoms) ? d.symptoms : (typeof d.symptoms === 'string' ? JSON.parse(d.symptoms || '[]') : []),
    status,
    notes: d.notes,
    createdAt: d.createdAt || d.created_at || new Date().toISOString(),
    updatedAt: d.updatedAt || d.updated_at || new Date().toISOString(),
    isDemo: false
  };
}

export const appointmentService = {
  async getAppointments(): Promise<Appointment[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          const normalized = data.map(normalizeAppointment);
          inMemoryAppointments = normalized;
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase fetch appointments error:', err);
      }
    }
    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        inMemoryAppointments = Array.isArray(parsed) ? parsed.map(normalizeAppointment) : mockAppointments;
        return inMemoryAppointments; 
      } catch (e) { 
        return inMemoryAppointments; 
      }
    }
    return inMemoryAppointments;
  },

  async createAppointment(appointment: Omit<Appointment, 'id' | 'bookingId' | 'createdAt'>): Promise<Appointment> {
    // 1. Past date validation
    if (!appointment.appointmentDate || isDateInPast(appointment.appointmentDate)) {
      throw new Error('Cannot book an appointment for a past date. Please select a valid future date.');
    }

    // 2. Past time slot validation for today in IST
    if (isDateToday(appointment.appointmentDate) && appointment.startTime && isTimeSlotInPastToday(appointment.startTime)) {
      throw new Error('Selected time slot has already passed for today. Please select a future time slot.');
    }

    // 3. Double booking prevention check
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
      throw new Error('Time slot no longer available. Please select another slot.');
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newApt: Appointment = {
      id: 'apt-' + Date.now(),
      bookingId: `MCE-APT-2026-${randomNum}`,
      ...appointment,
      status: appointment.status ? (appointment.status.toLowerCase() as AppointmentStatus) : 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const payload = {
          id: newApt.id,
          appointment_id: newApt.id,
          booking_id: newApt.bookingId,
          bookingId: newApt.bookingId,
          student_id: newApt.patientId,
          patient_id: newApt.patientId,
          patientId: newApt.patientId,
          patient_name: newApt.patientName,
          patientName: newApt.patientName,
          patient_role: newApt.patientRole,
          patient_email: newApt.patientEmail,
          patient_phone: newApt.patientPhone,
          patient_usn_or_emp_id: newApt.patientUSNorEmpId,
          doctor_id: newApt.doctorId,
          doctorId: newApt.doctorId,
          doctor_name: newApt.doctorName,
          doctorName: newApt.doctorName,
          doctor_specialization: newApt.doctorSpecialization,
          doctor_avatar: newApt.doctorAvatar,
          service_id: newApt.serviceId,
          service_name: newApt.serviceName,
          appointment_date: newApt.appointmentDate,
          date: newApt.appointmentDate,
          time_slot: newApt.timeSlot,
          time: newApt.timeSlot,
          start_time: newApt.startTime,
          end_time: newApt.endTime,
          consultation_type: newApt.consultationType,
          reason: newApt.reason,
          symptoms: newApt.symptoms,
          status: newApt.status,
          created_at: newApt.createdAt,
          updated_at: newApt.updatedAt
        };

        const { error } = await supabase.from('appointments').insert([payload]);
        if (error) {
          // Fallback minimal insert
          await supabase.from('appointments').insert([{
            id: newApt.id,
            booking_id: newApt.bookingId,
            doctor_id: newApt.doctorId,
            patient_id: newApt.patientId,
            appointment_date: newApt.appointmentDate,
            time_slot: newApt.timeSlot,
            consultation_type: newApt.consultationType,
            status: newApt.status,
            reason: newApt.reason,
            doctor_name: newApt.doctorName,
            patient_name: newApt.patientName
          }]);
        }
      } catch (err) {
        console.warn('Supabase insert error:', err);
      }
    }

    inMemoryAppointments = [newApt, ...inMemoryAppointments.filter(a => a.id !== newApt.id)];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryAppointments));
    notifyLocalListeners();

    // Trigger Immediate Notifications for patient & doctor (Item 1 & Item 5)
    try {
      const docName = newApt.doctorName.startsWith('Dr.') || newApt.doctorName.startsWith('Dr ')
        ? newApt.doctorName
        : `Dr. ${newApt.doctorName}`;

      // 1. Notification to Student
      await notificationService.notifyAppointmentEvent({
        userId: newApt.patientId,
        title: 'Appointment Request Submitted',
        message: `Your consultation request for ${docName} on ${newApt.appointmentDate} at ${newApt.timeSlot} has been created (Booking ID: ${newApt.bookingId}).`,
        type: 'appointment',
        link: `/appointments/${newApt.id}`
      });

      // 2. Notification to Doctor (sent to doctorId and any linked doctor user account)
      const doctorTargets = getEquivalentUserIds(newApt.doctorId);
      for (const targetDocId of doctorTargets) {
        await notificationService.notifyAppointmentEvent({
          userId: targetDocId,
          title: 'New Appointment Request',
          message: `New appointment request from student ${newApt.patientName} for ${newApt.appointmentDate} at ${newApt.timeSlot} (Booking ID: ${newApt.bookingId}).`,
          type: 'appointment',
          link: `/appointments/${newApt.id}`
        });
      }
    } catch (e) {
      console.warn('[appointmentService] Error sending booking notifications:', e);
    }

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
            status: status.toLowerCase(), 
            notes: notes !== undefined ? notes : target?.notes,
            updated_at: new Date().toISOString() 
          })
          .or(`id.eq.${target?.id || id},booking_id.eq.${target?.bookingId || id}`);
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

    // Send notifications based on status change (Item 2, 4, 5)
    if (target) {
      const docName = target.doctorName.startsWith('Dr.') || target.doctorName.startsWith('Dr ')
        ? target.doctorName
        : `Dr. ${target.doctorName}`;

      const doctorTargets = getEquivalentUserIds(target.doctorId);

      try {
        if (status === 'confirmed') {
          // Student receives confirmation notification (Item 2 & 5)
          await notificationService.notifyAppointmentEvent({
            userId: target.patientId,
            title: 'Appointment Confirmed',
            message: `Your appointment with ${docName} on ${target.appointmentDate} at ${target.timeSlot} has been confirmed (Booking ID: ${target.bookingId}).`,
            type: 'appointment',
            link: `/appointments/${target.id}`
          });

          // Doctor also receives confirmation audit log (Item 5)
          for (const targetDocId of doctorTargets) {
            await notificationService.notifyAppointmentEvent({
              userId: targetDocId,
              title: 'Appointment Confirmed',
              message: `You confirmed the appointment with student ${target.patientName} on ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}).`,
              type: 'appointment',
              link: `/appointments/${target.id}`
            });
          }
        } else if (status === 'rejected') {
          // Student receives decline notification (Item 5)
          await notificationService.notifyAppointmentEvent({
            userId: target.patientId,
            title: 'Appointment Declined',
            message: `Your appointment request with ${docName} on ${target.appointmentDate} at ${target.timeSlot} could not be accepted (Booking ID: ${target.bookingId}).`,
            type: 'appointment',
            link: `/appointments/${target.id}`
          });

          // Doctor confirmation
          for (const targetDocId of doctorTargets) {
            await notificationService.notifyAppointmentEvent({
              userId: targetDocId,
              title: 'Appointment Request Declined',
              message: `You declined the appointment request from student ${target.patientName} on ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}).`,
              type: 'appointment',
              link: `/appointments/${target.id}`
            });
          }
        } else if (status === 'in_progress') {
          // Consultation start notification to BOTH student and doctor (Item 4 & 5)
          await notificationService.notifyAppointmentEvent({
            userId: target.patientId,
            title: 'Consultation Started',
            message: `${docName} has started the consultation session for ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}). Click to join video room.`,
            type: 'appointment',
            link: `/consultation/${target.id}`
          });

          for (const targetDocId of doctorTargets) {
            await notificationService.notifyAppointmentEvent({
              userId: targetDocId,
              title: 'Consultation Session Active',
              message: `Consultation session with patient ${target.patientName} for ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}) is active. Click to open video room.`,
              type: 'appointment',
              link: `/consultation/${target.id}`
            });
          }
        } else if (status === 'completed') {
          // Consultation completed notification
          await notificationService.notifyAppointmentEvent({
            userId: target.patientId,
            title: 'Consultation Completed',
            message: `Your consultation with ${docName} on ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}) has ended. Review your prescription and medical records.`,
            type: 'appointment',
            link: `/appointments/${target.id}`
          });

          for (const targetDocId of doctorTargets) {
            await notificationService.notifyAppointmentEvent({
              userId: targetDocId,
              title: 'Consultation Completed',
              message: `Consultation with student ${target.patientName} on ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}) has been finalized.`,
              type: 'appointment',
              link: `/appointments/${target.id}`
            });
          }
        } else if (status === 'cancelled') {
          await notificationService.notifyAppointmentEvent({
            userId: target.patientId,
            title: 'Appointment Cancelled',
            message: `Your appointment with ${docName} on ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}) was cancelled.`,
            type: 'appointment',
            link: `/appointments/${target.id}`
          });

          for (const targetDocId of doctorTargets) {
            await notificationService.notifyAppointmentEvent({
              userId: targetDocId,
              title: 'Appointment Cancelled',
              message: `Appointment with student ${target.patientName} on ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}) was cancelled.`,
              type: 'appointment',
              link: `/appointments/${target.id}`
            });
          }
        }
      } catch (e) {
        console.warn('[appointmentService] Error dispatching status change notification:', e);
      }
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
      const docName = target.doctorName.startsWith('Dr.') || target.doctorName.startsWith('Dr ')
        ? target.doctorName
        : `Dr. ${target.doctorName}`;

      const doctorTargets = getEquivalentUserIds(target.doctorId);

      try {
        // Student notification
        await notificationService.notifyAppointmentEvent({
          userId: target.patientId,
          title: 'Appointment Rescheduled',
          message: `Your appointment with ${docName} (Booking ID: ${target.bookingId}) has been rescheduled to ${newDate} at ${newSlot}.`,
          type: 'appointment',
          link: `/appointments/${target.id}`
        });

        // Doctor notification
        for (const targetDocId of doctorTargets) {
          await notificationService.notifyAppointmentEvent({
            userId: targetDocId,
            title: 'Appointment Rescheduled',
            message: `Appointment with student ${target.patientName} (Booking ID: ${target.bookingId}) has been rescheduled to ${newDate} at ${newSlot}.`,
            type: 'appointment',
            link: `/appointments/${target.id}`
          });
        }
      } catch (e) {
        console.warn('[appointmentService] Error dispatching reschedule notifications:', e);
      }
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
