import React, { useState } from 'react';
import { useMedical } from '../context/MedicalContext';
import { PrescriptionCard } from '../components/cards/PrescriptionCard';
import { Pill, Plus, Search, Printer, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PrescriptionModal } from '../features/prescriptions/PrescriptionModal';
import { Modal } from '../components/common/Modal';
import { Prescription } from '../types';

export const PrescriptionsPage: React.FC = () => {
  const { prescriptions, createRemindersFromPrescription } = useMedical();
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [printableRx, setPrintableRx] = useState<Prescription | null>(null);

  const isDoctor = role === 'doctor';
  const filtered = prescriptions.filter(p => {
    if (searchTerm) {
      return (
        p.prescriptionCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-primary-600" />
            Digital Prescriptions & Dosage Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access certified doctor e-prescriptions, convert to pill reminders, and print medical passes
          </p>
        </div>

        {isDoctor && (
          <button
            onClick={() => setIsRxModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Issue New Prescription
          </button>
        )}
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search Rx code, diagnosis..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
        />
      </div>

      <div className="space-y-4">
        {filtered.map(rx => (
          <PrescriptionCard
            key={rx.id}
            prescription={rx}
            onPrint={p => setPrintableRx(p)}
            onAddToReminders={p => {
              createRemindersFromPrescription(p);
              alert('Medications from this prescription have been added to your daily Medicine Reminders!');
            }}
          />
        ))}
      </div>

      {isDoctor && (
        <PrescriptionModal
          isOpen={isRxModalOpen}
          onClose={() => setIsRxModalOpen(false)}
          patientName="Rahul Sharma (4MC21CS089)"
          patientId="usr-student-1"
        />
      )}

      {/* Printable Prescription Document Modal */}
      {printableRx && (
        <Modal isOpen={!!printableRx} onClose={() => setPrintableRx(null)} title="Printable Digital Prescription" maxWidth="2xl">
          <div className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 space-y-6 text-xs font-sans print:p-0">
            {/* College Header */}
            <div className="border-b-2 border-primary-600 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black text-primary-900 uppercase tracking-tight">Malnad College of Engineering</h2>
                <h3 className="text-xs font-bold text-slate-700">MCE Campus Health & Telemedicine Centre</h3>
                <p className="text-[11px] text-slate-500">P.B. No. 50, Salagame Road, Hassan, Karnataka - 573202</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-primary-100 text-primary-800 font-mono font-bold text-xs">
                  {printableRx.prescriptionCode}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Date: {printableRx.prescribedDate}</p>
              </div>
            </div>

            {/* Doctor & Patient Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Prescribing Physician:</span>
                <strong>{printableRx.doctorName}</strong>
                <div className="text-slate-600 text-[11px]">{printableRx.doctorSpecialization}</div>
                <div className="text-slate-500 text-[10px] font-mono">Reg No: {printableRx.doctorLicense}</div>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient Details:</span>
                <strong>{printableRx.patientName}</strong>
                <div className="text-slate-600 text-[11px]">USN/ID: {printableRx.patientUSN || '4MC21CS089'}</div>
                <div className="text-slate-500 text-[10px]">Diagnosis: <strong>{printableRx.diagnosis}</strong></div>
              </div>
            </div>

            {/* Medications Table */}
            <div>
              <h4 className="font-bold uppercase text-[11px] text-slate-700 mb-2">Rx Medications</h4>
              <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-xs">
                <thead className="bg-slate-100 text-slate-700 text-left font-bold">
                  <tr>
                    <th className="p-2 border-b">#</th>
                    <th className="p-2 border-b">Medicine Name</th>
                    <th className="p-2 border-b">Dosage</th>
                    <th className="p-2 border-b">Frequency</th>
                    <th className="p-2 border-b">Duration</th>
                    <th className="p-2 border-b">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {printableRx.medications.map((m, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-2 font-bold">{idx + 1}</td>
                      <td className="p-2 font-bold text-primary-900">{m.medicineName}</td>
                      <td className="p-2">{m.dosage}</td>
                      <td className="p-2">{m.frequency}</td>
                      <td className="p-2">{m.durationDays} Days</td>
                      <td className="p-2 text-slate-600">{m.instructions || m.timing.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Advice */}
            {printableRx.advice && (
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-xs text-blue-900">
                <strong>Physician Clinical Advice: </strong> {printableRx.advice}
              </div>
            )}

            {/* Disclaimer & Signature */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
              <div className="max-w-xs text-[10px] text-slate-400">
                Digitally generated via CampusCare MCE Hassan Telemedicine Portal. Verified electronic prescription record.
              </div>
              <div className="text-center">
                <div className="h-8 flex items-end justify-center font-serif italic text-sm text-primary-900 font-bold">
                  {printableRx.doctorName}
                </div>
                <div className="text-[10px] border-t border-slate-400 pt-0.5 text-slate-600 font-semibold">
                  Authorized Medical Officer
                </div>
              </div>
            </div>

            {/* Print action buttons */}
            <div className="pt-2 flex justify-end gap-2 print:hidden">
              <button
                onClick={() => setPrintableRx(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
