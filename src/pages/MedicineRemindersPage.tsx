import React, { useState } from 'react';
import { useMedical } from '../context/MedicalContext';
import { ReminderCard } from '../components/cards/ReminderCard';
import { Modal } from '../components/common/Modal';
import { Clock, Plus, CheckCircle2 } from 'lucide-react';

export const MedicineRemindersPage: React.FC = () => {
  const { reminders, toggleReminderStatus, addReminder, deleteReminder } = useMedical();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('1 Tablet');
  const [timeOfDay, setTimeOfDay] = useState('09:00 AM');
  const [mealTiming, setMealTiming] = useState<'Before Food' | 'After Food' | 'Anytime'>('After Food');

  const takenCount = reminders.filter(r => r.status === 'taken').length;
  const adherence = reminders.length > 0 ? Math.round((takenCount / reminders.length) * 100) : 100;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName) return;

    addReminder({
      medicineName,
      dosage,
      frequency: 'Daily',
      timeOfDay,
      mealTiming,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'upcoming'
    });

    setIsAddOpen(false);
    setMedicineName('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-primary-600" />
            Medicine Reminders & Pill Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track daily dosages, mark medications taken, and maintain adherence
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Custom Pill Reminder
        </button>
      </div>

      {/* Adherence Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-tealAccent-600 to-primary-700 text-white shadow-md flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-teal-100">Today's Medication Adherence</div>
          <div className="text-3xl font-extrabold mt-1">{adherence}% Complete</div>
          <div className="text-xs text-teal-100 mt-0.5">{takenCount} of {reminders.length} doses logged</div>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Reminders List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reminders.map(rem => (
          <ReminderCard
            key={rem.id}
            reminder={rem}
            onStatusChange={toggleReminderStatus}
            onDelete={deleteReminder}
          />
        ))}
      </div>

      {/* Add Reminder Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Medicine Reminder">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              value={medicineName}
              onChange={e => setMedicineName(e.target.value)}
              placeholder="e.g. Paracetamol 650, Vitamin C"
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dosage
              </label>
              <input
                type="text"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                placeholder="e.g. 1 Tablet, 5ml"
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reminder Time
              </label>
              <input
                type="text"
                value={timeOfDay}
                onChange={e => setTimeOfDay(e.target.value)}
                placeholder="e.g. 09:00 AM, 08:30 PM"
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Food Timing
            </label>
            <select
              value={mealTiming}
              onChange={e => setMealTiming(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
            >
              <option value="After Food">After Food</option>
              <option value="Before Food">Before Food</option>
              <option value="Anytime">Anytime</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
