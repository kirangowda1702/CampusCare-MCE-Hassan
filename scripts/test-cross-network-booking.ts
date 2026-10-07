import assert from 'node:assert';
import handler from '../api/appointments';
import { normalizeRow } from '../api/appointments';
import { isAppointmentForDoctor } from '../src/services/appointmentService';

// Mock VercelRequest and VercelResponse for API endpoint testing
function createMockReqRes(method: string, body?: any, query?: any, reqHeaders?: any) {
  const req: any = {
    method,
    body: body || {},
    query: query || {},
    headers: reqHeaders || {}
  };

  let statusCode = 200;
  let responseData: any = null;
  const headers: Record<string, string> = {};

  const res: any = {
    setHeader(key: string, value: string) {
      headers[key] = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
    end() {
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headers
  };

  return { req, res };
}

async function runCrossNetworkTests() {
  console.log('================================================================');
  console.log('  CAMPUSCARE CROSS-NETWORK APPOINTMENT BOOKING TEST SUITE       ');
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

  // Clear server memory store before testing
  globalThis.__campuscare_appointments = [];

  let testBookingId = '';
  let testAptId = '';

  const studentMobileHeaders = {
    'x-user-id': 'usr-student-mobile-1',
    'x-user-role': 'student',
    'x-user-name': 'Kiran Gowda',
    'x-user-email': 'kiran.student@mcehassan.ac.in'
  };

  const doctorWifiHeaders = {
    'x-user-id': 'd0000000-0000-0000-0000-000000000001',
    'x-doctor-id': 'DOC001',
    'x-user-role': 'doctor',
    'x-user-name': 'Dr. Kiran Gowda',
    'x-user-email': 'dr.kirangowda@mcehassan.ac.in'
  };

  const doctorMadanHeaders = {
    'x-user-id': 'd0000000-0000-0000-0000-000000000002',
    'x-doctor-id': 'DOC002',
    'x-user-role': 'doctor',
    'x-user-name': 'Dr. Madan S K',
    'x-user-email': 'dr.madansk@mcehassan.ac.in'
  };

  // TEST 1: Student on Device A (Mobile Data) books an appointment via POST /api/appointments
  await test('1. Student on Device A (Mobile Data) creates appointment via POST /api/appointments', async () => {
    const bookingPayload = {
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      appointmentDate: '2026-10-15',
      timeSlot: '10:30 AM',
      startTime: '10:30',
      endTime: '11:00',
      consultationType: 'video',
      reason: 'Persistent fever and body chills',
      symptoms: ['fever', 'chills'],
      patientId: 'usr-student-mobile-1',
      patientName: 'Kiran Gowda',
      patientRole: 'student',
      patientEmail: 'kiran.student@mcehassan.ac.in',
      patientPhone: '+91 9845011111'
    };

    const { req, res } = createMockReqRes('POST', bookingPayload, undefined, studentMobileHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 201, 'POST /api/appointments must return HTTP 201');
    const data = res.getData();
    assert.ok(data.success, 'Response must indicate success');
    assert.ok(data.appointment, 'Appointment object must be returned');
    assert.ok(data.appointment.bookingId.startsWith('MCE-APT-2026-'), 'Booking ID must follow institutional format');
    assert.strictEqual(data.appointment.doctorId, 'DOC001');
    assert.strictEqual(data.appointment.status, 'pending');

    testBookingId = data.appointment.bookingId;
    testAptId = data.appointment.id;
  });

  // TEST 2: Doctor on Device B (Wi-Fi) opens Doctor Dashboard and retrieves the appointment via GET /api/appointments
  await test('2. Doctor on Device B (Wi-Fi) retrieves appointment via GET /api/appointments', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, doctorWifiHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200, 'GET /api/appointments must return HTTP 200');
    const data = res.getData();
    assert.ok(data.success);
    assert.ok(Array.isArray(data.appointments));

    const found = data.appointments.find((a: any) => a.bookingId === testBookingId);
    assert.ok(found, `Appointment ${testBookingId} must be present in centralized database records`);
    assert.strictEqual(found.doctorId, 'DOC001');
    assert.strictEqual(found.status, 'pending');
    assert.strictEqual(found.patientName, 'Kiran Gowda');
  });

  // TEST 3: Doctor mapping verification for Dr. Kiran Gowda (DOC001)
  await test('3. Doctor Dashboard query matches appointment for Dr. Kiran Gowda (DOC001)', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, doctorWifiHeaders);
    await handler(req, res);
    const data = res.getData();

    const doctorUser = {
      id: 'd0000000-0000-0000-0000-000000000001',
      doctorId: 'DOC001',
      fullName: 'Dr. Kiran Gowda',
      email: 'dr.kirangowda@mcehassan.ac.in',
      role: 'doctor' as any
    };

    const doctorAppointments = data.appointments.filter((a: any) => isAppointmentForDoctor(a, doctorUser));
    const target = doctorAppointments.find((a: any) => a.bookingId === testBookingId);
    assert.ok(target, 'Dr. Kiran Gowda must see the booked appointment in his pending list');
    assert.strictEqual(target.status, 'pending');
  });

  // TEST 4: Isolation verification for Dr. Madan S K (DOC002)
  await test('4. Isolation: Dr. Madan S K (DOC002) does NOT see DOC001 appointment', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, doctorMadanHeaders);
    await handler(req, res);
    const data = res.getData();

    const madanAppointments = data.appointments;
    const leaked = madanAppointments.find((a: any) => a.bookingId === testBookingId);
    assert.strictEqual(leaked, undefined, 'DOC002 must not see DOC001 appointment via RLS GET');
  });

  // TEST 5: Doctor on Device B (Wi-Fi) accepts/confirms appointment via PATCH /api/appointments
  await test('5. Doctor on Device B (Wi-Fi) confirms appointment via PATCH /api/appointments', async () => {
    const { req, res } = createMockReqRes('PATCH', {
      id: testAptId,
      bookingId: testBookingId,
      status: 'confirmed',
      notes: 'Consultation confirmed. Join video room at scheduled time.'
    }, undefined, doctorWifiHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200, 'PATCH /api/appointments must return HTTP 200');
    assert.ok(res.getData().success);
  });

  // TEST 6: Student on Device A (Mobile Data) reads the confirmed status
  await test('6. Student on Device A (Mobile Data) sees confirmed status from cloud database', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, studentMobileHeaders);
    await handler(req, res);
    const data = res.getData();

    const target = data.appointments.find((a: any) => a.bookingId === testBookingId);
    assert.ok(target);
    assert.strictEqual(target.status, 'confirmed', 'Appointment status must now be confirmed in centralized database');
    assert.strictEqual(target.notes, 'Consultation confirmed. Join video room at scheduled time.');
  });

  // TEST 7: Reverse Network Combination: Student on Wi-Fi books for Dr. Madan (DOC002), Doctor on Mobile Data queries
  await test('7. Reverse Network: Student on Wi-Fi books DOC002 -> Doctor on Mobile Data queries', async () => {
    const doc2Payload = {
      doctorId: 'DOC002',
      doctorName: 'Dr. Madan S K',
      doctorSpecialization: 'General Medicine',
      appointmentDate: '2026-10-18',
      timeSlot: '11:30 AM',
      consultationType: 'in_person',
      reason: 'Sports knee injury',
      patientId: 'usr-student-wifi-2',
      patientName: 'Rahul Verma'
    };

    const studentWifiHeaders = {
      'x-user-id': 'usr-student-wifi-2',
      'x-user-role': 'student',
      'x-user-name': 'Rahul Verma'
    };

    // Student on Wi-Fi books
    const postReq = createMockReqRes('POST', doc2Payload, undefined, studentWifiHeaders);
    await handler(postReq.req, postReq.res);
    assert.strictEqual(postReq.res.getStatusCode(), 201);
    const created = postReq.res.getData().appointment;

    // Doctor on Mobile Data queries
    const getReq = createMockReqRes('GET', undefined, undefined, doctorMadanHeaders);
    await handler(getReq.req, getReq.res);
    const list = getReq.res.getData().appointments;

    const foundDoc2 = list.find((a: any) => a.id === created.id || a.bookingId === created.bookingId);
    assert.ok(foundDoc2, 'Dr. Madan S K on Mobile Data must see the appointment booked on Wi-Fi');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`SUMMARY: ${passed} / ${total} cross-network tests passed.`);
  console.log('----------------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runCrossNetworkTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
