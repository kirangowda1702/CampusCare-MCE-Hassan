import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { Medication, Prescription } from '../../types';
import { useMedical } from '../../context/MedicalContext';
import { useAuth } from '../../context/AuthContext';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  appointmentId?: string;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  patientName,
  patientId,
  appointmentId
}) => {
  const { addPrescription, createRemindersFromPrescription } = useMedical();
  const { user } = useAuth();

  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('Drink adequate fluids. Avoid cold beverages. Rest well.');
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: 'med-' + Date.now(),
      medicineName: 'Paracetamol (Dolo 650mg)',
      dosage: '1 Tablet',
      frequency: '1-0-1 (Twice Daily)',
      timing: 'after_food',
      durationDays: 3,
      instructions: 'Take strictly after meals.'
    }
  ]);

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        id: 'med-' + Date.now(),
        medicineName: '',
        dosage: '1 Tablet',
        frequency: '1-0-1 (Twice Daily)',
        timing: 'after_food',
        durationDays: 5,
        instructions: ''
      }
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleUpdateMed = (index: number, field: keyof Medication, val: any) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: val };
    setMedications(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      alert('Please enter a clinical diagnosis');
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newRx: Prescription = {
      id: 'rx-' + Date.now(),
      prescriptionCode: `MCE-RX-2026-${randomNum}`,
      appointmentId,
      patientId,
      patientName,
      patientUSN: '4MC21CS089',
      doctorId: user?.id || 'doc-1',
      doctorName: user?.fullName || 'Dr. Priya Rao',
      doctorSpecialization: user?.specialization || 'General Medicine & Campus Physician',
      doctorLicense: user?.licenseNumber || 'KMC/2012/67843',
      diagnosis,
      medications: medications.filter(m => m.medicineName.trim() !== ''),
      advice,
      prescribedDate: new Date().toISOString().split('T')[0]
    };

    addPrescription(newRx);
    createRemindersFromPrescription(newRx);
    alert('Digital Prescription successfully generated and synced to patient reminders!');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Generate Prescription for ${patientName}`} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Clinical Diagnosis *
          </label>
          <input
            type="text"
            required
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            placeholder="e.g., Acute Viral Rharyngitis, Ankle Sprain Grade 1, Tension Headache"
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Medications & Dosages
            </h5>
            <button
              type="button"
              onClick={handleAddMedication}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add Drug
            </button>
          </div>

          <div className="space-y-3">
            {medications.map((med, idx) => (
              <div
                key={med.id || idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">#{idx + 1} Medication</span>
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Medicine name (e.g., Monticope, Zerodol-P)"
                    value={med.medicineName}
                    onChange={e => handleUpdateMed(idx, 'medicineName', e.target.value)}
                    className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g., 1 Tablet, 500mg, 5ml)"
                    value={med.dosage}
                    onChange={e => handleUpdateMed(idx, 'dosage', e.target.value)}
                    className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                  <select
                    value={med.frequency}
                    onChange={e => handleUpdateMed(idx, 'frequency', e.target.value)}
                    className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                  >
                    <option value="1-0-1 (Twice Daily)">1-0-1 (Twice Daily)</option>
                    <option value="1-1-1 (Thrice Daily)">1-1-1 (Thrice Daily)</option>
                    <option value="1-0-0 (Morning only)">1-0-0 (Morning only)</option>
                    <option value="0-0-1 (Night only)">0-0-1 (Night only)</option>
                    <option value="SOS (As needed for pain)">SOS (As needed for pain)</option>
                  </select>
                  <select
                    value={med.timing}
                    onChange={e => handleUpdateMed(idx, 'timing', e.target.value as any)}
                    className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                  >
                    <option value="after_food">After Food</option>
                    <option value="before_food">Before Food (Empty Stomach)</option>
                    <option value="with_food">With Food</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            General Lifestyle / Dietary Advice
          </label>
          <textarea
            rows={2}
            value={advice}
            onChange={e => setAdvice(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow transition-all flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" /> Issue Prescription
          </button>
        </div>
      </form>
    </Modal>
  );
};
