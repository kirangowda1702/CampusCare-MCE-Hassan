import React from 'react';
import { Pill, Check, Clock, X, Trash2 } from 'lucide-react';
import { MedicineReminder } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface ReminderCardProps {
  reminder: MedicineReminder;
  onStatusChange: (id: string, newStatus: 'taken' | 'missed' | 'upcoming') => void;
  onDelete?: (id: string) => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({ reminder, onStatusChange, onDelete }) => {
  const isTaken = reminder.status === 'taken';
  const isMissed = reminder.status === 'missed';

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        isTaken
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60 opacity-90'
          : isMissed
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isTaken
                ? 'bg-emerald-500 text-white'
                : 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400'
            }`}
          >
            {isTaken ? <Check className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
          </div>

          <div>
            <h4
              className={`font-bold text-sm ${
                isTaken ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {reminder.medicineName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {reminder.dosage} • {reminder.mealTiming}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary-500" />
            {reminder.timeOfDay}
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(reminder.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors ml-1"
              title="Delete reminder"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <StatusBadge status={reminder.status} size="sm" />

        <div className="flex items-center gap-2">
          {reminder.status !== 'taken' && (
            <button
              onClick={() => onStatusChange(reminder.id, 'taken')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow"
            >
              <Check className="w-3.5 h-3.5" /> Mark Taken
            </button>
          )}

          {reminder.status === 'taken' && (
            <button
              onClick={() => onStatusChange(reminder.id, 'upcoming')}
              className="text-slate-500 dark:text-slate-400 hover:underline text-[11px]"
            >
              Undo
            </button>
          )}

          {reminder.status === 'upcoming' && (
            <button
              onClick={() => onStatusChange(reminder.id, 'missed')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
              title="Mark as missed"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
