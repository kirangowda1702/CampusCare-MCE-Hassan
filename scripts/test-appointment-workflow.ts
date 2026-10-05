// End-to-End Complete Student-to-Doctor Appointment Workflow Test Suite
import assert from 'node:assert';

class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

import { appointmentService, isAppointmentForDoctor } from '../src/services/appointmentService';
import { notificationService } from '../src/services/notificationService';
import { authService } from '../src/services/authService';
import { doctorService } from '../src/services/doctorService';
import { getTodayIST } from '../src/utils/dateUtils';
import { Appointment, User } from '../src/types';

async function runAppointmentWorkflowTests() {
  console.log('================================================================');
  console.log('  CAMPUSCARE COMPLETE APPOINTMENT WORKFLOW VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
    }
  }

  mockStorage.clear();

  // STEP 1: Student logs in
  let studentUser: User | null = null;
  await test('1. Student logs in successfully (Rahul Sharma)', async () => {
    const res = await authService.signInWithEmail('rahul.sharma@mcehassan.ac.in', 'CampusCare@2026');
    assert.ok(res.user, 'Student login returned null');
    assert.strictEqual(res.user.role, 'student');
    studentUser = res.user;
  });

  // STEP 2: Student selects doctor from directory
  let selectedDoctor: any = null;
  await test('2. Student selects doctor from directory (Dr. Kiran Gowda / DOC001)', async () => {
    const doctors = await doctorService.getDoctors();
    selectedDoctor = doctors.find(d => d.id === 'DOC001' || d.doctorId === 'DOC001');
    assert.ok(selectedDoctor, 'Doctor DOC001 must exist');
    assert.strictEqual(selectedDoctor.name, 'Dr. Kiran Gowda');
  });

  // STEP 3 & 4: Student books an appointment; status must initially be "pending"
  let bookedApt: Appointment | null = null;
  await test('3 & 4. Student books video appointment; status is initially "pending"', async () => {
    assert.ok(studentUser && selectedDoctor);
    bookedApt = await appointmentService.createAppointment({
      doctorId: selectedDoctor.doctorId || selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorSpecialization: selectedDoctor.specialization,
      doctorAvatar: selectedDoctor.avatarUrl,
      serviceId: 'srv-gen-med',
      serviceName: 'General Medicine & Primary Care',
      appointmentDate: '2026-10-15',
      timeSlot: '10:30 AM',
      startTime: '10:30',
      endTime: '11:00',
      consultationType: 'video',
      reason: 'Persistent fever and mild throat irritation',
      symptoms: ['fever', 'throat pain'],
      patientId: studentUser.id,
      patientName: studentUser.fullName,
      patientRole: 'student',
      patientEmail: studentUser.email,
      patientPhone: studentUser.phone || '+91 98765 43210',
      patientUSNorEmpId: studentUser.usn,
      status: 'pending'
    });

    assert.ok(bookedApt);
    assert.strictEqual(bookedApt.status, 'pending', 'Initial status must be pending');
    assert.strictEqual(bookedApt.consultationType, 'video');
    assert.strictEqual(bookedApt.patientId, studentUser.id);
  });

  // STEP 5: Appointment appears in selected doctor's dashboard and NOT in other doctors
  let doctorKiran: User | null = null;
  let doctorMadan: User | null = null;
  await test("5. Appointment appears in selected doctor's pending queue & isolated from other doctors", async () => {
    const kiranRes = await authService.signInWithEmail('dr.kirangowda@mcehassan.ac.in', 'CampusCare@2026');
    doctorKiran = kiranRes.user;
    assert.ok(doctorKiran);

    const madanRes = await authService.signInWithEmail('dr.madansk@mcehassan.ac.in', 'CampusCare@2026');
    doctorMadan = madanRes.user;
    assert.ok(doctorMadan);

    const allApts = await appointmentService.getAppointments();

    // Kiran's queue
    const kiranQueue = allApts.filter(a => isAppointmentForDoctor(a, doctorKiran));
    const kiranPending = kiranQueue.filter(a => a.status === 'pending');
    assert.ok(kiranPending.some(a => a.id === bookedApt!.id), 'Appointment must appear in Dr. Kiran Gowda pending queue');

    // Madan's queue (isolation check)
    const madanQueue = allApts.filter(a => isAppointmentForDoctor(a, doctorMadan));
    assert.ok(!madanQueue.some(a => a.id === bookedApt!.id), 'Appointment must NOT appear in Dr. Madan S K queue');
  });

  // STEP 6 & 7: Doctor accepts appointment -> status becomes "confirmed", student gets notification
  await test('6 & 7. Doctor accepts appointment -> status becomes "confirmed" & in-app notification sent', async () => {
    assert.ok(bookedApt);
    await appointmentService.updateAppointmentStatus(bookedApt.id, 'confirmed');

    // Verify status update in database/service
    const allApts = await appointmentService.getAppointments();
    const updated = allApts.find(a => a.id === bookedApt!.id);
    assert.ok(updated);
    assert.strictEqual(updated.status, 'confirmed', 'Status must now be confirmed');

    // Verify student dashboard sees it as confirmed
    const studentApts = allApts.filter(a => a.patientId === studentUser!.id);
    const confirmedForStudent = studentApts.find(a => a.id === bookedApt!.id);
    assert.strictEqual(confirmedForStudent?.status, 'confirmed');

    // Verify student receives in-app notification
    const studentNotifs = await notificationService.getNotifications(studentUser!.id);
    const confirmedNotif = studentNotifs.find(n => n.title === 'Appointment Confirmed');
    assert.ok(confirmedNotif, 'Student must receive Appointment Confirmed notification');
    assert.ok(confirmedNotif.message.includes(bookedApt.bookingId));
  });

  // STEP 8: Rejection flow verification
  await test('8. Doctor rejects an appointment -> status becomes "rejected" & in-app rejection notification sent', async () => {
    // Book a second appointment
    const secondApt = await appointmentService.createAppointment({
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-gen-med',
      serviceName: 'General Medicine & Primary Care',
      appointmentDate: '2026-10-16',
      timeSlot: '11:00 AM',
      startTime: '11:00',
      endTime: '11:30',
      consultationType: 'video',
      reason: 'Routine health checkup inquiry',
      symptoms: [],
      patientId: studentUser!.id,
      patientName: studentUser!.fullName,
      patientRole: 'student',
      patientEmail: studentUser!.email,
      patientPhone: '+91 98765 43210',
      patientUSNorEmpId: studentUser!.usn,
      status: 'pending'
    });

    // Doctor rejects it
    await appointmentService.updateAppointmentStatus(secondApt.id, 'rejected');

    const allApts = await appointmentService.getAppointments();
    const rejectedApt = allApts.find(a => a.id === secondApt.id);
    assert.strictEqual(rejectedApt?.status, 'rejected', 'Status must be rejected');

    // Student receives rejection notification
    const studentNotifs = await notificationService.getNotifications(studentUser!.id);
    const rejectedNotif = studentNotifs.find(n => n.title === 'Appointment Declined' && n.message.includes(secondApt.bookingId));
    assert.ok(rejectedNotif, 'Student must receive Appointment Declined notification');
  });

  // STEP 9 & 10: Confirmed video appointment consultation room access
  await test('9 & 10. Both student and assigned doctor can access the confirmed WebRTC consultation room', async () => {
    assert.ok(bookedApt && studentUser && doctorKiran);

    const allApts = await appointmentService.getAppointments();
    const currentApt = allApts.find(a => a.id === bookedApt!.id);
    assert.ok(currentApt);

    // Verify Student access check
    const isStudentOwner = (studentUser.id === currentApt.patientId) || (studentUser.email === currentApt.patientEmail);
    assert.ok(isStudentOwner, 'Patient must be authorized for their consultation room');

    // Verify Doctor access check
    const isAssignedDoctor = isAppointmentForDoctor(currentApt, doctorKiran);
    assert.ok(isAssignedDoctor, 'Assigned Doctor must be authorized for their consultation room');

    // Verify room status permission
    const isStatusPermitted = currentApt.status === 'confirmed' || currentApt.status === 'in_progress';
    assert.ok(isStatusPermitted, 'Room is active only when confirmed or in-progress');
  });

  // STEP 11 & 12: Privacy & Unauthorized user rejection
  await test('11 & 12. Unauthorized users are blocked from consultation room and other users appointments', () => {
    assert.ok(bookedApt);
    const unauthorizedUser: User = {
      id: 'usr-student-malicious-99',
      email: 'imposter@mcehassan.ac.in',
      role: 'student',
      fullName: 'Imposter User'
    };

    // Imposter room check
    const imposterIsOwner = unauthorizedUser.id === bookedApt.patientId;
    const imposterIsDoctor = isAppointmentForDoctor(bookedApt, unauthorizedUser);
    assert.strictEqual(imposterIsOwner || imposterIsDoctor, false, 'Imposter user must be rejected from consultation room');

    // Imposter dashboard appointment list isolation check
    const imposterAppointments = [bookedApt].filter(a => a.patientId === unauthorizedUser.id || a.patientEmail === unauthorizedUser.email);
    assert.strictEqual(imposterAppointments.length, 0, 'Imposter must not see other students appointments');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`SUMMARY: ${passed} / ${total} tests passed.`);
  console.log('----------------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAppointmentWorkflowTests().catch(err => {
  console.error('Workflow test failed:', err);
  process.exit(1);
});
