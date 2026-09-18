import React from 'react';
import { Pill, Printer, BellPlus, Calendar, User, FileCheck2 } from 'lucide-react';
import { Prescription } from '../../types';

interface PrescriptionCardProps {
  prescription: Prescription;
  onPrint?: (rx: Prescription) => void;
  onAddToReminders?: (rx: Prescription) => void;
}

export const PrescriptionCard: React.FC<PrescriptionCardProps> = ({
  prescription,
  onPrint,
  onAddToReminders
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-primary-600 text-white font-mono text-xs font-bold">
              Rx {prescription.prescriptionCode}
            </span>
            <span className="text-xs text-slate-400">{prescription.prescribedDate}</span>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base mt-2">
            Diagnosis: {prescription.diagnosis}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Prescribed by {prescription.doctorName} ({prescription.doctorSpecialization})
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {onAddToReminders && (
            <button
              onClick={() => onAddToReminders(prescription)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-semibold transition-all"
              title="Sync to Medicine Reminders"
            >
              <BellPlus className="w-3.5 h-3.5" /> Add to Reminders
            </button>
          )}
          <button
            onClick={() => (onPrint ? onPrint(prescription) : window.print())}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
            title="Print Prescription"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Medications List */}
      <div className="space-y-3 mb-4">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Medications Prescribed ({prescription.medications.length})
        </h5>
        <div className="space-y-2">
          {prescription.medications.map((med, idx) => (
            <div
              key={med.id || idx}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <Pill className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{med.medicineName}</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {med.dosage} • {med.frequency} • {med.durationDays} Days ({med.timing.replace('_', ' ')})
                  </div>
                </div>
              </div>
              {med.instructions && (
                <span className="text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md">
                  {med.instructions}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Advice */}
      {prescription.advice && (
        <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs">
          <span className="font-bold text-blue-900 dark:text-blue-300">Doctor Advice: </span>
          <span className="text-blue-800 dark:text-blue-200">{prescription.advice}</span>
        </div>
      )}
    </div>
  );
};
