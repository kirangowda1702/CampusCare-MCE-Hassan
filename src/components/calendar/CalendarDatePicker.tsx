import React, { useState, useEffect, useId } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import {
  getTodayIST,
  isDateInPast,
  isDateToday,
  formatDateFull,
  formatDateShort,
  generateMonthGrid,
  MONTH_NAMES,
  DAY_NAMES_SHORT,
  getDayOfWeek
} from '../../utils/dateUtils';

export interface CalendarDatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  doctorName?: string;
  doctorAvailableDays?: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  className?: string;
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  selectedDate,
  onSelectDate,
  doctorName,
  doctorAvailableDays,
  className = ''
}) => {
  const monthSelectId = useId();
  const yearSelectId = useId();
  const todayIST = getTodayIST();
  const [todayYear, todayMonth] = todayIST.split('-').map(Number);

  // Parse initial viewing month and year from selectedDate or today
  const [initialY, initialM] = selectedDate
    ? selectedDate.split('-').map(Number)
    : [todayYear, todayMonth];

  const [currentYear, setCurrentYear] = useState<number>(initialY || todayYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialM || todayMonth); // 1 - 12

  // Sync viewing month/year if selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonth(m);
      }
    }
  }, [selectedDate]);

  // Year options: from today's year up to 5 years in the future (e.g. 2026 to 2031)
  const minYear = todayYear;
  const maxYear = todayYear + 6;
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Month navigation
  const canGoPreviousMonth =
    currentYear > todayYear || (currentYear === todayYear && currentMonth > todayMonth);

  const handlePrevMonth = () => {
    if (!canGoPreviousMonth) return;
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentYear === maxYear && currentMonth === 12) return;
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    onSelectDate(todayIST);
  };

  const daysGrid = generateMonthGrid(currentYear, currentMonth);

  // Helper to check doctor duty on given day of week
  const isDoctorOnDuty = (dayOfWeekName: string): boolean => {
    if (!doctorAvailableDays || doctorAvailableDays.length === 0) return true;
    const lowerDays = doctorAvailableDays.map(d => d.toLowerCase());
    if (lowerDays.includes('daily')) return true;
    return lowerDays.includes(dayOfWeekName.toLowerCase());
  };

  const selectedDayOfWeek = selectedDate ? getDayOfWeek(selectedDate) : '';
  const isSelectedDateDoctorOff =
    selectedDayOfWeek && !isDoctorOnDuty(selectedDayOfWeek);

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4 ${className}`}
      role="region"
      aria-label="Appointment Date Picker Calendar"
    >
      {/* 1. Header: Month/Year navigation and Dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="relative">
            <label htmlFor={monthSelectId} className="sr-only">Select Month</label>
            <select
              id={monthSelectId}
              value={currentMonth}
              onChange={e => setCurrentMonth(parseInt(e.target.value, 10))}
              aria-label="Select Month"
              className="py-1.5 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => {
                const monthNum = idx + 1;
                const isPastMonth = currentYear === todayYear && monthNum < todayMonth;
                return (
                  <option key={name} value={monthNum} disabled={isPastMonth}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Year Selector */}
          <div className="relative">
            <label htmlFor={yearSelectId} className="sr-only">Select Year</label>
            <select
              id={yearSelectId}
              value={currentYear}
              onChange={e => {
                const newY = parseInt(e.target.value, 10);
                setCurrentYear(newY);
                if (newY === todayYear && currentMonth < todayMonth) {
                  setCurrentMonth(todayMonth);
                }
              }}
              aria-label="Select Year"
              className="py-1.5 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prev / Today / Next Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors"
            title="Jump to Today in India Standard Time"
          >
            <RotateCcw className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            <span>Today</span>
          </button>

          <button
            type="button"
            disabled={!canGoPreviousMonth}
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Days of Week Header */}
      <div className="grid grid-cols-7 text-center">
        {DAY_NAMES_SHORT.map((day, i) => (
          <div
            key={day}
            className={`py-1 text-[11px] font-bold tracking-wider uppercase ${
              i === 0
                ? 'text-rose-500 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 3. Calendar Grid (7 columns) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label="Month Dates">
        {daysGrid.map(cell => {
          const isSelected = selectedDate === cell.dateStr;
          const isPast = cell.isPast;
          const onDuty = isDoctorOnDuty(cell.dayOfWeek);

          let buttonClasses =
            'h-10 sm:h-11 w-full rounded-xl flex flex-col items-center justify-center text-xs font-semibold relative transition-all duration-150 ';

          if (isPast) {
            buttonClasses +=
              'opacity-25 cursor-not-allowed text-slate-400 bg-slate-50 dark:bg-slate-800/20 line-through';
          } else if (isSelected) {
            buttonClasses +=
              'bg-primary-600 text-white shadow-md ring-2 ring-primary-500 font-extrabold scale-[1.02] z-10';
          } else if (cell.isToday) {
            buttonClasses +=
              'border border-primary-500 bg-primary-50/70 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold hover:bg-primary-100 dark:hover:bg-primary-900/60';
          } else if (!cell.isCurrentMonth) {
            buttonClasses +=
              'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60';
          } else {
            buttonClasses +=
              'text-slate-700 dark:text-slate-200 hover:bg-primary-50/80 dark:hover:bg-slate-800 hover:border hover:border-primary-300 dark:hover:border-primary-700';
          }

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(cell.dateStr)}
              aria-label={`${cell.dayOfWeek}, ${cell.dateStr}${isPast ? ' (Past date - unavailable)' : ''}${isSelected ? ' (Selected)' : ''}`}
              aria-selected={isSelected}
              aria-disabled={isPast}
              className={buttonClasses}
            >
              <span>{cell.dayNumber}</span>

              {/* Indicator badges */}
              <div className="flex items-center gap-0.5 mt-0.5">
                {cell.isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400" title="Today" />
                )}
                {!isPast && !onDuty && cell.isCurrentMonth && !isSelected && (
                  <span className="text-[8px] font-normal text-amber-600 dark:text-amber-400 leading-none">
                    Off
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. Selected Date Confirmation & Doctor Duty Banner */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div>
              <span className="text-slate-500 dark:text-slate-400">Selected Appointment Date: </span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatDateFull(selectedDate)}
              </span>
              <span className="text-[10px] text-slate-400 ml-1 font-mono">(IST)</span>
            </div>
          </div>

          {selectedDate && (
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Valid Date</span>
            </div>
          )}
        </div>

        {/* Doctor Off-Duty Notice if a day like Sunday is selected */}
        {isSelectedDateDoctorOff && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Doctor Not Available: </span>
              {doctorName || 'The selected doctor'} does not hold regular consultations on{' '}
              <span className="font-semibold underline">{selectedDayOfWeek}</span>. Available days are{' '}
              <span className="font-semibold">{doctorAvailableDays?.join(', ') || 'Monday–Saturday'}</span>. Please pick an active duty day to book available slots.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
