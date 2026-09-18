import { MedicalRecord } from '../types';

export const mockMedicalRecords: MedicalRecord[] = [
  {
    id: 'rec-001',
    patientId: 'usr-student-1',
    title: 'Complete Blood Count (CBC) & Dengue NS1 Antigen Test',
    recordType: 'lab_report',
    recordDate: '2026-08-26',
    doctorOrLabName: 'MCE Campus Diagnostic Laboratory, Hassan',
    fileUrl: '#',
    fileSize: '1.4 MB',
    fileType: 'pdf',
    notes: 'Hemoglobin: 14.8 g/dL (Normal), Platelet Count: 280,000 /mcL (Normal), Dengue NS1: Negative.',
    tags: ['Lab Report', 'CBC', 'Blood Test', 'Dengue Negative']
  },
  {
    id: 'rec-002',
    patientId: 'usr-student-1',
    title: 'Orthopedic Digital X-Ray: Right Ankle AP & Lateral View',
    recordType: 'lab_report',
    recordDate: '2026-09-10',
    doctorOrLabName: 'HIMS Hassan Radiodiagnostics Wing',
    fileUrl: '#',
    fileSize: '3.8 MB',
    fileType: 'pdf',
    notes: 'No bony fracture or dislocation visualized. Soft tissue swelling over lateral malleolus noted.',
    tags: ['X-Ray', 'Orthopedics', 'Ankle Sprain', 'HIMS']
  },
  {
    id: 'rec-003',
    patientId: 'usr-student-1',
    title: 'Annual College Physical Fitness & Health Certificate',
    recordType: 'consultation_notes',
    recordDate: '2025-10-15',
    doctorOrLabName: 'Dr. Priya Rao (MCE Health Center)',
    fileUrl: '#',
    fileSize: '820 KB',
    fileType: 'pdf',
    notes: 'Student physically fit for campus sports, academic labs, and hostel accommodation.',
    tags: ['Fitness Certificate', 'MCE', 'Cardiovascular Clearance']
  },
  {
    id: 'rec-004',
    patientId: 'usr-student-1',
    title: 'COVID-19 Booster & Tetanus Toxoid (TT) Vaccination Certificate',
    recordType: 'vaccination',
    recordDate: '2025-06-12',
    doctorOrLabName: 'District Health Society Hassan',
    fileUrl: '#',
    fileSize: '540 KB',
    fileType: 'pdf',
    notes: 'TT Booster administered following playground abrasion. Covishield Precautionary Dose verified.',
    tags: ['Vaccination', 'Tetanus', 'COVID-19', 'CoWIN']
  }
];
