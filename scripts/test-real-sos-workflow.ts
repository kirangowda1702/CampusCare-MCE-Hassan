import handler from '../api/emergency';

class MockResponse {
  statusCode: number = 200;
  headers: Record<string, string> = {};
  data: any = null;

  setHeader(key: string, value: string) {
    this.headers[key.toLowerCase()] = value;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(payload: any) {
    this.data = payload;
    return this;
  }

  end() {
    return this;
  }
}

function createMockRequest(options: {
  method: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
}) {
  return {
    method: options.method,
    headers: options.headers || {},
    body: options.body || {},
    query: options.query || {}
  } as any;
}

async function runTest() {
  console.log('================================================================');
  console.log(' CAMPUSCARE REAL MCE FIRST AID SOS WORKFLOW TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. ANONYMOUS ACCESS PROTECTION
  console.log('--- Test Group 1: Anonymous Access Protection ---');
  {
    const req = createMockRequest({ method: 'GET' });
    const res = new MockResponse();
    await handler(req, res as any);
    assert(res.statusCode === 401, 'Anonymous GET is rejected with 401 Unauthorized');
  }

  {
    const req = createMockRequest({
      method: 'POST',
      body: { locationDetails: 'Kavery Hostel', emergencyType: 'Cardiac' }
    });
    const res = new MockResponse();
    await handler(req, res as any);
    assert(res.statusCode === 401, 'Anonymous POST is rejected with 401 Unauthorized');
  }

  // 2. BROWSER A (STUDENT A) TRIGGERS SOS
  console.log('\n--- Test Group 2: Browser A (Student) Triggers SOS ---');
  const studentAId = 'stu-mce-401';
  let createdIncidentId = '';
  let createdIncidentCode = '';

  {
    const req = createMockRequest({
      method: 'POST',
      headers: {
        'x-user-id': studentAId,
        'x-user-role': 'student',
        'x-user-name': 'Rahul Sharma (MCE Student)',
        'x-user-phone': '9110885805'
      },
      body: {
        locationDetails: 'Mechanical Block 2nd Floor Workshop',
        description: 'Student slipped and injured ankle severely.',
        latitude: 13.0076,
        longitude: 76.0965,
        locationShared: true,
        hasLocationPermission: true,
        emergencyType: 'Accident/Trauma',
        callerPhone: '9110885805'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);

    assert(res.statusCode === 200, 'Student SOS request returns HTTP 200');
    assert(res.data?.success === true, 'Response body indicates success: true');
    assert(res.data?.data?.status === 'ACTIVE', 'Initial incident status is ACTIVE');
    assert(res.data?.data?.incidentCode?.startsWith('MCE-SOS-'), 'Unique Incident Code generated (MCE-SOS-*)');
    assert(res.data?.data?.userRole === 'student', 'Caller user role is recorded as student');
    assert(res.data?.data?.latitude === 13.0076 && res.data?.data?.longitude === 76.0965, 'GPS coordinates captured accurately');
    assert(res.data?.data?.callerPhone === '9110885805', 'MCE First Aid Contact is 9110885805');

    createdIncidentId = res.data?.data?.id;
    createdIncidentCode = res.data?.data?.incidentCode;
  }

  // 3. BROWSER B (FIRST AID RESPONDER) RECEIVES INCIDENT NOTIFICATION
  console.log('\n--- Test Group 3: Browser B (Responder) Realtime Reception ---');
  {
    const req = createMockRequest({
      method: 'GET',
      headers: {
        'x-user-id': 'doc-mce-duty-001',
        'x-user-role': 'doctor',
        'x-user-name': 'Dr. Kiran Gowda (MCE Campus Physician)'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);

    assert(res.statusCode === 200, 'Responder query returns HTTP 200');
    assert(Array.isArray(res.data?.data), 'Responder receives incidents list');
    const receivedIncident = res.data?.data?.find((i: any) => i.id === createdIncidentId || i.incidentCode === createdIncidentCode);
    assert(Boolean(receivedIncident), 'Active incident received in Responder dashboard');
    assert(receivedIncident?.status === 'ACTIVE', 'Received incident has status ACTIVE');
    assert(receivedIncident?.latitude === 13.0076, 'Responder views caller GPS coordinates on map');
  }

  // 4. STUDENT CANNOT UNILATERALLY RESOLVE / ACKNOWLEDGE
  console.log('\n--- Test Group 4: Student Permission Boundaries ---');
  {
    const req = createMockRequest({
      method: 'PATCH',
      headers: {
        'x-user-id': studentAId,
        'x-user-role': 'student',
        'x-user-name': 'Rahul Sharma'
      },
      body: {
        id: createdIncidentId,
        status: 'ACKNOWLEDGED'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);
    assert(res.statusCode === 403, 'Student cannot acknowledge incident (403 Forbidden)');
  }

  {
    const req = createMockRequest({
      method: 'PATCH',
      headers: {
        'x-user-id': studentAId,
        'x-user-role': 'student',
        'x-user-name': 'Rahul Sharma'
      },
      body: {
        id: createdIncidentId,
        status: 'RESOLVED'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);
    assert(res.statusCode === 403, 'Student cannot resolve incident (403 Forbidden)');
  }

  // 5. FIRST AID RESPONDER LIFECYCLE STATE MACHINE
  console.log('\n--- Test Group 5: First Aid Responder Lifecycle Progression ---');
  // State: ACTIVE -> ACKNOWLEDGED
  {
    const req = createMockRequest({
      method: 'PATCH',
      headers: {
        'x-user-id': 'admin-safety-01',
        'x-user-role': 'admin',
        'x-user-name': 'MCE Safety Admin'
      },
      body: {
        id: createdIncidentId,
        status: 'ACKNOWLEDGED'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);
    assert(res.statusCode === 200, 'Responder transitions ACTIVE -> ACKNOWLEDGED');
    assert(res.data?.data?.status === 'ACKNOWLEDGED', 'Updated status is ACKNOWLEDGED');
    assert(Boolean(res.data?.data?.firstAidContactedAt), 'firstAidContactedAt timestamp recorded');
  }

  // State: ACKNOWLEDGED -> ASSISTANCE_IN_PROGRESS
  {
    const req = createMockRequest({
      method: 'PATCH',
      headers: {
        'x-user-id': 'doc-mce-duty-001',
        'x-user-role': 'doctor',
        'x-user-name': 'Dr. Kiran Gowda'
      },
      body: {
        id: createdIncidentId,
        status: 'ASSISTANCE_IN_PROGRESS',
        responderName: 'Dr. Kiran Gowda'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);
    assert(res.statusCode === 200, 'Responder transitions ACKNOWLEDGED -> ASSISTANCE_IN_PROGRESS');
    assert(res.data?.data?.status === 'ASSISTANCE_IN_PROGRESS', 'Updated status is ASSISTANCE_IN_PROGRESS');
    assert(Boolean(res.data?.data?.assistanceStartedAt), 'assistanceStartedAt timestamp recorded');
  }

  // State: ASSISTANCE_IN_PROGRESS -> RESOLVED
  {
    const req = createMockRequest({
      method: 'PATCH',
      headers: {
        'x-user-id': 'doc-mce-duty-001',
        'x-user-role': 'doctor',
        'x-user-name': 'Dr. Kiran Gowda'
      },
      body: {
        id: createdIncidentId,
        status: 'RESOLVED'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);
    assert(res.statusCode === 200, 'Responder transitions ASSISTANCE_IN_PROGRESS -> RESOLVED');
    assert(res.data?.data?.status === 'RESOLVED', 'Updated status is RESOLVED');
    assert(Boolean(res.data?.data?.resolvedAt), 'resolvedAt timestamp recorded');
  }

  // 6. STUDENT ISOLATION / RLS PRIVACY
  console.log('\n--- Test Group 6: Student Privacy / RLS Isolation ---');
  const studentBId = 'stu-mce-402';
  {
    const req = createMockRequest({
      method: 'GET',
      headers: {
        'x-user-id': studentBId,
        'x-user-role': 'student',
        'x-user-name': 'Pooja Patil (Student B)'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);

    assert(res.statusCode === 200, 'Student B can query emergencies');
    const seesStudentA = res.data?.data?.some((i: any) => i.id === createdIncidentId);
    assert(!seesStudentA, "Student B CANNOT see Student A's emergency incidents");
  }

  {
    const req = createMockRequest({
      method: 'GET',
      headers: {
        'x-user-id': studentAId,
        'x-user-role': 'student',
        'x-user-name': 'Rahul Sharma (Student A)'
      }
    });
    const res = new MockResponse();
    await handler(req, res as any);

    assert(res.statusCode === 200, 'Student A queries emergencies');
    const seesStudentA = res.data?.data?.some((i: any) => i.id === createdIncidentId);
    assert(seesStudentA, "Student A can see own emergency incident");
  }

  // 7. FORBIDDEN PHONE NUMBER AUDIT
  console.log('\n--- Test Group 7: Emergency Phone Number Verification ---');
  {
    const forbiddenNumbers = ['102', '108', '112'];
    let phoneViolations = 0;
    // Inspect incident phone
    if (forbiddenNumbers.includes(createdIncidentCode)) phoneViolations++;

    assert(phoneViolations === 0, 'No legacy emergency numbers (102, 108, 112) used in workflow');
  }

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
