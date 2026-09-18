import { Prescription } from '../types';

export const mockPrescriptions: Prescription[] = [
  {
    id: 'rx-2026-001',
    prescriptionCode: 'MCE-RX-2026-0491',
    appointmentId: 'apt-103',
    patientId: 'usr-student-1',
    patientName: 'Rahul Sharma',
    patientUSN: '4MC21CS089',
    doctorId: 'doc-4',
    doctorName: 'Dr. Rajesh Gowda',
    doctorSpecialization: 'Orthopedics & Sports Medicine',
    doctorLicense: 'KMC/2010/55412',
    diagnosis: 'Acute Right Ankle Inversion Sprain (Grade 1)',
    medications: [
      {
        id: 'med-1',
        medicineName: 'Aceclofenac + Paracetamol (Zerodol-P 100mg/325mg)',
        dosage: '1 Tablet',
        frequency: '1-0-1 (Twice Daily)',
        timing: 'after_food',
        durationDays: 5,
        instructions: 'Take strictly after food. Stop if gastrointestinal irritation occurs.'
      },
      {
        id: 'med-2',
        medicineName: 'Trypsin Chymotrypsin (Chymoral Forte)',
        dosage: '1 Tablet',
        frequency: '1-0-1 (Twice Daily)',
        timing: 'before_food',
        durationDays: 5,
        instructions: 'Take 30 minutes before food with water to reduce swelling.'
      },
      {
        id: 'med-3',
        medicineName: 'Volini Pain Relief Gel',
        dosage: 'Topical Application',
        frequency: '1-1-1 (Thrice Daily)',
        timing: 'as_needed',
        durationDays: 7,
        instructions: 'Gently apply over outer ankle area without vigorous massage.'
      }
    ],
    advice: 'R.I.C.E protocol: Rest ankle for 3 days, apply cold compress for 15 mins 3 times daily, elevate ankle with a pillow while resting. Avoid sports for 10 days.',
    prescribedDate: '2026-09-10',
    followUpDate: '2026-09-18'
  },
  {
    id: 'rx-2026-002',
    prescriptionCode: 'MCE-RX-2026-0219',
    patientId: 'usr-student-1',
    patientName: 'Rahul Sharma',
    patientUSN: '4MC21CS089',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Rao',
    doctorSpecialization: 'General Medicine & Campus Physician',
    doctorLicense: 'KMC/2012/67843',
    diagnosis: 'Acute Viral Rhinitis & Seasonal Pharyngitis',
    medications: [
      {
        id: 'med-4',
        medicineName: 'Paracetamol (Dolo 650mg)',
        dosage: '1 Tablet',
        frequency: '1-0-1 (If fever > 100°F)',
        timing: 'after_food',
        durationDays: 3,
        instructions: 'Maintain minimum 6 hours gap between doses.'
      },
      {
        id: 'med-5',
        medicineName: 'Levocetirizine + Montelukast (Monticope)',
        dosage: '1 Tablet',
        frequency: '0-0-1 (Night only)',
        timing: 'after_food',
        durationDays: 5,
        instructions: 'May cause mild drowsiness; take before bedtime.'
      },
      {
        id: 'med-6',
        medicineName: 'Vitamin C & Zinc (Limcee Chewable)',
        dosage: '1 Tablet',
        frequency: '1-0-0 (Morning)',
        timing: 'after_food',
        durationDays: 10,
        instructions: 'Chew thoroughly after breakfast for immune support.'
      }
    ],
    advice: 'Warm water saline gargles 3 times a day. Steam inhalation twice daily. Hydrate with 2.5-3 liters of warm water daily.',
    prescribedDate: '2026-08-25'
  }
];
