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
