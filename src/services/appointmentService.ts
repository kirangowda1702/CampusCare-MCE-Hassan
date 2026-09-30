import { supabase, isSupabaseConfigured } from './supabase';
import { Appointment, AppointmentStatus } from '../types';
import { mockAppointments } from '../data/appointments';
import { notificationService, getEquivalentUserIds } from './notificationService';
import { isDateInPast, isDateToday, isTimeSlotInPastToday, getTodayIST } from '../utils/dateUtils';

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

// Check for valid UUID format
export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Master mapping between doctor IDs, UUIDs, and profiles
export const DOCTOR_ID_MAP: Record<string, { doctorId: string; userUuid: string; doctorName: string }> = {
  'DOC001': {
    doctorId: 'DOC001',
    userUuid: 'd0000001-0000-0000-0000-000000000001',
    doctorName: 'Dr. Kiran Gowda'
  },
  'usr-doctor-kiran': {
    doctorId: 'DOC001',
    userUuid: 'd0000001-0000-0000-0000-000000000001',
    doctorName: 'Dr. Kiran Gowda'
  },
  'd0000001-0000-0000-0000-000000000001': {
    doctorId: 'DOC001',
    userUuid: 'd0000001-0000-0000-0000-000000000001',
    doctorName: 'Dr. Kiran Gowda'
  },
  'DOC002': {
    doctorId: 'DOC002',
    userUuid: 'd0000002-0000-0000-0000-000000000002',
    doctorName: 'Dr. Madan S K'
  },
  'usr-doctor-madan': {
    doctorId: 'DOC002',
    userUuid: 'd0000002-0000-0000-0000-000000000002',
    doctorName: 'Dr. Madan S K'
  },
  'd0000002-0000-0000-0000-000000000002': {
    doctorId: 'DOC002',
    userUuid: 'd0000002-0000-0000-0000-000000000002',
    doctorName: 'Dr. Madan S K'
  }
};

/**
 * Universal matcher that checks if an appointment is assigned to a specific doctor.
 * Matches across doctorId (DOC001), user.id (UUID), doctor username, and aliases.
 */
export function isAppointmentForDoctor(
  appointment: Appointment,
  user: { doctorId?: string; id?: string; email?: string; fullName?: string } | null
): boolean {
  if (!user) return true;

  const aptDocId = (appointment.doctorId || '').trim().toUpperCase();
  const userDocId = (user.doctorId || '').trim().toUpperCase();
  const userId = (user.id || '').trim().toUpperCase();

  // 1. Direct doctorId match (e.g. DOC001 === DOC001)
  if (userDocId && (aptDocId === userDocId || aptDocId.includes(userDocId))) return true;

  // 2. Direct user.id match
  if (userId && (aptDocId === userId || appointment.doctorId === user.id)) return true;

  // 3. Known doctor accounts mapping (Dr. Kiran Gowda / DOC001)
  const emailLower = (user.email || '').toLowerCase();
  const isKiranDoctor =
    userDocId === 'DOC001' ||
    userId === 'USR-DOCTOR-KIRAN' ||
    userId === 'D0000001-0000-0000-0000-000000000001' ||
    emailLower.includes('kiran') ||
    (user.fullName || '').toLowerCase().includes('kiran');

  if (isKiranDoctor) {
    if (
      aptDocId === 'DOC001' ||
      aptDocId === 'USR-DOCTOR-KIRAN' ||
      aptDocId === 'D0000001-0000-0000-0000-000000000001' ||
      aptDocId === 'DOC-1'
    ) {
      return true;
    }
    const cleanDocName = (appointment.doctorName || '').toLowerCase();
    if (cleanDocName.includes('kiran')) return true;
  }

  // 4. Known doctor accounts mapping (Dr. Madan S K / DOC002)
  const isMadanDoctor =
    userDocId === 'DOC002' ||
    userId === 'USR-DOCTOR-MADAN' ||
    userId === 'D0000002-0000-0000-0000-000000000002' ||
    emailLower.includes('madan') ||
    (user.fullName || '').toLowerCase().includes('madan');

  if (isMadanDoctor) {
    if (
      aptDocId === 'DOC002' ||
      aptDocId === 'USR-DOCTOR-MADAN' ||
      aptDocId === 'D0000002-0000-0000-0000-000000000002'
    ) {
      return true;
    }
    const cleanDocName = (appointment.doctorName || '').toLowerCase();
    if (cleanDocName.includes('madan')) return true;
  }

  // 5. Name-based alphanumeric match
  if (user.fullName && appointment.doctorName) {
    const cleanUser = user.fullName.toLowerCase().replace(/^dr[\.\s]+/i, '').replace(/[^a-z0-9]/g, '');
    const cleanDoc = appointment.doctorName.toLowerCase().replace(/^dr[\.\s]+/i, '').replace(/[^a-z0-9]/g, '');
    if (cleanUser.length >= 3 && cleanDoc.length >= 3) {
      if (cleanUser === cleanDoc || cleanUser.includes(cleanDoc) || cleanDoc.includes(cleanUser)) {
        return true;
      }
    }
  }

  return false;
}

export function normalizeAppointment(d: any): Appointment {
  const rawStatus = (d.status || 'pending').toString().toLowerCase();
  let status: AppointmentStatus = 'pending';
  if (rawStatus === 'confirmed' || rawStatus === 'accepted') status = 'confirmed';
  else if (rawStatus === 'rejected' || rawStatus === 'declined') status = 'rejected';
  else if (rawStatus === 'in_progress') status = 'in_progress';
  else if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else if (rawStatus === 'rescheduled') status = 'rescheduled';

  // Normalize doctor ID and name
  const rawDocId = (d.doctor_id || d.doctorId || 'DOC001').toString();
  let doctorId = rawDocId;
  let doctorName = d.doctor_name || d.doctorName;
  let doctorSpecialization = d.doctor_specialization || d.doctorSpecialization || 'General Medicine';

  if (
    rawDocId === 'd0000001-0000-0000-0000-000000000001' ||
    rawDocId.toUpperCase() === 'DOC001' ||
    rawDocId === 'usr-doctor-kiran' ||
    rawDocId.toLowerCase().includes('kiran')
  ) {
    doctorId = 'DOC001';
    doctorName = doctorName || 'Dr. Kiran Gowda';
  } else if (
    rawDocId === 'd0000002-0000-0000-0000-000000000002' ||
    rawDocId.toUpperCase() === 'DOC002' ||
    rawDocId === 'usr-doctor-madan' ||
    rawDocId.toLowerCase().includes('madan')
  ) {
    doctorId = 'DOC002';
    doctorName = doctorName || 'Dr. Madan S K';
  } else if (!doctorName) {
    doctorName = 'Dr. Kiran Gowda';
  }

  // Ensure clean YYYY-MM-DD date representation
  const rawDate = (d.appointment_date || d.appointmentDate || d.date || getTodayIST()).toString();
  const appointmentDate = rawDate.slice(0, 10);

  return {
    id: d.id || d.appointment_id || ('apt-' + Date.now()),
    bookingId: d.bookingId || d.booking_id || d.id || 'MCE-APT-2026-0000',
    patientId: d.patientId || d.patient_id || d.student_id || d.user_id || 'usr-student-1',
    patientName: d.patientName || d.patient_name || d.student_name || 'Rahul Sharma',
    patientRole: d.patientRole || d.patient_role || 'student',
    patientEmail: d.patientEmail || d.patient_email || 'student@mcehassan.ac.in',
    patientPhone: d.patientPhone || d.patient_phone || '+91 98765 43210',
    patientUSNorEmpId: d.patientUSNorEmpId || d.patient_usn_or_emp_id || d.usn || d.employee_id,
    doctorId,
    doctorName,
    doctorSpecialization,
    doctorAvatar: d.doctorAvatar || d.doctor_avatar || d.avatar_url,
    serviceId: d.serviceId || d.service_id || 'srv-1',
    serviceName: d.serviceName || d.service_name || 'General Consultation',
    appointmentDate,
    timeSlot: d.timeSlot || d.time_slot || d.time || '10:00 AM',
    startTime: d.startTime || d.start_time,
    endTime: d.endTime || d.end_time,
    consultationType: (d.consultationType || d.consultation_type || 'video').toString().toLowerCase() as any,
    reason: d.reason || 'General Consultation',
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
    let supabaseAppointments: Appointment[] = [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          supabaseAppointments = data.map(normalizeAppointment);
        }
      } catch (err) {
        console.warn('Supabase fetch appointments error:', err);
      }
    }

    // Merge with in-memory / local storage records
    const saved = getLocalItem(STORAGE_KEY);
    let localList: Appointment[] = [];
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localList = parsed.map(normalizeAppointment);
        }
      } catch (e) {}
    }

    // Combine records uniquely by bookingId and id
    const appointmentMap = new Map<string, Appointment>();

    // 1. Add Supabase records
    supabaseAppointments.forEach(apt => {
      appointmentMap.set(apt.bookingId, apt);
      appointmentMap.set(apt.id, apt);
    });

    // 2. Add local storage records (keeps newly booked or offline appointments)
    localList.forEach(apt => {
      if (!appointmentMap.has(apt.bookingId) && !appointmentMap.has(apt.id)) {
        appointmentMap.set(apt.bookingId, apt);
      }
    });

    // 3. Fallback to inMemoryAppointments if empty
    inMemoryAppointments.forEach(apt => {
      if (!appointmentMap.has(apt.bookingId) && !appointmentMap.has(apt.id)) {
        appointmentMap.set(apt.bookingId, apt);
      }
    });

    const combined = Array.from(new Set(appointmentMap.values())).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (combined.length > 0) {
      inMemoryAppointments = combined;
      setLocalItem(STORAGE_KEY, JSON.stringify(combined));
      return combined;
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
    const appointmentId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : ('apt-' + Date.now());

    const newApt: Appointment = {
      id: appointmentId,
      bookingId: `MCE-APT-2026-${randomNum}`,
      ...appointment,
      status: appointment.status ? (appointment.status.toLowerCase() as AppointmentStatus) : 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        // Resolve doctor ID (UUID or authoritative ID)
        let resolvedDoctorId = newApt.doctorId;
        if (newApt.doctorId === 'DOC001') {
          resolvedDoctorId = 'd0000001-0000-0000-0000-000000000001';
        } else if (newApt.doctorId === 'DOC002') {
          resolvedDoctorId = 'd0000002-0000-0000-0000-000000000002';
        }

        const dbPayload: any = {
          booking_id: newApt.bookingId,
          appointment_date: newApt.appointmentDate,
          time_slot: newApt.timeSlot,
          start_time: newApt.startTime || null,
          end_time: newApt.endTime || null,
          consultation_type: (newApt.consultationType || 'video').toLowerCase(),
          reason: newApt.reason || 'General Consultation',
          symptoms: Array.isArray(newApt.symptoms) ? newApt.symptoms : [],
          status: (newApt.status || 'pending').toLowerCase()
        };

        if (isValidUuid(newApt.id)) {
          dbPayload.id = newApt.id;
        }

        if (isValidUuid(resolvedDoctorId)) {
          dbPayload.doctor_id = resolvedDoctorId;
        }

        if (isValidUuid(newApt.patientId)) {
          dbPayload.patient_id = newApt.patientId;
        }

        const { error } = await supabase.from('appointments').insert([dbPayload]);
        if (error) {
          console.warn('[appointmentService] Primary insert returned warning, trying raw fallback:', error);
          // Fallback: minimal insert without strict foreign keys if needed
          await supabase.from('appointments').insert([{
            booking_id: newApt.bookingId,
            appointment_date: newApt.appointmentDate,
            time_slot: newApt.timeSlot,
            consultation_type: (newApt.consultationType || 'video').toLowerCase(),
            status: (newApt.status || 'pending').toLowerCase(),
            reason: newApt.reason
          }]);
        }
      } catch (err) {
        console.warn('Supabase insert error:', err);
      }
    }

    inMemoryAppointments = [newApt, ...inMemoryAppointments.filter(a => a.id !== newApt.id && a.bookingId !== newApt.bookingId)];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryAppointments));
    notifyLocalListeners();
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
