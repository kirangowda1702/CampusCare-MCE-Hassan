// Test suite verifying the Video Consultation "Appointment not found" bugfix
// and 10 required test scenarios
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

import {
  getAppointmentEpochMsIST,
  checkAppointmentAccessIST,
  getTodayIST
} from '../src/utils/dateUtils';
import { appointmentService } from '../src/services/appointmentService';
import handler, { findAppointment } from '../api/appointments';

async function runTests() {
  console.log('========================================================================');
  console.log('  CAMPUSCARE VIDEO CONSULTATION "APPOINTMENT NOT FOUND" BUGFIX TEST SUITE');
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

  const todayIST = getTodayIST();
  const testAptId = 'c03264c7-8888-4444-9999-111122223333';
  const testBookingId = 'MCE-APT-2026-6246';
  const slot1130 = '11:30 AM';

  // Seed the authoritative appointment:
  // Booking ID: MCE-APT-2026-6246
  // Doctor: Dr. Kiran Gowda (DOC001)
  // Patient: Rahul Sharma (usr-student-rahul)
  // Scheduled Slot: today at 11:30 AM
  const targetAppointment = {
    id: testAptId,
    bookingId: testBookingId,
    patientId: 'usr-student-rahul',
    patientName: 'Rahul Sharma',
    patientEmail: 'rahul.sharma@mcehassan.ac.in',
    doctorId: 'DOC001',
    doctorName: 'Dr. Kiran Gowda',
    appointmentDate: todayIST,
    timeSlot: slot1130,
    consultationType: 'video',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  (globalThis as any).__campuscare_appointments = [targetAppointment];

  // Helper function to call the backend handler
  async function callApi(headers: Record<string, string>, query: Record<string, string>) {
    let statusCode = 0;
    let responseBody: any = null;

    const mockReq: any = {
      method: 'GET',
      headers,
      query
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
    return { status: statusCode, body: responseBody };
  }

  // TEST 1: Student opens appointment
  await test('TEST 1: Student opens appointment (receives appointment data, no false "not found")', async () => {
    const res = await callApi(
      {
        'x-user-id': 'usr-student-rahul',
        'x-user-role': 'student',
        'x-user-email': 'rahul.sharma@mcehassan.ac.in'
      },
      {
        action: 'get_single',
        id: testAptId
      }
    );

    assert.strictEqual(res.status, 200, 'Student should fetch appointment with 200 OK');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.appointment.bookingId, testBookingId);
    assert.strictEqual(res.body.appointment.patientName, 'Rahul Sharma');
    assert.strictEqual(res.body.appointment.timeSlot, slot1130);
  });

  // TEST 2: Doctor opens same appointment
  await test('TEST 2: Doctor opens same appointment (authoritative access verified)', async () => {
    const res = await callApi(
      {
        'x-user-id': 'd0000001-0000-0000-0000-000000000001',
        'x-user-role': 'doctor',
        'x-doctor-id': 'DOC001',
        'x-user-email': 'dr.kirangowda@mcehassan.ac.in'
      },
      {
        action: 'get_single',
        id: testAptId
      }
    );

    assert.strictEqual(res.status, 200, 'Doctor should fetch appointment with 200 OK');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.appointment.bookingId, testBookingId);
  });

  // TEST 3: Student and doctor from different networks (simulating different callers/devices)
  await test('TEST 3: Cross-device access: Student on Mobile Data & Doctor on Wi-Fi both resolve same appointment', async () => {
    // Device A (Student on Mobile)
    const resStudent = await callApi(
      {
        'x-user-id': 'usr-student-rahul',
        'x-user-role': 'student'
      },
      {
        action: 'get_single',
        id: testBookingId // via booking ID
      }
    );
    assert.strictEqual(resStudent.status, 200);
    assert.strictEqual(resStudent.body.appointment.id, testAptId);

    // Device B (Doctor on Wi-Fi)
    const resDoctor = await callApi(
      {
        'x-user-id': 'usr-doctor-kiran',
        'x-doctor-id': 'DOC001',
        'x-user-role': 'doctor'
      },
      {
        action: 'get_single',
        id: testAptId // via database UUID
      }
    );
    assert.strictEqual(resDoctor.status, 200);
    assert.strictEqual(resDoctor.body.appointment.bookingId, testBookingId);
  });

  // TEST 4: Before 11:30 AM
  await test('TEST 4: Before 11:30 AM: Video room is LOCKED with "available at 11:30 AM", NEVER "Appointment not found"', () => {
    const scheduledEpochMs = getAppointmentEpochMsIST(todayIST, slot1130)!;
    const testNowEpochMs = scheduledEpochMs - 10 * 60 * 1000; // 11:20 AM (10 minutes before)

    const check = checkAppointmentAccessIST(
      {
        appointmentDate: todayIST,
        timeSlot: slot1130,
        status: 'confirmed'
      },
      testNowEpochMs
    );

    assert.strictEqual(check.isAccessible, false, 'Must be locked before 11:30 AM');
    assert.strictEqual(check.isTimeReached, false);
    assert.ok(check.message.includes('11:30 AM'), 'Message must inform user that room is available at 11:30 AM');
    assert.ok(!check.message.includes('not found'), 'Message must NEVER say Appointment not found');
  });

  // TEST 5: At 11:30 AM
  await test('TEST 5: At 11:30 AM: Consultation automatically unlocks', () => {
    const scheduledEpochMs = getAppointmentEpochMsIST(todayIST, slot1130)!;
    const testNowEpochMs = scheduledEpochMs; // Exactly 11:30 AM

    const check = checkAppointmentAccessIST(
      {
        appointmentDate: todayIST,
        timeSlot: slot1130,
        status: 'confirmed'
      },
      testNowEpochMs
    );

    assert.strictEqual(check.isAccessible, true, 'Must unlock at 11:30 AM');
    assert.strictEqual(check.isTimeReached, true);
  });

  // TEST 6: Direct consultation URL before 11:30
  await test('TEST 6: Direct consultation URL before 11:30: Server rejects access with SCHEDULED_TIME_NOT_REACHED', async () => {
    // Future appointment scheduled for tomorrow at 11:30 AM
    const futureDate = '2026-12-05';
    const futureApt = {
      id: 'apt-direct-url-future',
      bookingId: 'MCE-APT-2026-9999',
      patientId: 'usr-student-rahul',
      doctorId: 'DOC001',
      appointmentDate: futureDate,
      timeSlot: slot1130,
      consultationType: 'video',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    (globalThis as any).__campuscare_appointments.push(futureApt);

    const res = await callApi(
      {
        'x-user-id': 'usr-student-rahul',
        'x-user-role': 'student'
      },
      {
        action: 'verify_consultation_access',
        id: futureApt.id,
        bookingId: futureApt.bookingId
      }
    );

    assert.strictEqual(res.status, 403, 'Direct access before time must be 403 Forbidden');
    assert.strictEqual(res.body.allowed, false);
    assert.strictEqual(res.body.reason, 'SCHEDULED_TIME_NOT_REACHED');
    assert.ok(res.body.message.includes('11:30 AM'), 'Message must mention 11:30 AM');
    assert.ok(!res.body.message.includes('not found'), 'Must not say not found');
  });

  // TEST 7: Direct consultation URL at 11:30
  await test('TEST 7: Direct consultation URL at or after scheduled time: Server grants access (200 OK, ACCESS_GRANTED)', async () => {
    // Past or current time slot today (e.g. 09:00 AM)
    const readyApt = {
      id: 'apt-ready-1130',
      bookingId: 'MCE-APT-2026-7777',
      patientId: 'usr-student-rahul',
      doctorId: 'DOC001',
      appointmentDate: todayIST,
      timeSlot: '09:00 AM', // In the past today
      consultationType: 'video',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    (globalThis as any).__campuscare_appointments.push(readyApt);

    const res = await callApi(
      {
        'x-user-id': 'usr-student-rahul',
        'x-user-role': 'student'
      },
      {
        action: 'verify_consultation_access',
        id: readyApt.id,
        bookingId: readyApt.bookingId
      }
    );

    assert.strictEqual(res.status, 200, 'Direct access at scheduled time must return 200 OK');
    assert.strictEqual(res.body.allowed, true);
    assert.strictEqual(res.body.reason, 'ACCESS_GRANTED');
    assert.strictEqual(res.body.appointmentId, readyApt.id);
  });

  // TEST 8: Unauthorized account
  await test('TEST 8: Unauthorized account: Blocked with 403 UNAUTHORIZED_PARTICIPANT', async () => {
    const res = await callApi(
      {
        'x-user-id': 'usr-stranger-intruder',
        'x-user-role': 'student',
        'x-user-email': 'stranger@other.com'
      },
      {
        action: 'verify_consultation_access',
        id: testAptId,
        bookingId: testBookingId
      }
    );

    assert.strictEqual(res.status, 403, 'Intruder must be 403 Forbidden');
    assert.strictEqual(res.body.allowed, false);
    assert.strictEqual(res.body.reason, 'UNAUTHORIZED_PARTICIPANT');
  });

  // TEST 9: Cancelled appointment
  await test('TEST 9: Cancelled or rejected appointment: Blocked with 403 NOT_PERMITTED', async () => {
    const cancelledApt = {
      id: 'apt-cancelled-test',
      bookingId: 'MCE-APT-2026-0000',
      patientId: 'usr-student-rahul',
      doctorId: 'DOC001',
      appointmentDate: todayIST,
      timeSlot: slot1130,
      consultationType: 'video',
      status: 'cancelled',
      createdAt: new Date().toISOString()
    };
    (globalThis as any).__campuscare_appointments.push(cancelledApt);

    const res = await callApi(
      {
        'x-user-id': 'usr-student-rahul',
        'x-user-role': 'student'
      },
      {
        action: 'verify_consultation_access',
        id: cancelledApt.id
      }
    );

    assert.strictEqual(res.status, 403, 'Cancelled appointment must be 403');
    assert.strictEqual(res.body.allowed, false);
    assert.strictEqual(res.body.reason, 'NOT_PERMITTED');
  });

  // TEST 10: Wrong appointment ID
  await test('TEST 10: Genuinely wrong appointment ID: Returns 404 NOT_FOUND', async () => {
    const res = await callApi(
      {
        'x-user-id': 'usr-student-rahul',
        'x-user-role': 'student'
      },
      {
        action: 'verify_consultation_access',
        id: 'non-existent-appointment-999999'
      }
    );

    assert.strictEqual(res.status, 404, 'Non-existent ID must return 404');
    assert.strictEqual(res.body.allowed, false);
    assert.strictEqual(res.body.reason, 'NOT_FOUND');
  });

  console.log('\n------------------------------------------------------------------------');
  console.log(`  ALL 10 VERIFICATION TESTS: ${passed} of ${total} PASSED`);
  console.log('------------------------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
