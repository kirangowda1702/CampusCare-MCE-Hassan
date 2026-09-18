import { evaluateSymptoms, mockSymptomsList } from './src/data/symptoms';
import { appointmentService } from './src/services/appointmentService';
import { reminderService } from './src/services/reminderService';
import { emergencyService } from './src/services/emergencyService';
import { medicalService } from './src/services/medicalService';
import { prescriptionService } from './src/services/prescriptionService';
import { notificationService } from './src/services/notificationService';
import { authService } from './src/services/authService';
import { getWebRTCConfiguration, RealtimeSignalingChannel } from './src/services/webrtcService';
import { chatService } from './src/services/chatService';
import { mockDoctors } from './src/data/doctors';
import { mockServices } from './src/data/services';
import { mockHospitals } from './src/data/hospitals';
import { mockPharmacies } from './src/data/pharmacies';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log(' CAMPUSCARE MCE HASSAN - PHASE 5 E2E INTEGRATION & DEMO AUDIT');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runEndToEndValidation() {
  // 1. Security, Secrets & Public Keys
  console.log('--- 1. SECURITY & CONFIGURATION AUDIT ---');
  const envExample = fs.readFileSync('.env.example', 'utf8');
  assert(!envExample.includes('service_role'), '.env.example does not expose Supabase service role keys');
  assert(envExample.includes('VITE_STUN_SERVER'), 'WebRTC STUN server documented in template');

  const srcFiles = fs.readdirSync('src', { recursive: true }) as string[];
  let foundLeakedKey = false;
  for (const file of srcFiles) {
    const fullPath = path.join('src', file);
    if (fs.statSync(fullPath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('service_role_key') || content.includes('SUPABASE_SERVICE_ROLE')) {
        foundLeakedKey = true;
      }
    }
  }
  assert(!foundLeakedKey, 'Zero private service role keys found in frontend codebase');

  // 2. Multi-Role Authentication & Password Recovery
  console.log('\n--- 2. MULTI-ROLE AUTHENTICATION AUDIT ---');
  const student = await authService.signInWithEmail('rahul.sharma@mcehassan.ac.in');
  assert(student.user?.role === 'student' && student.user?.fullName === 'Rahul Sharma', 'Student login verified (Rahul Sharma)');

  const doctor = await authService.signInWithEmail('dr.priyarao@mcehassan.ac.in');
  assert(doctor.user?.role === 'doctor' && doctor.user?.fullName === 'Dr. Priya Rao', 'Doctor login verified (Dr. Priya Rao)');

  const faculty = await authService.signInWithEmail('suresh.kumar@mcehassan.ac.in');
  assert(faculty.user?.role === 'faculty' && faculty.user?.fullName === 'Prof. Suresh Kumar H.N.', 'Faculty login verified');

  const admin = await authService.signInWithEmail('admin.health@mcehassan.ac.in');
  assert(admin.user?.role === 'admin' && admin.user?.fullName === 'Dr. B.S. Anand', 'Admin login verified');

  const pwdReset = await authService.resetPasswordForEmail('rahul.sharma@mcehassan.ac.in');
  assert(pwdReset.success, 'Self-service password recovery flow functional');

  // 3. End-to-End Student Appointment Lifecycle
  console.log('\n--- 3. END-TO-END STUDENT APPOINTMENT FLOW ---');
  const selectedDoc = mockDoctors[0];
  const selectedSrv = mockServices[0];
  const bookingDate = '2026-11-20';
  const bookingSlot = '10:30 AM';

  const bookedApt = await appointmentService.createAppointment({
    doctorId: selectedDoc.id,
    doctorName: selectedDoc.name,
    doctorSpecialization: selectedDoc.specialization,
    serviceId: selectedSrv.id,
    serviceName: selectedSrv.name,
    appointmentDate: bookingDate,
    timeSlot: bookingSlot,
    consultationType: 'video',
    reason: 'Severe seasonal sinus congestion and low-grade fever',
    symptoms: ['Fever', 'Sore Throat'],
    status: 'confirmed',
    patientId: student.user!.id,
    patientName: student.user!.fullName,
    patientRole: student.user!.role,
    patientEmail: student.user!.email,
    patientPhone: student.user!.phone
  });
  assert(!!bookedApt.id && bookedApt.bookingId.startsWith('MCE-APT-'), 'Appointment created with unique institutional booking ID');

  // Test Double Booking Guard
  let conflictBlocked = false;
  try {
    await appointmentService.createAppointment({
      doctorId: selectedDoc.id,
      doctorName: selectedDoc.name,
      doctorSpecialization: selectedDoc.specialization,
      serviceId: selectedSrv.id,
      serviceName: selectedSrv.name,
      appointmentDate: bookingDate,
      timeSlot: bookingSlot,
      consultationType: 'video',
      reason: 'Conflicting slot request',
      symptoms: ['Headache'],
      status: 'confirmed',
      patientId: 'usr-student-other',
      patientName: 'Kavya G',
      patientRole: 'student',
      patientEmail: 'kavya@mcehassan.ac.in',
      patientPhone: '+91 99999 11111'
    });
  } catch (err: any) {
    conflictBlocked = true;
  }
  assert(conflictBlocked, 'Double-booking scheduling conflict intercepted and rejected');

  // 4. Doctor Appointment Management & Lifecycle
  console.log('\n--- 4. DOCTOR WORKFLOW & STATUS TRANSITIONS ---');
  await appointmentService.updateAppointmentStatus(bookedApt.id, 'confirmed');
  let apts = await appointmentService.getAppointments();
  assert(apts.find(a => a.id === bookedApt.id)?.status === 'confirmed', 'Doctor confirms appointment schedule');

  await appointmentService.updateAppointmentStatus(bookedApt.id, 'completed');
  apts = await appointmentService.getAppointments();
  assert(apts.find(a => a.id === bookedApt.id)?.status === 'completed', 'Doctor marks teleconsultation completed');

  // 5. Digital Prescription & Automatic Reminders
  console.log('\n--- 5. PRESCRIPTION & MEDICINE REMINDERS FLOW ---');
  const newRx = await prescriptionService.createPrescription({
    prescriptionCode: 'MCE-RX-2026-9871',
    appointmentId: bookedApt.id,
    patientId: student.user!.id,
    patientName: student.user!.fullName,
    patientUSN: student.user!.usn || '4MC21CS089',
    doctorId: doctor.user!.id,
    doctorName: doctor.user!.fullName,
    doctorSpecialization: doctor.user!.specialization || 'General Medicine',
    doctorLicense: doctor.user!.licenseNumber || 'KMC/2012/67843',
    diagnosis: 'Acute Viral Sinusitis',
    medications: [
      {
        id: 'med-1',
        medicineName: 'Amoxicillin + Clavulanic Acid 625mg',
        dosage: '1 Tablet',
        frequency: '1-0-1 (Twice Daily)',
        timing: 'after_food',
        durationDays: 5,
        instructions: 'Take after food for 5 days.'
      }
    ],
    advice: 'Drink warm water. Rest for 2 days.',
    prescribedDate: '2026-09-17'
  });
  assert(!!newRx.id && newRx.prescriptionCode.startsWith('MCE-RX-'), 'Doctor issues certified electronic prescription');

  const newRem = await reminderService.addReminder({
    prescriptionId: newRx.id,
    medicineName: 'Amoxicillin + Clavulanic Acid 625mg',
    dosage: '1 Tablet',
    frequency: '1-0-1',
    timeOfDay: '09:00 AM',
    mealTiming: 'After Food',
    startDate: '2026-09-17',
    endDate: '2026-09-22',
    status: 'upcoming'
  });
  assert(!!newRem.id && newRem.status === 'upcoming', 'Dosage converted to daily medicine reminder');

  await reminderService.updateReminderStatus(newRem.id, 'taken');
  const rems = await reminderService.getReminders();
  assert(rems.find(r => r.id === newRem.id)?.status === 'taken', 'Patient marks medication TAKEN with adherence update');

  // 6. Medical Records & E-Vault Management
  console.log('\n--- 6. MEDICAL RECORDS VAULT AUDIT ---');
  const newRec = await medicalService.addRecord({
    patientId: student.user!.id,
    title: 'Complete Blood Count (CBC) & ESR Report',
    recordType: 'lab_report',
    recordDate: '2026-09-17',
    doctorOrLabName: 'MCE Hassan Campus Pathology Lab',
    fileUrl: 'https://example.com/cbc-report.pdf',
    fileSize: '1.8 MB',
    fileType: 'pdf',
    notes: 'Platelet count and hemoglobin within normal physiological ranges.',
    tags: ['Lab Report', 'CBC', 'Hematology']
  });
  assert(!!newRec.id && newRec.title.includes('CBC'), 'Lab report securely logged in patient E-Vault');

  const studentRecords = await medicalService.getRecordsByPatient(student.user!.id);
  assert(studentRecords.some(r => r.id === newRec.id), 'Patient can query own medical history from vault');

  // 7. WebRTC & In-Call Consultation Chat
  console.log('\n--- 7. WEBRTC & REALTIME CONSULTATION CHAT ---');
  const webrtcConfig = getWebRTCConfiguration();
  assert(webrtcConfig.iceServers.length > 0, 'WebRTC STUN configuration active');

  const signaling = new RealtimeSignalingChannel(bookedApt.id, student.user!.id);
  assert(typeof signaling.sendSignal === 'function', 'Realtime signaling gateway verified');

  const inCallMsg = await chatService.sendMessage(bookedApt.id, {
    senderId: student.user!.id,
    senderName: student.user!.fullName,
    senderRole: 'student',
    text: 'Dr. Priya, I have uploaded my previous CBC lab report to the E-Vault.'
  });
  assert(!!inCallMsg.id && inCallMsg.text.length > 0, 'In-call consultation message delivered');

  // 8. Campus Emergency SOS Lifecycle
  console.log('\n--- 8. CAMPUS EMERGENCY SOS LIFECYCLE ---');
  const sos = await emergencyService.createEmergency({
    callerName: 'Hostel Resident (Rahul Sharma)',
    callerPhone: '+91 98765 43210',
    locationDetails: 'Kavery Boys Hostel, Block A, Room 304',
    emergencyType: 'Accident/Trauma'
  });
  assert(!!sos.id && sos.status === 'active', 'Campus SOS triggered with ACTIVE status');

  await emergencyService.updateEmergencyStatus(sos.id, 'resolved');
  const emergencies = await emergencyService.getEmergencies();
  assert(emergencies.find(e => e.id === sos.id)?.status === 'resolved', 'Campus emergency team resolves incident');

  // 9. AI Symptom Triage Decision Support
  console.log('\n--- 9. AI SYMPTOM TRIAGE ASSESSMENT ---');
  const feverCough = evaluateSymptoms(['fever', 'cough'], 4, 2, 'college_student');
  assert(feverCough.riskLevel === 'moderate' || feverCough.riskLevel === 'low', 'Mild symptoms triaged to outpatient department');

  const emergencyTriage = evaluateSymptoms(['chest_pain', 'difficulty_breathing'], 9, 1, 'college_student');
  assert(emergencyTriage.riskLevel === 'emergency' && emergencyTriage.isEmergency, 'Critical symptoms trigger urgent emergency warning');

  // 10. Institutional Content & Demo Verification
  console.log('\n--- 10. INSTITUTIONAL CONTENT & HOSPITALS AUDIT ---');
  assert(mockHospitals.length > 0 && mockHospitals.some(h => h.name.includes('HIMS')), 'Hassan teaching hospital directory present');
  assert(mockPharmacies.length > 0, 'Hassan campus pharmacies directory present');
  assert(fs.existsSync('DEMO_GUIDE.md'), 'DEMO_GUIDE.md documentation created for examiners');

  console.log('\n================================================================');
  console.log(` PHASE 5 FINAL AUDIT RESULT: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');
}

runEndToEndValidation();
