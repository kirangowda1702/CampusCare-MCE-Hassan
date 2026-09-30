import { appointmentService } from './appointmentService';
import { notificationService, DOCTOR_USER_MAP } from './notificationService';
import { Appointment } from '../types';

const SENT_REMINDERS_KEY = 'campuscare_sent_appointment_reminders';

function getSentReminders(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SENT_REMINDERS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSentReminder(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const set = getSentReminders();
    set.add(key);
    // Keep set to a reasonable max size (last 300 reminders)
    const array = Array.from(set).slice(-300);
    localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(array));
  } catch {}
}

/**
 * Parses appointment date ("YYYY-MM-DD") and timeSlot ("10:00 AM", "02:30 PM", "11:00")
 * into a valid JavaScript Date in the current client timezone (IST).
 */
export function parseAppointmentDateTime(dateStr: string, timeSlotStr: string): Date | null {
  if (!dateStr || !timeSlotStr) return null;

  const timeMatch = timeSlotStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const meridian = timeMatch[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const date = new Date(year, month, day, hours, minutes, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

export const appointmentReminderService = {
  /**
   * Evaluates all confirmed and active appointments and fires:
   * 1. Pre-consultation reminder (15–30 mins before) to BOTH doctor and student.
   * 2. Start-time notification (0 mins, window -15 to +5 mins) to BOTH doctor and student.
   */
  async checkUpcomingAppointments(customAppointments?: Appointment[]): Promise<{
    remindersSent: number;
    startNotificationsSent: number;
  }> {
    let remindersSent = 0;
    let startNotificationsSent = 0;

    const appointments = customAppointments || (await appointmentService.getAppointments());
    const now = new Date();
    const sentSet = getSentReminders();

    for (const apt of appointments) {
      // Only process active confirmed or in_progress consultations
      if (apt.status !== 'confirmed' && apt.status !== 'in_progress') {
        continue;
      }

      const scheduledDate = parseAppointmentDateTime(apt.appointmentDate, apt.timeSlot);
      if (!scheduledDate) continue;

      const diffMs = scheduledDate.getTime() - now.getTime();
      const diffMinutes = diffMs / (60 * 1000);

      const docName = apt.doctorName.startsWith('Dr.') || apt.doctorName.startsWith('Dr ')
        ? apt.doctorName
        : `Dr. ${apt.doctorName}`;

      const doctorTargets = [apt.doctorId];
      const mapped = DOCTOR_USER_MAP[apt.doctorId];
      if (mapped) {
        mapped.forEach(id => {
          if (!doctorTargets.includes(id)) doctorTargets.push(id);
        });
      }

      // 1. PRE-CONSULTATION REMINDER (15 - 30 minutes before scheduled start time)
      const preReminderKey = `reminder_pre_${apt.id}_${apt.appointmentDate}_${apt.timeSlot}`;
      if (diffMinutes <= 30 && diffMinutes >= 5 && !sentSet.has(preReminderKey)) {
        const roundedMins = Math.max(1, Math.round(diffMinutes));

        // Send to Student
        await notificationService.notifyAppointmentEvent({
          userId: apt.patientId,
          title: `Upcoming Consultation in ${roundedMins} min`,
          message: `Reminder: Your consultation with ${docName} is scheduled for today, ${apt.appointmentDate} at ${apt.timeSlot} (Booking ID: ${apt.bookingId}). Please ensure your camera and microphone are ready.`,
          type: 'reminder',
          link: `/appointments/${apt.id}`
        });

        // Send to Doctor (all mapped doctor IDs)
        for (const docTarget of doctorTargets) {
          await notificationService.notifyAppointmentEvent({
            userId: docTarget,
            title: `Upcoming Consultation in ${roundedMins} min`,
            message: `Reminder: Consultation with patient ${apt.patientName} is scheduled for today, ${apt.appointmentDate} at ${apt.timeSlot} (Booking ID: ${apt.bookingId}).`,
            type: 'reminder',
            link: `/appointments/${apt.id}`
          });
        }

        saveSentReminder(preReminderKey);
        remindersSent++;
      }

      // 2. CONSULTATION START TIME NOTIFICATION (Window: -15 min to +5 min of scheduled start)
      const startReminderKey = `reminder_start_${apt.id}_${apt.appointmentDate}_${apt.timeSlot}`;
      if (diffMinutes <= 5 && diffMinutes >= -15 && !sentSet.has(startReminderKey)) {
        // Send to Student with direct video room link
        await notificationService.notifyAppointmentEvent({
          userId: apt.patientId,
          title: 'Consultation Starting Now',
          message: `Your consultation with ${docName} (${apt.appointmentDate} at ${apt.timeSlot}, Booking ID: ${apt.bookingId}) is starting now. Click here to join the video room.`,
          type: 'appointment',
          link: `/consultation/${apt.id}`
        });

        // Send to Doctor with direct video room link
        for (const docTarget of doctorTargets) {
          await notificationService.notifyAppointmentEvent({
            userId: docTarget,
            title: 'Consultation Starting Now',
            message: `Your consultation session with ${apt.patientName} (${apt.appointmentDate} at ${apt.timeSlot}, Booking ID: ${apt.bookingId}) is starting now. Click here to open the video room.`,
            type: 'appointment',
            link: `/consultation/${apt.id}`
          });
        }

        saveSentReminder(startReminderKey);
        startNotificationsSent++;
      }
    }

    return { remindersSent, startNotificationsSent };
  },

  /**
   * Initializes background polling daemon that checks every intervalMs.
   */
  startDaemon(intervalMs = 30000): () => void {
    // Initial run
    this.checkUpcomingAppointments().catch(() => {});

    const timer = setInterval(() => {
      this.checkUpcomingAppointments().catch(() => {});
    }, intervalMs);

    return () => clearInterval(timer);
  }
};
