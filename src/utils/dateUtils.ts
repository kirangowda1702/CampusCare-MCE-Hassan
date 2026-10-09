// India Standard Time (Asia/Kolkata) Date & Time Utilities

export const TIMEZONE_IST = 'Asia/Kolkata';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

/**
 * Returns today's date in YYYY-MM-DD format strictly in Asia/Kolkata (IST).
 */
export function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Returns the current hours, minutes, and 24h formatted string in IST.
 */
export function getCurrentTimeIST(): { hours: number; minutes: number; time24: string } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [hoursStr, minutesStr] = formatter.format(new Date()).split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { hours, minutes, time24 };
}

/**
 * Checks whether a given YYYY-MM-DD date is strictly in the past relative to today in IST.
 */
export function isDateInPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = getTodayIST();
  return dateStr < today;
}

/**
 * Checks whether a given YYYY-MM-DD date is today in IST.
 */
export function isDateToday(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr === getTodayIST();
}

/**
 * Checks whether a 24-hour time slot (e.g., "10:00" or "13:30") is in the past for TODAY in IST.
 */
export function isTimeSlotInPastToday(time24: string): boolean {
  if (!time24) return false;
  const [slotH, slotM] = time24.split(':').map(Number);
  const { hours: nowH, minutes: nowM } = getCurrentTimeIST();
  const slotMinutes = slotH * 60 + slotM;
  const nowMinutes = nowH * 60 + nowM;
  return slotMinutes <= nowMinutes;
}

/**
 * Returns the day of the week name ('Sunday' ... 'Saturday') for a YYYY-MM-DD date without UTC offset bugs.
 */
export function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  return DAY_NAMES[dateObj.getDay()];
}

/**
 * Formats YYYY-MM-DD into a human-readable display string, e.g. "Wednesday, 30 September 2026".
 */
export function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const dayName = getDayOfWeek(dateStr);
  const monthName = MONTH_NAMES[month - 1];
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Formats YYYY-MM-DD into short display string, e.g. "30 Sep 2026".
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const monthShort = MONTH_NAMES[month - 1].substring(0, 3);
  return `${day} ${monthShort} ${year}`;
}

export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  dayOfWeek: string;
}

/**
 * Generates an array of calendar days for the given year and month (1-indexed: 1 = Jan, 12 = Dec).
 * Includes padding days from the previous and next months to form complete 7-day weeks.
 */
export function generateMonthGrid(year: number, month: number): CalendarDay[] {
  const today = getTodayIST();
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = lastDayOfMonth.getDate();

  // Days in previous month
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();

  const grid: CalendarDay[] = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonthDate = new Date(year, month - 2, d);
    const y = prevMonthDate.getFullYear();
    const m = prevMonthDate.getMonth() + 1;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === today,
      isPast: dateStr < today,
      dayOfWeek: DAY_NAMES[prevMonthDate.getDay()]
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeekIndex = new Date(year, month - 1, d).getDay();
    grid.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === today,
      isPast: dateStr < today,
      dayOfWeek: DAY_NAMES[dayOfWeekIndex]
    });
  }

  // Next month padding to complete the last week row
  const remainingCells = 7 - (grid.length % 7);
  if (remainingCells < 7) {
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonthDate = new Date(year, month, d);
      const y = nextMonthDate.getFullYear();
      const m = nextMonthDate.getMonth() + 1;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === today,
        isPast: dateStr < today,
        dayOfWeek: DAY_NAMES[nextMonthDate.getDay()]
      });
    }
  }

  return grid;
}

/**
 * Parse an appointment date (YYYY-MM-DD) and time slot ("11:00 AM", "01:30 PM", "11:00")
 * strictly into an Asia/Kolkata (IST) Unix epoch timestamp in milliseconds.
 * IST is fixed at UTC+05:30 (+330 minutes).
 */
export function getAppointmentEpochMsIST(
  dateStr: string,
  timeSlotStr: string,
  startTime24?: string
): number | null {
  if (!dateStr) return null;
  const dateParts = dateStr.slice(0, 10).split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(isNaN)) return null;
  const [year, month, day] = dateParts;

  let hours = 0;
  let minutes = 0;

  if (timeSlotStr) {
    const match = timeSlotStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const meridian = match[3]?.toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
    } else if (startTime24) {
      const [h, m] = startTime24.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        hours = h;
        minutes = m;
      }
    }
  } else if (startTime24) {
    const [h, m] = startTime24.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      hours = h;
      minutes = m;
    }
  } else {
    return null;
  }

  // Asia/Kolkata is UTC+05:30 -> subtract 330 minutes from Date.UTC
  const istOffsetMinutes = 330;
  return Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - istOffsetMinutes * 60 * 1000;
}

export interface AppointmentAccessResult {
  isAccessible: boolean;
  isTimeReached: boolean;
  isStatusPermitted: boolean;
  scheduledEpochMs: number | null;
  currentEpochMs: number;
  minutesUntil: number;
  timeSlotIST: string;
  dateIST: string;
  message: string;
  status: string;
}

/**
 * Validates whether video consultation room is currently accessible based on IST schedule and status.
 * An appointment scheduled for 11:00 AM must NOT allow video consultation before 11:00 AM.
 * Optional serverEpochMs allows passing trusted server time.
 */
export function checkAppointmentAccessIST(
  appointment: {
    appointmentDate: string;
    timeSlot: string;
    startTime?: string;
    status?: string;
    consultationType?: string;
  },
  serverEpochMs?: number
): AppointmentAccessResult {
  const currentEpochMs = serverEpochMs ?? Date.now();
  const rawStatus = (appointment.status || 'pending').toLowerCase();
  
  // Statuses that can potentially access consultation
  const permittedStatuses = ['confirmed', 'accepted', 'ready', 'in_progress'];
  const isStatusPermitted = permittedStatuses.includes(rawStatus);

  const scheduledEpochMs = getAppointmentEpochMsIST(
    appointment.appointmentDate,
    appointment.timeSlot,
    appointment.startTime
  );

  const timeSlot = appointment.timeSlot || 'Scheduled Time';
  const dateStr = appointment.appointmentDate || getTodayIST();

  if (!isStatusPermitted) {
    let msg = 'Consultation room is not active.';
    if (rawStatus === 'pending') {
      msg = 'Appointment is pending doctor acceptance.';
    } else if (rawStatus === 'rejected') {
      msg = 'Appointment has been declined.';
    } else if (rawStatus === 'cancelled') {
      msg = 'Appointment has been cancelled.';
    } else if (rawStatus === 'completed') {
      msg = 'Consultation has already been completed.';
    }
    return {
      isAccessible: false,
      isTimeReached: false,
      isStatusPermitted: false,
      scheduledEpochMs,
      currentEpochMs,
      minutesUntil: 0,
      timeSlotIST: timeSlot,
      dateIST: dateStr,
      message: msg,
      status: rawStatus
    };
  }

  // If consultation is already marked in_progress by doctor, always permit joining
  if (rawStatus === 'in_progress') {
    return {
      isAccessible: true,
      isTimeReached: true,
      isStatusPermitted: true,
      scheduledEpochMs,
      currentEpochMs,
      minutesUntil: 0,
      timeSlotIST: timeSlot,
      dateIST: dateStr,
      message: 'Video consultation is currently active.',
      status: rawStatus
    };
  }

  // When scheduled time is not parsable, default to safe false if future or true if today
  if (!scheduledEpochMs) {
    return {
      isAccessible: true,
      isTimeReached: true,
      isStatusPermitted: true,
      scheduledEpochMs: currentEpochMs,
      currentEpochMs,
      minutesUntil: 0,
      timeSlotIST: timeSlot,
      dateIST: dateStr,
      message: 'Video consultation is ready.',
      status: rawStatus
    };
  }

  const diffMs = scheduledEpochMs - currentEpochMs;
  const isTimeReached = diffMs <= 0;
  const minutesUntil = Math.max(0, Math.ceil(diffMs / (60 * 1000)));

  if (!isTimeReached) {
    const isToday = isDateToday(dateStr);
    const timeMessage = isToday
      ? `Video consultation will be available at ${timeSlot}.`
      : `Video consultation will be available at ${timeSlot} on ${formatDateShort(dateStr)}.`;

    return {
      isAccessible: false,
      isTimeReached: false,
      isStatusPermitted: true,
      scheduledEpochMs,
      currentEpochMs,
      minutesUntil,
      timeSlotIST: timeSlot,
      dateIST: dateStr,
      message: timeMessage,
      status: rawStatus
    };
  }

  return {
    isAccessible: true,
    isTimeReached: true,
    isStatusPermitted: true,
    scheduledEpochMs,
    currentEpochMs,
    minutesUntil: 0,
    timeSlotIST: timeSlot,
    dateIST: dateStr,
    message: 'Video consultation is now available.',
    status: rawStatus
  };
}

/**
 * Converts a 24-hour time string ("11:30" or "14:15") to 12-hour format ("11:30 AM" or "02:15 PM").
 */
export function convert24To12(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Converts a 12-hour time string ("11:30 AM" or "2:15 PM") to 24-hour format ("11:30" or "14:15").
 */
export function convert12To24(time12: string): string {
  if (!time12) return '';
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return time12;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates end time given start time ("11:30") and duration in minutes.
 */
export function calculateSlotEndTime(startTime24: string, durationMinutes = 30): string {
  if (!startTime24) return '';
  const [h, m] = startTime24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return startTime24;
  const totalM = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export interface AppointmentScheduleDisplay {
  dateIST: string;
  timeSlotIST: string;
  epochMs: number | null;
  displayIST: string;
  displayFullIST: string;
  displayLocal: string;
  isLocalDifferent: boolean;
  localTimezone: string;
}

/**
 * Formats appointment schedule consistently, converting to user's local timezone if different from IST.
 */
export function formatAppointmentScheduleDisplay(
  appointmentDate: string,
  timeSlot: string,
  startTime?: string
): AppointmentScheduleDisplay {
  const epochMs = getAppointmentEpochMsIST(appointmentDate, timeSlot, startTime);
  const userTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat
    ? (Intl.DateTimeFormat().resolvedOptions().timeZone || TIMEZONE_IST)
    : TIMEZONE_IST;
  const isLocalDifferent = userTimezone !== TIMEZONE_IST && userTimezone !== 'UTC+5:30';

  const cleanDate = appointmentDate ? appointmentDate.slice(0, 10) : getTodayIST();
  const cleanSlot = timeSlot || '10:00 AM';

  let displayIST = `${cleanDate} at ${cleanSlot}`;
  let displayFullIST = `${formatDateFull(cleanDate)} at ${cleanSlot} IST`;
  let displayLocal = `${cleanSlot} IST`;

  if (epochMs) {
    const dateObj = new Date(epochMs);
    try {
      const istFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: TIMEZONE_IST,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      displayIST = `${istFormatter.format(dateObj)} IST`;

      const istFullFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: TIMEZONE_IST,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      displayFullIST = `${istFullFormatter.format(dateObj)} IST`;

      if (isLocalDifferent) {
        const localFormatter = new Intl.DateTimeFormat(undefined, {
          timeZone: userTimezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        displayLocal = `${localFormatter.format(dateObj)} (${userTimezone})`;
      }
    } catch {
      // Fallback
    }
  }

  return {
    dateIST: cleanDate,
    timeSlotIST: cleanSlot,
    epochMs,
    displayIST,
    displayFullIST,
    displayLocal,
    isLocalDifferent,
    localTimezone: userTimezone
  };
}
