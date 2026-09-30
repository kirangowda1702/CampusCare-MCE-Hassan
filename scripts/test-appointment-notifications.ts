// CampusCare Appointment Notification Audit & Verification Test Suite
import assert from 'node:assert';

// 1. Setup Mock LocalStorage
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

import { appointmentService } from '../src/services/appointmentService';
import { notificationService, DOCTOR_USER_MAP } from '../src/services/notificationService';
import { appointmentReminderService, parseAppointmentDateTime } from '../src/services/appointmentReminderService';
import { Appointment } from '../src/types';

async function runAppointmentNotificationTests() {
  console.log('================================================================');
  console.log('  CAMPUSCARE APPOINTMENT NOTIFICATION TIMING AUDIT TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
    }
  }

  // Clear state before running tests
  mockStorage.clear();

  // Test 1: Doctor receives notification immediately when student books an appointment
  await test('1. Doctor and student receive notifications immediately upon appointment booking', async () => {
    const studentId = 'usr-student-audit-01';
    const doctorId = 'DOC001';
    const testDate = '2026-10-15';
    const testSlot = '10:30 AM';

    const apt = await appointmentService.createAppointment({
      doctorId,
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-001',
      serviceName: 'General Consultation',
      appointmentDate: testDate,
      timeSlot: testSlot,
      consultationType: 'video',
      reason: 'Persistent fever and cough',
      symptoms: ['Fever', 'Cough'],
      patientId: studentId,
      patientName: 'Arun Kumar',
      patientRole: 'student',
      patientEmail: 'arunkumar@mcehassan.ac.in',
      patientPhone: '+91 98450 11223',
      patientUSNorEmpId: '4MC21CS001',
      status: 'pending'
    });

    assert.ok(apt.id, 'Appointment should have an ID');
    assert.ok(apt.bookingId, 'Appointment should have a booking ID');

    // Verify doctor received immediate notification
    const doctorNotifs = await notificationService.getNotifications(doctorId);
    const doctorAlert = doctorNotifs.find(n => n.message.includes(apt.bookingId));
    assert.ok(doctorAlert, 'Doctor should receive immediate notification for new booking');
    assert.strictEqual(doctorAlert?.type, 'appointment');

    // Verify student received immediate notification
    const studentNotifs = await notificationService.getNotifications(studentId);
    const studentAlert = studentNotifs.find(n => n.message.includes(apt.bookingId));
    assert.ok(studentAlert, 'Student should receive confirmation that request was submitted');
  });

  // Test 2: Student receives notification when doctor accepts/confirms it
  await test('2. Student receives notification when doctor accepts/confirms appointment', async () => {
    const studentId = 'usr-student-audit-02';
    const doctorId = 'DOC002';
    const testDate = '2026-10-16';
    const testSlot = '11:00 AM';

    const apt = await appointmentService.createAppointment({
      doctorId,
      doctorName: 'Dr. Madan S K',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-002',
      serviceName: 'Health Screening',
      appointmentDate: testDate,
      timeSlot: testSlot,
      consultationType: 'video',
      reason: 'Routine checkup',
      symptoms: [],
      patientId: studentId,
      patientName: 'Sneha Patel',
      patientRole: 'student',
      patientEmail: 'sneha@mcehassan.ac.in',
      patientPhone: '+91 98450 22334',
      status: 'pending'
    });

    // Doctor confirms appointment
    await appointmentService.updateAppointmentStatus(apt.id, 'confirmed');

    // Student notifications should now have the confirmation alert
    const studentNotifs = await notificationService.getNotifications(studentId);
    const confirmAlert = studentNotifs.find(
      n => n.title === 'Appointment Confirmed' && n.message.includes(apt.bookingId)
    );
    assert.ok(confirmAlert, 'Student should receive "Appointment Confirmed" notification');
    assert.ok(confirmAlert?.message.includes('Dr. Madan S K'), 'Message must include doctor name');
  });

  // Test 3: Both student and doctor receive a reminder before scheduled consultation time (15–30 min)
  await test('3. Both student and doctor receive pre-consultation reminder (15-30 min before)', async () => {
    const now = new Date();
    // Simulate appointment starting in 20 minutes
    const futureTime = new Date(now.getTime() + 20 * 60 * 1000);
    const yyyy = futureTime.getFullYear();
    const mm = String(futureTime.getMonth() + 1).padStart(2, '0');
    const dd = String(futureTime.getDate()).padStart(2, '0');
    const testDate = `${yyyy}-${mm}-${dd}`;

    const hours = futureTime.getHours();
    const mins = String(futureTime.getMinutes()).padStart(2, '0');
    const meridian = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const testSlot = `${String(displayHours).padStart(2, '0')}:${mins} ${meridian}`;

    const mockApt: Appointment = {
      id: 'apt-reminder-test-30m',
      bookingId: 'MCE-REM-30M',
      patientId: 'usr-student-reminder-01',
      patientName: 'Vikram Rao',
      patientRole: 'student',
      patientEmail: 'vikram@mcehassan.ac.in',
      patientPhone: '+91 99887 66554',
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-001',
      serviceName: 'General Consultation',
      appointmentDate: testDate,
      timeSlot: testSlot,
      consultationType: 'video',
      reason: 'Follow-up consultation',
      symptoms: [],
      status: 'confirmed',
      createdAt: now.toISOString()
    };

    const res = await appointmentReminderService.checkUpcomingAppointments([mockApt]);
    assert.ok(res.remindersSent >= 1, 'Should trigger at least 1 reminder pair');

    // Verify student received reminder
    const studentNotifs = await notificationService.getNotifications('usr-student-reminder-01');
    const studentReminder = studentNotifs.find(n => n.message.includes('MCE-REM-30M'));
    assert.ok(studentReminder, 'Student must receive pre-consultation reminder');
    assert.strictEqual(studentReminder?.type, 'reminder');

    // Verify doctor received reminder
    const doctorNotifs = await notificationService.getNotifications('DOC001');
    const docReminder = doctorNotifs.find(n => n.message.includes('MCE-REM-30M'));
    assert.ok(docReminder, 'Doctor must receive pre-consultation reminder');
    assert.strictEqual(docReminder?.type, 'reminder');
  });

  // Test 4: Both receive a notification at consultation start time
  await test('4. Both receive notification at consultation start time with video room link', async () => {
    const now = new Date();
    // Simulate appointment starting right now (+1 min)
    const startTime = new Date(now.getTime() + 1 * 60 * 1000);
    const yyyy = startTime.getFullYear();
    const mm = String(startTime.getMonth() + 1).padStart(2, '0');
    const dd = String(startTime.getDate()).padStart(2, '0');
    const testDate = `${yyyy}-${mm}-${dd}`;

    const hours = startTime.getHours();
    const mins = String(startTime.getMinutes()).padStart(2, '0');
    const meridian = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const testSlot = `${String(displayHours).padStart(2, '0')}:${mins} ${meridian}`;

    const mockApt: Appointment = {
      id: 'apt-start-test-0m',
      bookingId: 'MCE-START-0M',
      patientId: 'usr-student-start-01',
      patientName: 'Priya Sharma',
      patientRole: 'student',
      patientEmail: 'priya@mcehassan.ac.in',
      patientPhone: '+91 99887 11223',
      doctorId: 'DOC002',
      doctorName: 'Dr. Madan S K',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-002',
      serviceName: 'General Consultation',
      appointmentDate: testDate,
      timeSlot: testSlot,
      consultationType: 'video',
      reason: 'General Consultation',
      symptoms: [],
      status: 'confirmed',
      createdAt: now.toISOString()
    };

    const res = await appointmentReminderService.checkUpcomingAppointments([mockApt]);
    assert.ok(res.startNotificationsSent >= 1, 'Should trigger start time notification');

    // Student start alert
    const studentNotifs = await notificationService.getNotifications('usr-student-start-01');
    const studentStart = studentNotifs.find(
      n => n.title === 'Consultation Starting Now' && n.message.includes('MCE-START-0M')
    );
    assert.ok(studentStart, 'Student must receive start time notification');
    assert.strictEqual(studentStart?.link, '/consultation/apt-start-test-0m', 'Must link directly to video room');

    // Doctor start alert
    const doctorNotifs = await notificationService.getNotifications('DOC002');
    const doctorStart = doctorNotifs.find(
      n => n.title === 'Consultation Starting Now' && n.message.includes('MCE-START-0M')
    );
    assert.ok(doctorStart, 'Doctor must receive start time notification');
    assert.strictEqual(doctorStart?.link, '/consultation/apt-start-test-0m', 'Must link directly to video room');
  });

  // Test 5: The notification contains the correct appointment date, time, doctor/patient and booking ID
  await test('5. All notifications contain correct appointment date, time, doctor/patient and booking ID', async () => {
    const studentId = 'usr-student-metadata-test';
    const doctorId = 'DOC001';
    const date = '2026-11-20';
    const slot = '02:30 PM';

    const apt = await appointmentService.createAppointment({
      doctorId,
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-001',
      serviceName: 'General Consultation',
      appointmentDate: date,
      timeSlot: slot,
      consultationType: 'video',
      reason: 'Cold symptoms',
      symptoms: ['Cold'],
      patientId: studentId,
      patientName: 'Rajesh Hegde',
      patientRole: 'student',
      patientEmail: 'rajesh@mcehassan.ac.in',
      patientPhone: '+91 97766 55443',
      status: 'pending'
    });

    const studentNotifs = await notificationService.getNotifications(studentId);
    const creationAlert = studentNotifs.find(n => n.message.includes(apt.bookingId));
    assert.ok(creationAlert, 'Notification should exist');

    // Verify all 4 required fields in student alert
    assert.ok(creationAlert?.message.includes(date), `Message should include date "${date}"`);
    assert.ok(creationAlert?.message.includes(slot), `Message should include time "${slot}"`);
    assert.ok(creationAlert?.message.includes('Dr. Kiran Gowda'), 'Message should include doctor name');
    assert.ok(creationAlert?.message.includes(apt.bookingId), `Message should include booking ID "${apt.bookingId}"`);

    // Doctor confirmation notification
    await appointmentService.updateAppointmentStatus(apt.id, 'confirmed');
    const doctorNotifs = await notificationService.getNotifications(doctorId);
    const confirmDoctorAlert = doctorNotifs.find(
      n => n.title === 'Appointment Confirmed' && n.message.includes(apt.bookingId)
    );
    assert.ok(confirmDoctorAlert, 'Doctor confirmation alert should exist');
    assert.ok(confirmDoctorAlert?.message.includes('Rajesh Hegde'), 'Doctor alert should include patient name');
    assert.ok(confirmDoctorAlert?.message.includes(date), 'Doctor alert should include appointment date');
    assert.ok(confirmDoctorAlert?.message.includes(slot), 'Doctor alert should include appointment slot');
    assert.ok(confirmDoctorAlert?.message.includes(apt.bookingId), 'Doctor alert should include booking ID');
  });

  // Test 6: Notifications are stored and delivered through realtime architecture
  await test('6. Realtime subscription receives new notifications and updates read status', async () => {
    let receivedRealtime: any = null;

    // Register realtime subscription
    const unsubscribe = notificationService.subscribeToNotifications(
      'usr-realtime-listener',
      notif => {
        receivedRealtime = notif;
      }
    );

    // Create notification for target user
    const created = await notificationService.createNotification({
      userId: 'usr-realtime-listener',
      title: 'Realtime Alert Test',
      message: 'Testing realtime event delivery to subscribers',
      type: 'system',
      link: '/dashboard'
    });

    assert.ok(receivedRealtime, 'Subscriber must immediately receive realtime notification');
    assert.strictEqual(receivedRealtime.id, created.id);
    assert.strictEqual(receivedRealtime.isRead, false);

    // Test mark as read
    await notificationService.markAsRead(created.id);
    const updatedList = await notificationService.getNotifications('usr-realtime-listener');
    const updated = updatedList.find(n => n.id === created.id);
    assert.strictEqual(updated?.isRead, true, 'Notification should be marked as read');

    unsubscribe();
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`  SUMMARY: ${passed} of ${total} TESTS PASSED`);
  console.log('----------------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAppointmentNotificationTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
