// Comprehensive Test Suite for Video Consultation Time Access Control & Patient Acceptance Notifications
import assert from 'node:assert';

// Mock LocalStorage
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

import {
  getAppointmentEpochMsIST,
  checkAppointmentAccessIST,
  getTodayIST
} from '../src/utils/dateUtils';
import { appointmentService } from '../src/services/appointmentService';
import { notificationService } from '../src/services/notificationService';
import handler, { getAppointmentEpochMsIST as apiGetEpoch } from '../api/appointments';

async function runTests() {
  console.log('========================================================================');
  console.log('  CAMPUSCARE VIDEO CONSULTATION ACCESS & PATIENT NOTIFICATION TEST SUITE');
  console.log('========================================================================\n');

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
      console.error(`         Error: ${err.message}\n${err.stack}`);
    }
  }

  const todayIST = getTodayIST(); // YYYY-MM-DD in Asia/Kolkata

  // Test 1: getAppointmentEpochMsIST converts 11:00 AM IST to exact epoch
  await test('1. getAppointmentEpochMsIST correctly calculates IST epoch (UTC+5:30)', () => {
    const epoch = getAppointmentEpochMsIST(todayIST, '11:00 AM');
    assert.ok(epoch !== null, 'Epoch should be non-null');

    // In IST, 11:00 AM is 05:30 UTC
    const date = new Date(epoch);
    assert.strictEqual(date.getUTCHours(), 5, 'UTC hours should be 5');
    assert.strictEqual(date.getUTCMinutes(), 30, 'UTC minutes should be 30');
  });

  // Test 2: Appointment scheduled for 11:00 AM is BLOCKED before 11:00 AM (e.g. at 10:45 AM)
  await test('2. Appointment scheduled for 11:00 AM is BLOCKED at 10:45 AM IST', () => {
    const scheduledEpoch = getAppointmentEpochMsIST(todayIST, '11:00 AM')!;
    const testNowEpoch = scheduledEpoch - 15 * 60 * 1000; // 15 mins before (10:45 AM)

    const check = checkAppointmentAccessIST(
      {
        appointmentDate: todayIST,
        timeSlot: '11:00 AM',
        status: 'confirmed'
      },
      testNowEpoch
    );

    assert.strictEqual(check.isAccessible, false, 'Should NOT be accessible before scheduled time');
    assert.strictEqual(check.isTimeReached, false, 'Time should not be reached');
    assert.strictEqual(check.minutesUntil, 15, 'Minutes until should be 15');
    assert.ok(check.message.includes('11:00 AM'), 'Message must inform user that consultation will be available at 11:00 AM');
  });

  // Test 3: Appointment scheduled for 11:00 AM is BLOCKED at 10:59 AM (1 minute before)
  await test('3. Appointment scheduled for 11:00 AM is BLOCKED at 10:59 AM IST', () => {
    const scheduledEpoch = getAppointmentEpochMsIST(todayIST, '11:00 AM')!;
    const testNowEpoch = scheduledEpoch - 60 * 1000; // 1 min before

    const check = checkAppointmentAccessIST(
      {
        appointmentDate: todayIST,
        timeSlot: '11:00 AM',
        status: 'confirmed'
      },
      testNowEpoch
    );

    assert.strictEqual(check.isAccessible, false, 'Should be blocked at 10:59 AM');
    assert.strictEqual(check.minutesUntil, 1, 'Minutes until should be 1');
  });

  // Test 4: Appointment scheduled for 11:00 AM is ACCESSIBLE at exactly 11:00 AM
  await test('4. Appointment scheduled for 11:00 AM is ACCESSIBLE at exactly 11:00 AM IST', () => {
    const scheduledEpoch = getAppointmentEpochMsIST(todayIST, '11:00 AM')!;

    const check = checkAppointmentAccessIST(
      {
        appointmentDate: todayIST,
        timeSlot: '11:00 AM',
        status: 'confirmed'
      },
      scheduledEpoch
    );

    assert.strictEqual(check.isAccessible, true, 'Should be accessible at 11:00 AM');
    assert.strictEqual(check.isTimeReached, true, 'isTimeReached should be true');
    assert.strictEqual(check.minutesUntil, 0, 'minutesUntil should be 0');
  });

  // Test 5: Appointment scheduled for 11:00 AM is ACCESSIBLE after 11:00 AM (e.g. 11:15 AM)
  await test('5. Appointment scheduled for 11:00 AM is ACCESSIBLE after 11:00 AM IST', () => {
    const scheduledEpoch = getAppointmentEpochMsIST(todayIST, '11:00 AM')!;
    const testNowEpoch = scheduledEpoch + 15 * 60 * 1000; // 15 mins after

    const check = checkAppointmentAccessIST(
      {
        appointmentDate: todayIST,
        timeSlot: '11:00 AM',
        status: 'confirmed'
      },
      testNowEpoch
    );

    assert.strictEqual(check.isAccessible, true, 'Should be accessible after 11:00 AM');
  });

  // Test 6: In-progress consultation is always accessible
  await test('6. Consultation marked in_progress is immediately accessible regardless of clock', () => {
    const scheduledEpoch = getAppointmentEpochMsIST(todayIST, '11:00 AM')!;
    const testNowEpoch = scheduledEpoch - 30 * 60 * 1000; // 30 mins before

    const check = checkAppointmentAccessIST(
      {
        appointmentDate: todayIST,
        timeSlot: '11:00 AM',
        status: 'in_progress'
      },
      testNowEpoch
    );

    assert.strictEqual(check.isAccessible, true, 'In-progress consultation must be accessible immediately');
  });

  // Test 7: Pending appointment is NOT accessible
  await test('7. Pending appointment is NOT accessible', () => {
    const check = checkAppointmentAccessIST({
      appointmentDate: todayIST,
      timeSlot: '11:00 AM',
      status: 'pending'
    });

    assert.strictEqual(check.isAccessible, false, 'Pending appointment cannot be joined');
    assert.strictEqual(check.isStatusPermitted, false);
  });

  // Test 8: Cancelled or rejected appointment is NOT accessible
  await test('8. Cancelled or rejected appointment is NOT accessible', () => {
    const checkCancelled = checkAppointmentAccessIST({
      appointmentDate: todayIST,
      timeSlot: '11:00 AM',
      status: 'cancelled'
    });
    const checkRejected = checkAppointmentAccessIST({
      appointmentDate: todayIST,
      timeSlot: '11:00 AM',
      status: 'rejected'
    });

    assert.strictEqual(checkCancelled.isAccessible, false);
    assert.strictEqual(checkRejected.isAccessible, false);
  });

  // Test 9: Backend API endpoint blocks early access (server-side IST verification)
  await test('9. Backend API verify_consultation_access blocks entry before 11:00 AM IST', async () => {
    // Tomorrow at 11:00 AM (definitely before scheduled time)
    const futureDate = '2026-12-01';
    const appointmentId = 'apt-test-future-11am';

    // Mock appointment in memory
    (globalThis as any).__campuscare_appointments = [
      {
        id: appointmentId,
        bookingId: 'MCE-APT-FUTURE-01',
        patientId: 'usr-student-guard-1',
        patientName: 'Test Student',
        patientEmail: 'student@mcehassan.ac.in',
        doctorId: 'DOC001',
        doctorName: 'Dr. Kiran Gowda',
        appointmentDate: futureDate,
        timeSlot: '11:00 AM',
        consultationType: 'video',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      }
    ];

    let statusCode = 0;
    let responseBody: any = null;

    const mockReq: any = {
      method: 'GET',
      headers: {
        'x-user-id': 'usr-student-guard-1',
        'x-user-role': 'student',
        'x-user-email': 'student@mcehassan.ac.in'
      },
      query: {
        action: 'verify_consultation_access',
        id: appointmentId
      }
    };

    const mockRes: any = {
      setHeader: () => {},
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            responseBody = data;
          }
        };
      }
    };

    await handler(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Should return 403 Forbidden before scheduled time');
    assert.strictEqual(responseBody.allowed, false, 'Allowed should be false');
    assert.strictEqual(responseBody.reason, 'SCHEDULED_TIME_NOT_REACHED');
    assert.ok(responseBody.message.includes('11:00 AM'), 'Message should mention 11:00 AM');
  });

  // Test 10: Backend API blocks unauthorized stranger
  await test('10. Backend API verify_consultation_access blocks unauthorized strangers', async () => {
    const appointmentId = 'apt-test-stranger-block';
    (globalThis as any).__campuscare_appointments = [
      {
        id: appointmentId,
        bookingId: 'MCE-APT-STRANGER-01',
        patientId: 'usr-student-owner',
        doctorId: 'DOC001',
        appointmentDate: todayIST,
        timeSlot: '10:00 AM',
        consultationType: 'video',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      }
    ];

    let statusCode = 0;
    let responseBody: any = null;

    const mockReq: any = {
      method: 'GET',
      headers: {
        'x-user-id': 'usr-unauthorized-stranger',
        'x-user-role': 'student',
        'x-user-email': 'stranger@mcehassan.ac.in'
      },
      query: {
        action: 'verify_consultation_access',
        id: appointmentId
      }
    };

    const mockRes: any = {
      setHeader: () => {},
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            responseBody = data;
          }
        };
      }
    };

    await handler(mockReq, mockRes);

    assert.strictEqual(statusCode, 403, 'Stranger must be blocked with 403 Forbidden');
    assert.strictEqual(responseBody.allowed, false);
    assert.strictEqual(responseBody.reason, 'UNAUTHORIZED_PARTICIPANT');
  });

  // Test 11: Patient Notification upon Booking
  await test('11. Patient receives in-app notification upon booking with doctor name and video time', async () => {
    const studentId = 'usr-patient-notify-01';
    const testSlot = '11:00 AM';

    const apt = await appointmentService.createAppointment({
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-001',
      serviceName: 'General Consultation',
      appointmentDate: todayIST,
      timeSlot: testSlot,
      consultationType: 'video',
      reason: 'Regular consultation checkup',
      symptoms: ['Mild headache'],
      patientId: studentId,
      patientName: 'Kavya R',
      patientRole: 'student',
      patientEmail: 'kavya@mcehassan.ac.in',
      patientPhone: '+91 99887 76655',
      patientUSNorEmpId: '4MC21CS044',
      status: 'pending'
    });

    const notifs = await notificationService.getNotifications(studentId);
    const bookingNotif = notifs.find(n => n.message.includes(apt.bookingId));

    assert.ok(bookingNotif, 'Patient should receive booking notification');
    assert.ok(bookingNotif.message.includes('Dr. Kiran Gowda'), 'Notification must include doctor name');
    assert.ok(bookingNotif.message.includes(testSlot), 'Notification must include time slot');
    assert.ok(bookingNotif.message.includes('Video consultation will be available'), 'Notification must include video consultation availability time');
  });

  // Test 12: Patient Notification when Doctor Accepts Appointment
  await test('12. Patient receives notification with ACCEPTED status and video availability when doctor accepts', async () => {
    const studentId = 'usr-patient-notify-02';
    const testSlot = '11:00 AM';

    const apt = await appointmentService.createAppointment({
      doctorId: 'DOC002',
      doctorName: 'Dr. Madan S K',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-001',
      serviceName: 'General Consultation',
      appointmentDate: todayIST,
      timeSlot: testSlot,
      consultationType: 'video',
      reason: 'Follow-up consultation',
      symptoms: ['Follow-up'],
      patientId: studentId,
      patientName: 'Kiran Gowda',
      patientRole: 'student',
      patientEmail: 'kiran@mcehassan.ac.in',
      patientPhone: '+91 91108 85805',
      patientUSNorEmpId: '4MC21CS088',
      status: 'pending'
    });

    // Doctor accepts appointment
    await appointmentService.updateAppointmentStatus(apt.id, 'confirmed');

    // Verify patient notification
    const notifs = await notificationService.getNotifications(studentId);
    const acceptedNotif = notifs.find(n => n.title === 'Appointment Confirmed' && n.message.includes(apt.bookingId));

    assert.ok(acceptedNotif, 'Patient must receive confirmation notification');
    assert.ok(acceptedNotif.message.includes('Dr. Madan S K'), 'Must include doctor name');
    assert.ok(acceptedNotif.message.includes('Status: Accepted') || acceptedNotif.message.includes('accepted'), 'Must include Accepted status');
    assert.ok(acceptedNotif.message.includes('Video consultation will be available at 11:00 AM'), 'Must include video consultation availability time');

    // Verify appointment status updated from pending to confirmed/accepted
    const updated = await appointmentService.getAppointments();
    const currentApt = updated.find(a => a.id === apt.id);
    assert.ok(currentApt?.status === 'confirmed' || currentApt?.status === 'accepted', 'Status must NOT remain stuck at pending');
  });

  console.log('\n------------------------------------------------------------------------');
  console.log(`  SUMMARY: ${passed} of ${total} TESTS PASSED`);
  console.log('------------------------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
