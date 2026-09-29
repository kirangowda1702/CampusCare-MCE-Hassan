import { supabase, isSupabaseConfigured } from './supabase';
import { DoctorAvailability } from '../types';
import { appointmentService } from './appointmentService';
import { getDayOfWeek, isDateInPast, isDateToday, isTimeSlotInPastToday } from '../utils/dateUtils';
import { mockDoctors } from '../data/doctors';

const STORAGE_KEY = 'campuscare_doctor_availability';

// Default initial schedule rules
const defaultAvailabilities: DoctorAvailability[] = [
  {
    id: 'avail-doc001',
    doctorId: 'DOC001',
    dayOfWeek: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
    startTime: '10:00',
    endTime: '13:00',
    slotDurationMinutes: 30,
    breakStartTime: undefined,
    breakEndTime: undefined,
    isOnlineEnabled: true,
    isInPersonEnabled: true,
    isActive: true
  },
  {
    id: 'avail-doc002',
    doctorId: 'DOC002',
    dayOfWeek: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
    startTime: '10:00',
    endTime: '13:00',
    slotDurationMinutes: 30,
    breakStartTime: undefined,
    breakEndTime: undefined,
    isOnlineEnabled: true,
    isInPersonEnabled: true,
    isActive: true
  },
  {
    id: 'avail-001',
    doctorId: 'doc-hassan-001',
    dayOfWeek: 'Daily',
    startTime: '09:30',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breakStartTime: '14:00',
    breakEndTime: '17:00',
    isOnlineEnabled: false,
    isInPersonEnabled: true,
    isActive: true
  },
  {
    id: 'avail-002',
    doctorId: 'doc-hassan-002',
    dayOfWeek: 'Daily',
    startTime: '17:30',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breakStartTime: undefined,
    breakEndTime: undefined,
    isOnlineEnabled: false,
    isInPersonEnabled: true,
    isActive: true
  },
  {
    id: 'avail-003',
    doctorId: 'doc-hassan-003',
    dayOfWeek: 'Daily',
    startTime: '17:30',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breakStartTime: undefined,
    breakEndTime: undefined,
    isOnlineEnabled: false,
    isInPersonEnabled: true,
    isActive: true
  },
  {
    id: 'avail-004',
    doctorId: 'doc-hassan-004',
    dayOfWeek: 'Daily',
    startTime: '09:30',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breakStartTime: '14:00',
    breakEndTime: '17:00',
    isOnlineEnabled: false,
    isInPersonEnabled: true,
    isActive: true
  },
  {
    id: 'avail-005',
    doctorId: 'doc-hassan-005',
    dayOfWeek: 'Daily',
    startTime: '09:30',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breakStartTime: '14:00',
    breakEndTime: '17:00',
    isOnlineEnabled: false,
    isInPersonEnabled: true,
    isActive: true
  },
  {
    id: 'avail-campus-001',
    doctorId: 'doc-1',
    dayOfWeek: 'Daily',
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    isOnlineEnabled: true,
    isInPersonEnabled: true,
    isActive: true
  }
];

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

export interface GeneratedSlot {
  slot: string; // '09:30 AM'
  startTime: string; // '09:30'
  endTime: string; // '10:00'
  isAvailable: boolean;
  bookedReason?: string;
}

export const doctorAvailabilityService = {
  async getAvailabilities(doctorId?: string): Promise<DoctorAvailability[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('doctor_availability').select('*').eq('is_active', true);
        if (doctorId) {
          query = query.eq('doctor_id', doctorId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            doctorId: d.doctor_id,
            dayOfWeek: d.day_of_week,
            startTime: d.start_time,
            endTime: d.end_time,
            slotDurationMinutes: d.slot_duration_minutes || 30,
            breakStartTime: d.break_start_time,
            breakEndTime: d.break_end_time,
            isOnlineEnabled: d.is_online_enabled ?? true,
            isInPersonEnabled: d.is_in_person_enabled ?? true,
            isActive: d.is_active ?? true
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch doctor availability from Supabase', err);
      }
    }

    const saved = getLocalItem(STORAGE_KEY);
    let items: DoctorAvailability[] = defaultAvailabilities;
    if (saved) {
      try {
        items = JSON.parse(saved);
      } catch (e) {
        items = defaultAvailabilities;
      }
    }

    if (doctorId) {
      return items.filter(a => a.doctorId === doctorId && a.isActive);
    }
    return items;
  },

  async saveAvailability(availability: DoctorAvailability): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('doctor_availability').upsert({
          id: availability.id,
          doctor_id: availability.doctorId,
          day_of_week: availability.dayOfWeek,
          start_time: availability.startTime,
          end_time: availability.endTime,
          slot_duration_minutes: availability.slotDurationMinutes,
          break_start_time: availability.breakStartTime,
          break_end_time: availability.breakEndTime,
          is_online_enabled: availability.isOnlineEnabled,
          is_in_person_enabled: availability.isInPersonEnabled,
          is_active: availability.isActive,
          updated_at: new Date().toISOString()
        });
        if (!error) return true;
      } catch (err) {
        console.warn('Failed to upsert doctor availability to Supabase', err);
      }
    }

    const saved = getLocalItem(STORAGE_KEY);
    let items: DoctorAvailability[] = defaultAvailabilities;
    if (saved) {
      try { items = JSON.parse(saved); } catch (e) {}
    }
    const idx = items.findIndex(a => a.id === availability.id);
    if (idx >= 0) {
      items[idx] = availability;
    } else {
      items.push(availability);
    }
    setLocalItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  },

  async getAvailableSlots(doctorId: string, dateStr: string): Promise<GeneratedSlot[]> {
    if (!dateStr || isDateInPast(dateStr)) {
      return [];
    }

    const currentDayName = getDayOfWeek(dateStr);
    if (!currentDayName) {
      return [];
    }

    // 1. Verify doctor duty days from doctor profile
    const doctorRecord = mockDoctors.find(d => d.id === doctorId || d.doctorId === doctorId);
    if (doctorRecord) {
      const activeDays = (doctorRecord.availableDays || doctorRecord.availability_days || []).map(d => d.toLowerCase());
      if (activeDays.length > 0 && !activeDays.includes(currentDayName.toLowerCase()) && !activeDays.includes('daily')) {
        return [];
      }
    }

    // 2. Fetch matching availability schedule rule for this doctor and day
    const rules = await this.getAvailabilities(doctorId);
    const rule = rules.find(r => {
      if (!r.isActive) return false;
      if (r.dayOfWeek === 'Daily') return true;
      const days = r.dayOfWeek.split(',').map(d => d.trim().toLowerCase());
      return days.includes(currentDayName.toLowerCase());
    });

    if (!rule || !rule.isActive) {
      return [];
    }

    // 3. Query existing booked appointments for double booking check
    const appointments = await appointmentService.getAppointments();
    const bookedSlots = appointments.filter(
      a =>
        (a.doctorId === doctorId || a.doctorId === doctorRecord?.doctorId || a.doctorId === doctorRecord?.id) &&
        a.appointmentDate === dateStr &&
        a.status !== 'cancelled' &&
        a.status !== 'rejected'
    );

    const slots: GeneratedSlot[] = [];
    const [startH, startM] = rule.startTime.split(':').map(Number);
    const [endH, endM] = rule.endTime.split(':').map(Number);
    const duration = rule.slotDurationMinutes || 30;

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let breakStartMinutes = -1;
    let breakEndMinutes = -1;
    if (rule.breakStartTime && rule.breakEndTime) {
      const [bsh, bsm] = rule.breakStartTime.split(':').map(Number);
      const [beh, bem] = rule.breakEndTime.split(':').map(Number);
      breakStartMinutes = bsh * 60 + bsm;
      breakEndMinutes = beh * 60 + bem;
    }

    const isToday = isDateToday(dateStr);

    while (currentMinutes + duration <= endMinutes) {
      const slotEndMinutes = currentMinutes + duration;
      const isInBreak =
        breakStartMinutes !== -1 &&
        breakEndMinutes !== -1 &&
        currentMinutes >= breakStartMinutes &&
        currentMinutes < breakEndMinutes;

      if (!isInBreak) {
        const slotStartH = Math.floor(currentMinutes / 60);
        const slotStartM = currentMinutes % 60;
        const slotEndH = Math.floor(slotEndMinutes / 60);
        const slotEndM = slotEndMinutes % 60;

        const start24 = String(slotStartH).padStart(2, '0') + ':' + String(slotStartM).padStart(2, '0');
        const end24 = String(slotEndH).padStart(2, '0') + ':' + String(slotEndM).padStart(2, '0');

        const period = slotStartH >= 12 ? 'PM' : 'AM';
        const displayH = slotStartH % 12 === 0 ? 12 : slotStartH % 12;
        const displayLabel = String(displayH).padStart(2, '0') + ':' + String(slotStartM).padStart(2, '0') + ' ' + period;

        // Double-booking check
        const isBooked = bookedSlots.some(
          a => a.timeSlot === displayLabel || a.startTime === start24
        );

        // Past-slot check for today in IST
        const isPast = isToday && isTimeSlotInPastToday(start24);

        const isAvailable = !isBooked && !isPast;
        let bookedReason: string | undefined;
        if (isBooked) {
          bookedReason = 'Slot already reserved';
        } else if (isPast) {
          bookedReason = 'Time slot has passed';
        }

        slots.push({
          slot: displayLabel,
          startTime: start24,
          endTime: end24,
          isAvailable,
          bookedReason
        });
      }

      currentMinutes += duration;
    }

    return slots;
  }
};
