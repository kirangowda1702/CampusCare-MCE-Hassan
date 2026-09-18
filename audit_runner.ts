import { evaluateSymptoms } from './src/data/symptoms';
import { appointmentService } from './src/services/appointmentService';
import { reminderService } from './src/services/reminderService';
import { emergencyService } from './src/services/emergencyService';
import { medicalService } from './src/services/medicalService';
import { prescriptionService } from './src/services/prescriptionService';
import { authService } from './src/services/authService';
import { getWebRTCConfiguration, RealtimeSignalingChannel } from './src/services/webrtcService';
import { chatService } from './src/services/chatService';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log(' CAMPUSCARE MCE HASSAN - PHASE 4 PRODUCTION INTEGRATION AUDIT');
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

async function runAudit() {
  // 1. Security & Environment Audit
  console.log('--- 1. SECURITY & KEY EXPOSURE AUDIT ---');
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  assert(!envExample.includes('service_role'), '.env.example does not expose Supabase service role keys');
  assert(!envFile.includes('service_role'), '.env does not expose Supabase service role keys');
  assert(envExample.includes('VITE_STUN_SERVER'), 'WebRTC STUN server configuration documented');

  // Scan all src files for accidental service_role key leaks
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
  assert(!foundLeakedKey, 'No service_role key found in any frontend source file');

  // 2. Auth Service Workflow & Password Recovery
  console.log('\n--- 2. AUTHENTICATION SERVICE AUDIT ---');
  const studentUser = await authService.signInWithEmail('rahul.sharma@mcehassan.ac.in');
  assert(!!studentUser.user && studentUser.user.role === 'student', 'Student authentication and role verified');

  const doctorUser = await authService.signInWithEmail('dr.priyarao@mcehassan.ac.in');
  assert(!!doctorUser.user && doctorUser.user.role === 'doctor', 'Doctor authentication and role verified');

  const facultyUser = await authService.signInWithEmail('suresh.kumar@mcehassan.ac.in');
  assert(!!facultyUser.user && facultyUser.user.role === 'faculty', 'Faculty authentication and role verified');

  const adminUser = await authService.signInWithEmail('admin.health@mcehassan.ac.in');
  assert(!!adminUser.user && adminUser.user.role === 'admin', 'Admin authentication and role verified');

  const resetResult = await authService.resetPasswordForEmail('rahul.sharma@mcehassan.ac.in');
  assert(resetResult.success === true, 'Password reset request execution verified');

  // 3. Appointment Booking, Double-Booking Prevention & Status Lifecycle
  console.log('\n--- 3. APPOINTMENT FLOW & CONFLICT AUDIT ---');
  const initialApts = await appointmentService.getAppointments();
  assert(initialApts.length > 0, 'Appointments list retrieves baseline records');

  const testDate = '2026-10-15';
  const testSlot = '02:30 PM';
  const newApt = await appointmentService.createAppointment({
    doctorId: 'doc-conflict-test',
    doctorName: 'Dr. Priya Rao',
    doctorSpecialization: 'General Medicine',
    serviceId: 'srv-gen-med',
    serviceName: 'General OPD',
    appointmentDate: testDate,
    timeSlot: testSlot,
    consultationType: 'video',
    reason: 'Routine seasonal check',
    symptoms: ['Mild Fever'],
    status: 'confirmed',
    patientId: 'usr-student-1',
    patientName: 'Rahul Sharma',
    patientRole: 'student',
    patientEmail: 'rahul.sharma@mcehassan.ac.in',
    patientPhone: '+91 98450 12345',
    patientUSNorEmpId: '4MC22CS089'
  });
  assert(!!newApt.id && newApt.bookingId.startsWith('MCE-APT-'), 'New appointment generated with valid booking ID');

  // Test double booking prevention
  let doubleBookingCaught = false;
  try {
    await appointmentService.createAppointment({
      doctorId: 'doc-conflict-test',
      doctorName: 'Dr. Priya Rao',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-gen-med',
      serviceName: 'General OPD',
      appointmentDate: testDate,
      timeSlot: testSlot,
      consultationType: 'video',
      reason: 'Another patient requesting exact same doctor & slot',
      symptoms: ['Headache'],
      status: 'confirmed',
      patientId: 'usr-student-2',
      patientName: 'Kavya Gowda',
      patientRole: 'student',
      patientEmail: 'kavya@mcehassan.ac.in',
      patientPhone: '+91 98450 99999'
    });
  } catch (err: any) {
    doubleBookingCaught = true;
  }
  assert(doubleBookingCaught, 'Double-booking conflict successfully blocked by scheduling guard');

  await appointmentService.updateAppointmentStatus(newApt.id, 'cancelled');
  const updatedApts = await appointmentService.getAppointments();
  const cancelledApt = updatedApts.find(a => a.id === newApt.id);
  assert(cancelledApt?.status === 'cancelled', 'Appointment status update and cancellation verified');

  // 4. WebRTC Configuration & Realtime Signaling
  console.log('\n--- 4. WEBRTC & SIGNALING AUDIT ---');
  const webrtcConfig = getWebRTCConfiguration();
  assert(webrtcConfig.iceServers.length > 0 && webrtcConfig.iceServers[0].urls.length > 0, 'WebRTC STUN server configured');
  
  const signaling = new RealtimeSignalingChannel('apt-test-room', 'usr-test-1');
  assert(typeof signaling.sendSignal === 'function', 'Realtime signaling gateway initialized');

  // 5. In-Call Consultation Chat Service
  console.log('\n--- 5. CONSULTATION CHAT AUDIT ---');
  const testChatMsg = await chatService.sendMessage('apt-chat-test', {
    senderId: 'doc-1',
    senderName: 'Dr. Priya Rao',
    senderRole: 'doctor',
    text: 'Please describe the duration of your throat discomfort.'
  });
  assert(!!testChatMsg.id && testChatMsg.text.length > 0, 'Consultation chat message created and dispatched');

  // 6. Medicine Reminders & Adherence
  console.log('\n--- 6. MEDICINE REMINDERS & ADHERENCE AUDIT ---');
  const rems = await reminderService.getReminders();
  assert(rems.length > 0, 'Medicine reminders retrieved');

  const newRem = await reminderService.addReminder({
    medicineName: 'Amoxicillin 500mg',
    dosage: '1 Capsule',
    frequency: 'Twice Daily',
    timeOfDay: '09:00 AM',
    mealTiming: 'After Food',
    startDate: '2026-09-18',
    endDate: '2026-09-23',
    status: 'upcoming'
  });
  assert(!!newRem.id && newRem.status === 'upcoming', 'New medicine reminder created');

  await reminderService.updateReminderStatus(newRem.id, 'taken');
  const remsAfterTaken = await reminderService.getReminders();
  const takenRem = remsAfterTaken.find(r => r.id === newRem.id);
  assert(takenRem?.status === 'taken', 'Reminder status transition to TAKEN verified');

  await reminderService.deleteReminder(newRem.id);
  const remsAfterDelete = await reminderService.getReminders();
  assert(!remsAfterDelete.some(r => r.id === newRem.id), 'Reminder deletion verified');

  // 7. Emergency SOS Lifecycle
  console.log('\n--- 7. EMERGENCY SOS LIFECYCLE AUDIT ---');
  const emgReq = await emergencyService.createEmergency({
    callerName: 'Hostel Resident',
    callerPhone: '+91 99887 76655',
    locationDetails: 'Kavery Boys Hostel, 3rd Floor',
    emergencyType: 'Accident/Trauma'
  });
  assert(!!emgReq.id && emgReq.status === 'active', 'Emergency SOS dispatch created with ACTIVE status');

  await emergencyService.updateEmergencyStatus(emgReq.id, 'resolved');
  const allEmg = await emergencyService.getEmergencies();
  const resolvedEmg = allEmg.find(e => e.id === emgReq.id);
  assert(resolvedEmg?.status === 'resolved', 'Emergency SOS transition to RESOLVED verified');

  // 8. Medical Records & Prescriptions
  console.log('\n--- 8. MEDICAL RECORDS & PRESCRIPTIONS AUDIT ---');
  const records = await medicalService.getRecords();
  assert(records.length > 0, 'Medical records retrieved from vault');

  const prescriptions = await prescriptionService.getPrescriptions();
  assert(prescriptions.length > 0, 'Digital prescriptions retrieved');

  // 9. AI Symptom Triage Assessment
  console.log('\n--- 9. AI SYMPTOM GUIDANCE AUDIT ---');
  const mildResult = evaluateSymptoms(['fever', 'cough'], 3, 2, 'college_student');
  assert(mildResult.riskLevel === 'moderate' || mildResult.riskLevel === 'low', 'Mild fever & cough evaluates to non-emergency level');
  assert(mildResult.recommendedDepartment.length > 0, 'Recommends appropriate clinical department');

  const severeEmergencyResult = evaluateSymptoms(['chest_pain', 'difficulty_breathing'], 9, 1, 'college_student');
  assert(severeEmergencyResult.riskLevel === 'emergency', 'Chest pain + difficulty breathing triggers EMERGENCY risk level');
  assert(severeEmergencyResult.isEmergency === true, 'Flag isEmergency set to true for severe distress');

  // 10. Database Schema & RLS
  console.log('\n--- 10. DATABASE SCHEMA & RLS AUDIT ---');
  const schemaContent = fs.readFileSync('supabase/schema.sql', 'utf8');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS users') || schemaContent.includes('CREATE TABLE IF NOT EXISTS profiles'), 'Users/Profiles table defined');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS appointments'), 'Appointments table defined');
  assert(schemaContent.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking'), 'Unique double-booking protection index created');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS consultation_messages'), 'Consultation messages table defined');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS prescriptions'), 'Prescriptions table defined');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS medicine_reminders'), 'Medicine Reminders table defined');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS medical_records'), 'Medical Records table defined');
  assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS emergency_requests'), 'Emergency Requests table defined');
  assert(schemaContent.includes('ENABLE ROW LEVEL SECURITY'), 'Row Level Security (RLS) enabled on tables');
  assert(schemaContent.includes('CREATE POLICY "Patients view own records" ON medical_records'), 'Strict private RLS policy on medical records');
  assert(schemaContent.includes('INSERT INTO storage.buckets'), 'Storage bucket configuration included in SQL');

  // 11. Route Integrity Audit
  console.log('\n--- 11. ROUTE INTEGRITY AUDIT ---');
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  assert(appContent.includes('path="student/dashboard"'), 'Student dashboard route configured');
  assert(appContent.includes('path="doctor/dashboard"'), 'Doctor dashboard route configured');
  assert(appContent.includes('path="admin/dashboard"'), 'Admin dashboard route configured');
  assert(appContent.includes('path="consultation/:id"'), 'Teleconsultation WebRTC room route configured');

  console.log('\n================================================================');
  console.log(` AUDIT RESULT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');
}

runAudit();
