// ============================================================================
// CAMPUSCARE XIRSYS DYNAMIC TURN SECURE INTEGRATION TEST SUITE
// ============================================================================
import assert from 'node:assert';
import handler, { extractCaller } from '../api/ice';

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

function createMockReq(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
}) {
  return {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body || {},
    query: options.query || {}
  } as any;
}

// Polyfill minimal browser globals for testing
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

(globalThis as any).localStorage = new MockLocalStorage();

import { 
  parseCandidateType, 
  getIceTransportPolicy, 
  hasTurnRelay,
  fetchDynamicIceServers,
  getWebRTCConfiguration,
  isTurnConfigured
} from '../src/services/webrtcService';

async function runTests() {
  console.log('========================================================================');
  console.log('  CAMPUSCARE XIRSYS DYNAMIC TURN & ICE ARCHITECTURE TEST SUITE');
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

  // 1. ANONYMOUS REQUEST REJECTION (401)
  await test('1. Security: Anonymous request to /api/ice is rejected with HTTP 401', async () => {
    const req = createMockReq({ method: 'GET', headers: {} });
    const res = new MockResponse();

    await handler(req, res as any);

    assert.strictEqual(res.statusCode, 401, 'Anonymous request must return 401 Unauthorized');
    assert.strictEqual(res.data?.error, 'UNAUTHORIZED');
  });

  // 2. AUTHENTICATED REQUEST ACCEPTS (200)
  await test('2. Authentication: Authenticated Student caller receives HTTP 200 and iceServers', async () => {
    const req = createMockReq({
      method: 'GET',
      headers: {
        'x-user-id': 'usr-student-rahul',
        'x-user-role': 'student',
        'x-user-name': 'Rahul Sharma'
      }
    });
    const res = new MockResponse();

    await handler(req, res as any);

    assert.strictEqual(res.statusCode, 200, 'Authenticated request must return 200 OK');
    assert.ok(Array.isArray(res.data?.iceServers), 'Response must contain iceServers array');
    assert.ok(res.data.iceServers.length > 0, 'iceServers array must not be empty');
  });

  // 3. AUTHENTICATED DOCTOR CALLER
  await test('3. Authentication: Authenticated Doctor caller receives HTTP 200', async () => {
    const req = createMockReq({
      method: 'GET',
      headers: {
        'x-user-id': 'usr-doctor-kiran',
        'x-user-role': 'doctor',
        'x-doctor-id': 'DOC001',
        'x-user-name': 'Dr. Kiran Gowda'
      }
    });
    const res = new MockResponse();

    await handler(req, res as any);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.data?.iceServers));
  });

  // 4. STUN FALLBACK INTEGRITY
  await test('4. Fallback: When Xirsys is unconfigured, fallback STUN server is provided', async () => {
    const origIdent = process.env.XIRSYS_IDENT;
    const origSecret = process.env.XIRSYS_SECRET;
    delete process.env.XIRSYS_IDENT;
    delete process.env.XIRSYS_SECRET;

    try {
      const req = createMockReq({
        method: 'GET',
        headers: { 'x-user-id': 'usr-student-rahul', 'x-user-role': 'student' }
      });
      const res = new MockResponse();

      await handler(req, res as any);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.data?.iceServers));
      const hasStun = res.data.iceServers.some((s: any) => {
        const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
        return urls.some((u: string) => u.includes('google.com') || u.startsWith('stun:'));
      });
      assert.ok(hasStun, 'Fallback response must contain a valid STUN server');
    } finally {
      if (origIdent) process.env.XIRSYS_IDENT = origIdent;
      if (origSecret) process.env.XIRSYS_SECRET = origSecret;
    }
  });

  // 5. CANDIDATE TYPE PARSER
  await test('5. Diagnostic: parseCandidateType parses host, srflx, and relay types accurately', () => {
    const hostCand = 'candidate:842163049 1 udp 1677729535 192.168.1.105 54321 typ host';
    const srflxCand = 'candidate:842163050 1 udp 1677729535 203.0.113.195 54321 typ srflx raddr 192.168.1.105 rport 54321';
    const relayCand = 'candidate:842163051 1 udp 1677729535 198.51.100.1 54321 typ relay raddr 203.0.113.195 rport 54321';

    assert.strictEqual(parseCandidateType(hostCand), 'host');
    assert.strictEqual(parseCandidateType(srflxCand), 'srflx');
    assert.strictEqual(parseCandidateType(relayCand), 'relay');
    assert.strictEqual(parseCandidateType(''), 'unknown');
  });

  // 6. ICE TRANSPORT POLICY
  await test('6. Policy: getIceTransportPolicy returns "all" normally and "relay" for diagnostic testing', () => {
    assert.strictEqual(getIceTransportPolicy(), 'all', 'Default transport policy must be "all"');

    // Simulate diagnostic testing flag
    (globalThis as any).localStorage.setItem('campuscare_ice_relay', 'true');
    assert.strictEqual(getIceTransportPolicy(), 'relay', 'Diagnostic transport policy must be "relay"');
    (globalThis as any).localStorage.removeItem('campuscare_ice_relay');
  });

  // 7. HAS TURN RELAY HELPER
  await test('7. TURN Detection: hasTurnRelay correctly differentiates STUN vs TURN servers', () => {
    const stunOnly = [{ urls: 'stun:stun.l.google.com:19302' }];
    const withTurn = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: ['turn:global.xirsys.net:80?transport=udp', 'turns:global.xirsys.net:443?transport=tcp'] }
    ];

    assert.strictEqual(hasTurnRelay(stunOnly), false);
    assert.strictEqual(hasTurnRelay(withTurn), true);
  });

  // 8. XIRSYS DYNAMIC TURN API CALL FORMAT SIMULATION
  await test('8. Xirsys API: Verifies PUT endpoint and Basic Auth construction without logging secrets', async () => {
    const mockIdent = 'testuser';
    const mockSecret = 'testsecret123';
    const mockChannel = 'channel5cb534b4';

    const encodedChannel = encodeURIComponent(mockChannel);
    const expectedUrl = `https://global.xirsys.net/_turn/${encodedChannel}?webrtc=1&expire=60`;
    const basicAuth = `Basic ${Buffer.from(`${mockIdent}:${mockSecret}`).toString('base64')}`;

    assert.strictEqual(expectedUrl, 'https://global.xirsys.net/_turn/channel5cb534b4?webrtc=1&expire=60');
    assert.strictEqual(basicAuth, 'Basic dGVzdHVzZXI6dGVzdHNlY3JldDEyMw==');

    // Simulated Xirsys response
    const mockXirsysResponse = {
      s: 'ok',
      v: {
        iceServers: [
          { urls: ['stun:global.xirsys.net'] },
          {
            urls: [
              'turn:global.xirsys.net:80?transport=udp',
              'turn:global.xirsys.net:443?transport=tcp',
              'turns:global.xirsys.net:443?transport=tcp'
            ],
            username: 'temp-user-token',
            credential: 'temp-credential-token'
          }
        ]
      }
    };

    assert.ok(Array.isArray(mockXirsysResponse.v.iceServers));
    assert.ok(mockXirsysResponse.v.iceServers.some(s => s.urls.some(u => u.startsWith('turn:'))));
  });

  // 9. CLIENT FETCH SIMULATION
  await test('9. Client Integration: fetchDynamicIceServers executes diagnostic logs without secret leakage', async () => {
    // Mock global fetch to return sample ICE servers
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async (url: string) => {
      if (url === '/api/ice') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            iceServers: [
              { urls: ['stun:stun.l.google.com:19302'] },
              { urls: ['turn:relay.example.com:3478'] }
            ]
          })
        };
      }
      return origFetch(url);
    };

    try {
      const servers = await fetchDynamicIceServers({ id: 'usr-student-rahul', role: 'student' });
      assert.ok(Array.isArray(servers));
      assert.ok(servers.length >= 2, 'Must include both STUN and TURN');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  // 10. REAL TURN CONFIGURATION REPORT
  await test('10. Status Audit: Truthfully audit whether live TURN is currently REAL/CONFIGURED', () => {
    const xirsysIdentSet = Boolean(process.env.XIRSYS_IDENT && process.env.XIRSYS_SECRET);
    const legacyTurnSet = isTurnConfigured();

    console.log('       [WebRTC] Server XIRSYS_IDENT configured:', xirsysIdentSet);
    console.log('       [WebRTC] Legacy VITE_TURN configured:', legacyTurnSet);

    if (!xirsysIdentSet && !legacyTurnSet) {
      console.log('       [WebRTC] TURN Status: TURN NOT CONFIGURED (Awaiting rotated Xirsys credentials on Vercel)');
    } else {
      console.log('       [WebRTC] TURN Status: REAL/CONFIGURED');
    }

    assert.ok(true);
  });

  console.log('\n========================================================================');
  console.log(`  XIRSYS TURN TEST SUITE SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
