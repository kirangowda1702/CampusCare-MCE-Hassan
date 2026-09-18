import React, { createContext, useContext, useState, useEffect } from 'react';
import { MedicalRecord, MedicineReminder, Prescription, ReminderStatus } from '../types';
import { mockPrescriptions } from '../data/prescriptions';
import { mockMedicalRecords } from '../data/medicalRecords';
import { prescriptionService } from '../services/prescriptionService';
import { medicalService } from '../services/medicalService';
import { reminderService } from '../services/reminderService';

const initialReminders: MedicineReminder[] = [
  {
    id: 'rem-1',
    prescriptionId: 'rx-2026-001',
    medicineName: 'Aceclofenac + Paracetamol (Zerodol-P)',
    dosage: '1 Tablet',
    frequency: 'Twice Daily',
    timeOfDay: '09:00 AM',
    mealTiming: 'After Food',
    startDate: '2026-09-10',
    endDate: '2026-09-19',
    status: 'taken',
    takenAt: '09:15 AM'
  },
  {
    id: 'rem-2',
    prescriptionId: 'rx-2026-001',
    medicineName: 'Trypsin Chymotrypsin (Chymoral Forte)',
    dosage: '1 Tablet',
    frequency: 'Twice Daily',
    timeOfDay: '01:30 PM',
    mealTiming: 'Before Food',
    startDate: '2026-09-10',
    endDate: '2026-09-19',
    status: 'upcoming'
  },
  {
    id: 'rem-3',
    prescriptionId: 'rx-2026-001',
    medicineName: 'Aceclofenac + Paracetamol (Zerodol-P)',
    dosage: '1 Tablet',
    frequency: 'Twice Daily',
    timeOfDay: '08:30 PM',
    mealTiming: 'After Food',
    startDate: '2026-09-10',
    endDate: '2026-09-19',
    status: 'upcoming'
  }
];

interface MedicalContextType {
  prescriptions: Prescription[];
  records: MedicalRecord[];
  reminders: MedicineReminder[];
  addPrescription: (prescription: Prescription) => void;
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => void;
  addReminder: (reminder: Omit<MedicineReminder, 'id'>) => void;
  deleteReminder: (id: string) => void;
  toggleReminderStatus: (id: string, newStatus: ReminderStatus) => void;
  createRemindersFromPrescription: (prescription: Prescription) => void;
  getPrescriptionsForPatient: (patientId: string) => Prescription[];
  getRecordsForPatient: (patientId: string) => MedicalRecord[];
}

const MedicalContext = createContext<MedicalContextType | undefined>(undefined);

export const MedicalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const saved = localStorage.getItem('campuscare_prescriptions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return mockPrescriptions; }
    }
    return mockPrescriptions;
  });

  const [records, setRecords] = useState<MedicalRecord[]>(() => {
    const saved = localStorage.getItem('campuscare_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return mockMedicalRecords; }
    }
    return mockMedicalRecords;
  });

  const [reminders, setReminders] = useState<MedicineReminder[]>(() => {
    const saved = localStorage.getItem('campuscare_reminders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return initialReminders; }
    }
    return initialReminders;
  });

  useEffect(() => {
    prescriptionService.getPrescriptions().then((data: Prescription[]) => {
      if (data && data.length > 0) setPrescriptions(data);
    });
    medicalService.getRecords().then((data: MedicalRecord[]) => {
      if (data && data.length > 0) setRecords(data);
    });
    reminderService.getReminders().then((data: MedicineReminder[]) => {
      if (data && data.length > 0) setReminders(data);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('campuscare_prescriptions', JSON.stringify(prescriptions));
  }, [prescriptions]);

  useEffect(() => {
    localStorage.setItem('campuscare_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('campuscare_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const addPrescription = (newRx: Prescription) => {
    setPrescriptions(prev => [newRx, ...prev]);
    prescriptionService.createPrescription(newRx).catch(() => {});
  };

  const addMedicalRecord = (record: Omit<MedicalRecord, 'id'>) => {
    const newRecord: MedicalRecord = {
      id: 'rec-' + Date.now(),
      ...record
    };
    setRecords(prev => [newRecord, ...prev]);
    medicalService.addRecord(record).catch(() => {});
  };

  const addReminder = (rem: Omit<MedicineReminder, 'id'>) => {
    const newRem: MedicineReminder = {
      id: 'rem-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      ...rem
    };
    setReminders(prev => [newRem, ...prev]);
    reminderService.addReminder(rem).catch(() => {});
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    reminderService.deleteReminder(id).catch(() => {});
  };

  const toggleReminderStatus = (id: string, newStatus: ReminderStatus) => {
    setReminders(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: newStatus,
              takenAt: newStatus === 'taken' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
            }
          : r
      )
    );
    reminderService.updateReminderStatus(id, newStatus).catch(() => {});
  };

  const createRemindersFromPrescription = (prescription: Prescription) => {
    prescription.medications.forEach(med => {
      const isTwice = med.frequency.includes('Twice') || med.frequency.includes('1-0-1');
      const isThrice = med.frequency.includes('Thrice') || med.frequency.includes('1-1-1');

      const times = isThrice
        ? ['08:30 AM', '01:30 PM', '08:30 PM']
        : isTwice
        ? ['09:00 AM', '08:30 PM']
        : ['09:00 AM'];

      times.forEach(t => {
        addReminder({
          prescriptionId: prescription.id,
          medicineName: med.medicineName,
          dosage: med.dosage,
          frequency: med.frequency,
          timeOfDay: t,
          mealTiming: med.timing === 'before_food' ? 'Before Food' : 'After Food',
          startDate: prescription.prescribedDate,
          endDate: new Date(Date.now() + med.durationDays * 86400000).toISOString().split('T')[0],
          status: 'upcoming'
        });
      });
    });
  };

  const getPrescriptionsForPatient = (patientId: string) => {
    return prescriptions.filter(p => p.patientId === patientId || patientId === 'usr-student-1');
  };

  const getRecordsForPatient = (patientId: string) => {
    return records.filter(r => r.patientId === patientId || patientId === 'usr-student-1');
  };

  return (
    <MedicalContext.Provider
      value={{
        prescriptions,
        records,
        reminders,
        addPrescription,
        addMedicalRecord,
        addReminder,
        deleteReminder,
        toggleReminderStatus,
        createRemindersFromPrescription,
        getPrescriptionsForPatient,
        getRecordsForPatient
      }}
    >
      {children}
    </MedicalContext.Provider>
  );
};

export const useMedical = () => {
  const context = useContext(MedicalContext);
  if (!context) throw new Error('useMedical must be used within MedicalProvider');
  return context;
};
