import assert from 'node:assert';
import handler from '../api/appointments';
import { isAppointmentForDoctor, isAppointmentForPatient } from '../api/appointments';

// Helper to mock VercelRequest and VercelResponse
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

async function runAppointmentRLSTests() {
  console.log('================================================================');
  console.log('  CAMPUSCARE APPOINTMENT RLS SECURITY VERIFICATION TEST SUITE   ');
  console.log('  Testing: Student A, Student B, Doctor DOC001, Doctor DOC002   ');
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

  // Clear memory store for a fresh clean test run
  globalThis.__campuscare_appointments = [];

  // Identity Profiles
  const studentA = {
    id: 'usr-student-a',
    role: 'student',
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@mcehassan.ac.in',
    usn: '4MC21CS089'
  };

  const studentB = {
    id: 'usr-student-b',
    role: 'student',
    fullName: 'Sneha Patel',
    email: 'sneha.patel@mcehassan.ac.in',
    usn: '4MC21IS045'
  };

  const doctorDOC001 = {
    id: 'd0000001-0000-0000-0000-000000000001',
    doctorId: 'DOC001',
    role: 'doctor',
    fullName: 'Dr. Kiran Gowda',
    email: 'dr.kirangowda@mcehassan.ac.in'
  };

  const doctorDOC002 = {
    id: 'd0000002-0000-0000-0000-000000000002',
    doctorId: 'DOC002',
    role: 'doctor',
    fullName: 'Dr. Madan S K',
    email: 'dr.madansk@mcehassan.ac.in'
  };

  const studentAHeaders = {
    'x-user-id': studentA.id,
    'x-user-role': studentA.role,
    'x-user-name': studentA.fullName,
    'x-user-email': studentA.email,
    'x-user-usn': studentA.usn
  };

  const studentBHeaders = {
    'x-user-id': studentB.id,
    'x-user-role': studentB.role,
    'x-user-name': studentB.fullName,
    'x-user-email': studentB.email,
    'x-user-usn': studentB.usn
  };

  const doc001Headers = {
    'x-user-id': doctorDOC001.id,
    'x-doctor-id': doctorDOC001.doctorId,
    'x-user-role': doctorDOC001.role,
    'x-user-name': doctorDOC001.fullName,
    'x-user-email': doctorDOC001.email
  };

  const doc002Headers = {
    'x-user-id': doctorDOC002.id,
    'x-doctor-id': doctorDOC002.doctorId,
    'x-user-role': doctorDOC002.role,
    'x-user-name': doctorDOC002.fullName,
    'x-user-email': doctorDOC002.email
  };

  let aptStudentAId = '';
  let aptStudentABookingId = '';
  let aptStudentBId = '';
  let aptStudentBBookingId = '';

  // -------------------------------------------------------------
  // SECTION 1: PUBLIC ANONYMOUS ACCESS REJECTION (RLS ENFORCEMENT)
  // -------------------------------------------------------------
  await test('1. Anonymous GET request is strictly rejected with 401 Unauthorized', async () => {
    const { req, res } = createMockReqRes('GET');
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 401, 'Anonymous GET must return 401');
    assert.ok(res.getData().error.includes('Anonymous access to appointments is prohibited'));
  });

  await test('2. Anonymous POST request is strictly rejected with 401 Unauthorized', async () => {
    const { req, res } = createMockReqRes('POST', {
      appointmentDate: '2026-10-20',
      timeSlot: '10:00 AM'
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 401, 'Anonymous POST must return 401');
  });

  await test('3. Anonymous PATCH request is strictly rejected with 401 Unauthorized', async () => {
    const { req, res } = createMockReqRes('PATCH', {
      id: 'apt-test',
      status: 'confirmed'
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 401, 'Anonymous PATCH must return 401');
  });

  // -------------------------------------------------------------
  // SECTION 2: AUTHORIZED APPOINTMENT CREATION
  // -------------------------------------------------------------
  await test('4. Student A books an appointment with Doctor DOC001 (Dr. Kiran Gowda)', async () => {
    const payload = {
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      appointmentDate: '2026-10-22',
      timeSlot: '09:30 AM',
      consultationType: 'video',
      reason: 'Migraine and headache',
      patientId: studentA.id,
      patientName: studentA.fullName,
      patientEmail: studentA.email
    };

    const { req, res } = createMockReqRes('POST', payload, undefined, studentAHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 201);
    const apt = res.getData().appointment;
    assert.strictEqual(apt.patientId, studentA.id);
    assert.strictEqual(apt.doctorId, 'DOC001');
    assert.strictEqual(apt.status, 'pending');

    aptStudentAId = apt.id;
    aptStudentABookingId = apt.bookingId;
  });

  await test('5. Student B books an appointment with Doctor DOC002 (Dr. Madan S K)', async () => {
    const payload = {
      doctorId: 'DOC002',
      doctorName: 'Dr. Madan S K',
      doctorSpecialization: 'General Medicine',
      appointmentDate: '2026-10-23',
      timeSlot: '11:00 AM',
      consultationType: 'video',
      reason: 'Seasonal asthma consultation',
      patientId: studentB.id,
      patientName: studentB.fullName,
      patientEmail: studentB.email
    };

    const { req, res } = createMockReqRes('POST', payload, undefined, studentBHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 201);
    const apt = res.getData().appointment;
    assert.strictEqual(apt.patientId, studentB.id);
    assert.strictEqual(apt.doctorId, 'DOC002');
    assert.strictEqual(apt.status, 'pending');

    aptStudentBId = apt.id;
    aptStudentBBookingId = apt.bookingId;
  });

  // -------------------------------------------------------------
  // SECTION 3: STUDENT DATA ISOLATION (CROSS-STUDENT LEAKAGE PREVENTION)
  // -------------------------------------------------------------
  await test('6. Student A queries GET -> sees ONLY Student A appointment; Student B is hidden', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, studentAHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    const appointments = res.getData().appointments;
    assert.ok(appointments.some((a: any) => a.id === aptStudentAId), 'Student A must see own appointment');
    assert.strictEqual(
      appointments.some((a: any) => a.id === aptStudentBId),
      false,
      'Student A must NOT see Student B appointment'
    );
  });

  await test('7. Student B queries GET -> sees ONLY Student B appointment; Student A is hidden', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, studentBHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    const appointments = res.getData().appointments;
    assert.ok(appointments.some((a: any) => a.id === aptStudentBId), 'Student B must see own appointment');
    assert.strictEqual(
      appointments.some((a: any) => a.id === aptStudentAId),
      false,
      'Student B must NOT see Student A appointment'
    );
  });

  // -------------------------------------------------------------
  // SECTION 4: STUDENT TAMPERING PREVENTION (FORBIDDEN CROSS-MODIFICATION)
  // -------------------------------------------------------------
  await test('8. Cross-Student Tampering: Student A attempts to book on behalf of Student B -> 403 Forbidden', async () => {
    const forbiddenPayload = {
      doctorId: 'DOC001',
      appointmentDate: '2026-10-25',
      timeSlot: '02:00 PM',
      patientId: studentB.id // Attempting to impersonate Student B
    };

    const { req, res } = createMockReqRes('POST', forbiddenPayload, undefined, studentAHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 403, 'Must return 403 when Student A books for Student B');
    assert.ok(res.getData().error.includes('You can only book appointments for yourself'));
  });

  await test('9. Cross-Student Tampering: Student B attempts to modify Student A appointment -> 403 Forbidden', async () => {
    const { req, res } = createMockReqRes('PATCH', {
      id: aptStudentAId,
      status: 'cancelled'
    }, undefined, studentBHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 403, 'Must return 403 when Student B modifies Student A appointment');
    assert.ok(res.getData().error.includes('You can only modify your own appointments'));
  });

  // -------------------------------------------------------------
  // SECTION 5: DOCTOR DATA ISOLATION (CROSS-DOCTOR LEAKAGE PREVENTION)
  // -------------------------------------------------------------
  await test('10. Doctor DOC001 queries GET -> sees ONLY appointment assigned to DOC001; DOC002 is hidden', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, doc001Headers);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    const appointments = res.getData().appointments;
    assert.ok(appointments.some((a: any) => a.id === aptStudentAId), 'DOC001 must see Student A assigned appointment');
    assert.strictEqual(
      appointments.some((a: any) => a.id === aptStudentBId),
      false,
      'Doctor DOC001 must NOT see appointment assigned to Doctor DOC002'
    );
  });

  await test('11. Doctor DOC002 queries GET -> sees ONLY appointment assigned to DOC002; DOC001 is hidden', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, doc002Headers);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    const appointments = res.getData().appointments;
    assert.ok(appointments.some((a: any) => a.id === aptStudentBId), 'DOC002 must see Student B assigned appointment');
    assert.strictEqual(
      appointments.some((a: any) => a.id === aptStudentAId),
      false,
      'Doctor DOC002 must NOT see appointment assigned to Doctor DOC001'
    );
  });

  // -------------------------------------------------------------
  // SECTION 6: DOCTOR TAMPERING PREVENTION (FORBIDDEN CROSS-ACCEPTANCE)
  // -------------------------------------------------------------
  await test('12. Cross-Doctor Tampering: Doctor DOC002 attempts to modify DOC001 appointment -> 403 Forbidden', async () => {
    const { req, res } = createMockReqRes('PATCH', {
      id: aptStudentAId,
      status: 'confirmed',
      notes: 'Unauthorized acceptance by DOC002'
    }, undefined, doc002Headers);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 403, 'Must return 403 when DOC002 attempts to modify DOC001 appointment');
    assert.ok(res.getData().error.includes('Doctors can only modify appointments assigned to them'));
  });

  await test('13. Cross-Doctor Tampering: Doctor DOC001 attempts to modify DOC002 appointment -> 403 Forbidden', async () => {
    const { req, res } = createMockReqRes('PATCH', {
      id: aptStudentBId,
      status: 'rejected',
      notes: 'Unauthorized rejection by DOC001'
    }, undefined, doc001Headers);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 403, 'Must return 403 when DOC001 attempts to modify DOC002 appointment');
    assert.ok(res.getData().error.includes('Doctors can only modify appointments assigned to them'));
  });

  // -------------------------------------------------------------
  // SECTION 7: AUTHORIZED WORKFLOW & CROSS-NETWORK SYNCHRONIZATION
  // -------------------------------------------------------------
  await test('14. Doctor DOC001 confirms Student A appointment -> 200 OK', async () => {
    const { req, res } = createMockReqRes('PATCH', {
      id: aptStudentAId,
      status: 'confirmed',
      notes: 'Consultation confirmed by Dr. Kiran Gowda. Please join video consultation on time.'
    }, undefined, doc001Headers);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(res.getData().success);
  });

  await test('15. Student A reads the confirmed status from cloud database', async () => {
    const { req, res } = createMockReqRes('GET', undefined, undefined, studentAHeaders);
    await handler(req, res);

    assert.strictEqual(res.getStatusCode(), 200);
    const appointments = res.getData().appointments;
    const confirmedApt = appointments.find((a: any) => a.id === aptStudentAId);
    assert.ok(confirmedApt, 'Student A must receive updated appointment');
    assert.strictEqual(confirmedApt.status, 'confirmed', 'Appointment status must be confirmed');
    assert.strictEqual(confirmedApt.notes, 'Consultation confirmed by Dr. Kiran Gowda. Please join video consultation on time.');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`SUMMARY: ${passed} / ${total} appointment RLS security tests passed.`);
  console.log('----------------------------------------------------------------\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAppointmentRLSTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
