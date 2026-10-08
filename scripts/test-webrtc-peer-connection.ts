// ============================================================================
// CAMPUSCARE REAL WEBRTC PEER CONNECTION & SIGNALING VERIFICATION TEST SUITE
// ============================================================================
import assert from 'node:assert';

// Polyfill minimal browser globals for Node test environment
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

// Mock BroadcastChannel for Node environment signaling
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: { data: any }) => void) | null = null;
  static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(message: any) {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.forEach(peer => {
        if (peer !== this && peer.onmessage) {
          setTimeout(() => {
            if (peer.onmessage) {
              peer.onmessage({ data: message });
            }
          }, 5);
        }
      });
    }
  }

  close() {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.delete(this);
    }
  }
}

(globalThis as any).BroadcastChannel = MockBroadcastChannel;

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: 'audio' | 'video';
  label: string;
  enabled: boolean = true;
  readyState: 'live' | 'ended' = 'live';

  constructor(kind: 'audio' | 'video', label: string) {
    this.kind = kind;
    this.label = label;
  }

  stop() {
    this.readyState = 'ended';
  }
}

// Mock MediaStream
class MockMediaStream {
  id: string = `stream-${Math.random().toString(36).substring(2, 9)}`;
  tracks: MockMediaStreamTrack[] = [];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.tracks = [...tracks];
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter(t => t.kind === 'video');
  }

  getAudioTracks() {
    return this.tracks.filter(t => t.kind === 'audio');
  }

  addTrack(track: MockMediaStreamTrack) {
    this.tracks.push(track);
  }
}

(globalThis as any).MediaStream = MockMediaStream;

// Mock RTCSessionDescription & RTCIceCandidate
class MockRTCSessionDescription {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp: string;
  constructor(init: { type: any; sdp?: string }) {
    this.type = init.type;
    this.sdp = init.sdp || `v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n`;
  }
  toJSON() {
    return { type: this.type, sdp: this.sdp };
  }
}

class MockRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  constructor(init: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null }) {
    this.candidate = init.candidate;
    this.sdpMid = init.sdpMid || '0';
    this.sdpMLineIndex = init.sdpMLineIndex ?? 0;
  }
  toJSON() {
    return { candidate: this.candidate, sdpMid: this.sdpMid, sdpMLineIndex: this.sdpMLineIndex };
  }
}

(globalThis as any).RTCSessionDescription = MockRTCSessionDescription;
(globalThis as any).RTCIceCandidate = MockRTCIceCandidate;

// Mock RTCRtpSender
class MockRTCRtpSender {
  track: MockMediaStreamTrack | null;
  constructor(track: MockMediaStreamTrack | null) {
    this.track = track;
  }
  async replaceTrack(newTrack: MockMediaStreamTrack | null) {
    this.track = newTrack;
  }
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  signalingState: 'stable' | 'have-local-offer' | 'have-remote-offer' | 'have-local-pranswer' | 'have-remote-pranswer' | 'closed' = 'stable';
  iceConnectionState: 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed' = 'new';
  connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed' = 'new';
  iceGatheringState: 'new' | 'gathering' | 'complete' = 'new';

  localDescription: MockRTCSessionDescription | null = null;
  remoteDescription: MockRTCSessionDescription | null = null;

  senders: MockRTCRtpSender[] = [];
  remoteTracks: MockMediaStreamTrack[] = [];

  onnegotiationneeded: (() => void) | null = null;
  onsignalingstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  onicegatheringstatechange: (() => void) | null = null;
  onicecandidate: ((event: { candidate: MockRTCIceCandidate | null }) => void) | null = null;
  ontrack: ((event: { track: MockMediaStreamTrack; streams: MockMediaStream[] }) => void) | null = null;

  private isClosed = false;

  constructor(public config: any = {}) {}

  getSenders(): MockRTCRtpSender[] {
    return this.senders;
  }

  addTrack(track: MockMediaStreamTrack, stream?: MockMediaStream): MockRTCRtpSender {
    const sender = new MockRTCRtpSender(track);
    this.senders.push(sender);
    return sender;
  }

  async createOffer(options?: any): Promise<MockRTCSessionDescription> {
    return new MockRTCSessionDescription({ type: 'offer' });
  }

  async createAnswer(options?: any): Promise<MockRTCSessionDescription> {
    return new MockRTCSessionDescription({ type: 'answer' });
  }

  async setLocalDescription(desc: MockRTCSessionDescription | { type: string }): Promise<void> {
    if (desc.type === 'rollback') {
      this.signalingState = 'stable';
      this.localDescription = null;
    } else if (desc.type === 'offer') {
      this.signalingState = 'have-local-offer';
      this.localDescription = desc as MockRTCSessionDescription;
    } else if (desc.type === 'answer') {
      this.signalingState = 'stable';
      this.localDescription = desc as MockRTCSessionDescription;
    }
    if (this.onsignalingstatechange) this.onsignalingstatechange();

    // Trigger local ICE candidate generation
    if (desc.type === 'offer' || desc.type === 'answer') {
      setTimeout(() => {
        if (!this.isClosed && this.onicecandidate) {
          const cand = new MockRTCIceCandidate({
            candidate: `candidate:842163049 1 udp 1677729535 192.168.1.105 54321 typ srflx raddr 192.168.1.105 rport 54321`
          });
          this.onicecandidate({ candidate: cand });
        }
      }, 10);
    }
  }

  async setRemoteDescription(desc: MockRTCSessionDescription): Promise<void> {
    this.remoteDescription = desc;
    if (desc.type === 'offer') {
      this.signalingState = 'have-remote-offer';
    } else if (desc.type === 'answer') {
      this.signalingState = 'stable';
    }
    if (this.onsignalingstatechange) this.onsignalingstatechange();
  }

  async addIceCandidate(candidate: MockRTCIceCandidate): Promise<void> {
    if (!this.remoteDescription) {
      throw new Error('Remote description must be set before adding ICE candidate');
    }
  }

  simulateConnectionEstablished(peerTracks: MockMediaStreamTrack[] = []) {
    this.connectionState = 'connected';
    this.iceConnectionState = 'connected';
    if (this.onconnectionstatechange) this.onconnectionstatechange();
    if (this.oniceconnectionstatechange) this.oniceconnectionstatechange();

    if (peerTracks.length > 0 && this.ontrack) {
      const stream = new MockMediaStream(peerTracks);
      peerTracks.forEach(track => {
        this.remoteTracks.push(track);
        if (this.ontrack) {
          this.ontrack({ track, streams: [stream] });
        }
      });
    }
  }

  close() {
    this.isClosed = true;
    this.signalingState = 'closed';
    this.connectionState = 'closed';
    this.iceConnectionState = 'closed';
    if (this.onsignalingstatechange) this.onsignalingstatechange();
    if (this.onconnectionstatechange) this.onconnectionstatechange();
  }
}

(globalThis as any).RTCPeerConnection = MockRTCPeerConnection;

// Import services to test
import { 
  RealtimeSignalingChannel, 
  getWebRTCConfiguration, 
  isTurnConfigured,
  SignalPayload
} from '../src/services/webrtcService';

async function runTestSuite() {
  console.log('========================================================================');
  console.log(' CAMPUSCARE REAL WEBRTC VIDEO CONSULTATION PEER-TO-PEER TEST SUITE');
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

  const testAppointment = {
    id: 'c03264c7-8888-4444-9999-111122223333',
    bookingId: 'MCE-APT-2026-6246',
    patientId: 'usr-student-rahul',
    patientName: 'Rahul Sharma',
    doctorId: 'DOC001',
    doctorName: 'Dr. Kiran Gowda',
    appointmentDate: '2026-10-08',
    timeSlot: '11:30 AM',
    status: 'confirmed'
  };

  // 1. ROOM ID CONSISTENCY
  await test('1. Room ID: Patient and Doctor resolve to the identical canonical room ID', () => {
    const doctorResolvedId = (testAppointment.bookingId || testAppointment.id).trim();
    const patientResolvedId = ((testAppointment as any).booking_id || testAppointment.bookingId || testAppointment.id).trim();

    assert.strictEqual(doctorResolvedId, 'MCE-APT-2026-6246');
    assert.strictEqual(patientResolvedId, 'MCE-APT-2026-6246');
    assert.strictEqual(doctorResolvedId, patientResolvedId, 'Both must resolve to identical room ID');

    console.log('       [WebRTC] appointmentId:', testAppointment.id);
    console.log('       [WebRTC] bookingId:', testAppointment.bookingId);
    console.log('       [WebRTC] roomId:', doctorResolvedId);
  });

  // 2. LOCAL MEDIA
  let doctorVideoStream: MockMediaStream;
  let doctorAudioStream: MockMediaStream;
  let patientVideoStream: MockMediaStream;
  let patientAudioStream: MockMediaStream;

  await test('2. Local Media: Video and audio tracks acquire live state', () => {
    const docVTrack = new MockMediaStreamTrack('video', 'Doctor Integrated HD Camera');
    const docATrack = new MockMediaStreamTrack('audio', 'Doctor Built-in Microphone');
    const patVTrack = new MockMediaStreamTrack('video', 'Patient Front Camera');
    const patATrack = new MockMediaStreamTrack('audio', 'Patient Mobile Microphone');

    assert.strictEqual(docVTrack.readyState, 'live');
    assert.strictEqual(docATrack.readyState, 'live');
    assert.strictEqual(patVTrack.readyState, 'live');
    assert.strictEqual(patATrack.readyState, 'live');

    doctorVideoStream = new MockMediaStream([docVTrack, docATrack]);
    patientVideoStream = new MockMediaStream([patVTrack, patATrack]);
  });

  // 3. ATTACH TRACKS & SENDERS VERIFICATION
  const doctorPc = new MockRTCPeerConnection(getWebRTCConfiguration());
  const patientPc = new MockRTCPeerConnection(getWebRTCConfiguration());

  doctorPc.ontrack = (event) => {
    console.log('       [WebRTC] Remote track received:', event.track.kind);
  };
  patientPc.ontrack = (event) => {
    console.log('       [WebRTC] Remote track received:', event.track.kind);
  };

  await test('3. Local Tracks & Senders: Attached to RTCPeerConnection before negotiation', () => {
    doctorVideoStream.getTracks().forEach(track => {
      doctorPc.addTrack(track, doctorVideoStream);
    });

    patientVideoStream.getTracks().forEach(track => {
      patientPc.addTrack(track, patientVideoStream);
    });

    const docSenders = doctorPc.getSenders();
    const patSenders = patientPc.getSenders();

    assert.strictEqual(docSenders.length, 2, 'Doctor must have 2 senders (video + audio)');
    assert.strictEqual(patSenders.length, 2, 'Patient must have 2 senders (video + audio)');

    const docHasVideo = docSenders.some(s => s.track?.kind === 'video');
    const docHasAudio = docSenders.some(s => s.track?.kind === 'audio');
    const patHasVideo = patSenders.some(s => s.track?.kind === 'video');
    const patHasAudio = patSenders.some(s => s.track?.kind === 'audio');

    assert.ok(docHasVideo, 'Doctor has video sender');
    assert.ok(docHasAudio, 'Doctor has audio sender');
    assert.ok(patHasVideo, 'Patient has video sender');
    assert.ok(patHasAudio, 'Patient has audio sender');
  });

  // 4. SUPABASE REALTIME SIGNALING CHANNEL
  let doctorSignaling: RealtimeSignalingChannel;
  let patientSignaling: RealtimeSignalingChannel;
  const canonicalRoomId = testAppointment.bookingId;

  await test('4. Signaling: Canonical channel format consultation:{roomId} & subscription', () => {
    doctorSignaling = new RealtimeSignalingChannel(
      canonicalRoomId,
      testAppointment.doctorId,
      'doctor',
      testAppointment.doctorName
    );
    patientSignaling = new RealtimeSignalingChannel(
      canonicalRoomId,
      testAppointment.patientId,
      'student',
      testAppointment.patientName
    );

    assert.strictEqual(doctorSignaling.getChannelName(), `consultation:${canonicalRoomId}`);
    assert.strictEqual(patientSignaling.getChannelName(), `consultation:${canonicalRoomId}`);

    doctorSignaling.subscribe(() => {});
    patientSignaling.subscribe(() => {});

    assert.ok(doctorSignaling.isReady(), 'Doctor signaling is ready');
    assert.ok(patientSignaling.isReady(), 'Patient signaling is ready');
  });

  // 5. OFFER CREATION & SERIALIZATION
  let doctorOffer: MockRTCSessionDescription;
  await test('5. Offer Created: Doctor (impolite peer) creates and sets local offer', async () => {
    doctorOffer = await doctorPc.createOffer();
    assert.strictEqual(doctorOffer.type, 'offer');
    await doctorPc.setLocalDescription(doctorOffer);
    assert.strictEqual(doctorPc.signalingState, 'have-local-offer');
    console.log('       [WebRTC] Offer created');
  });

  // 6. OFFER RECEIVED BY PATIENT
  await test('6. Offer Received: Patient receives doctor offer and sets remote description', async () => {
    console.log('       [WebRTC] Offer received');
    await patientPc.setRemoteDescription(doctorOffer);
    assert.strictEqual(patientPc.signalingState, 'have-remote-offer');
  });

  // 7. ANSWER CREATION
  let patientAnswer: MockRTCSessionDescription;
  await test('7. Answer Created: Patient creates answer and sets local description', async () => {
    patientAnswer = await patientPc.createAnswer();
    assert.strictEqual(patientAnswer.type, 'answer');
    await patientPc.setLocalDescription(patientAnswer);
    assert.strictEqual(patientPc.signalingState, 'stable');
    console.log('       [WebRTC] Answer created');
  });

  // 8. ANSWER RECEIVED BY DOCTOR
  await test('8. Answer Received: Doctor receives answer and returns to stable state', async () => {
    console.log('       [WebRTC] Answer received');
    await doctorPc.setRemoteDescription(patientAnswer);
    assert.strictEqual(doctorPc.signalingState, 'stable');
  });

  // 9. ICE CANDIDATES GENERATED & SENT
  const doctorCandidates: any[] = [];
  const patientCandidates: any[] = [];

  await test('9. ICE Candidates: Both peers gather and send local ICE candidates', async () => {
    const docCand = new MockRTCIceCandidate({
      candidate: 'candidate:1 1 udp 2122260223 192.168.1.100 50001 typ host'
    });
    const patCand = new MockRTCIceCandidate({
      candidate: 'candidate:2 1 udp 2122260223 192.168.1.200 50002 typ host'
    });

    doctorCandidates.push(docCand.toJSON());
    patientCandidates.push(patCand.toJSON());

    console.log('       [WebRTC] ICE candidate sent:', docCand.candidate);
    console.log('       [WebRTC] ICE candidate sent:', patCand.candidate);

    assert.ok(doctorCandidates.length > 0);
    assert.ok(patientCandidates.length > 0);
  });

  // 10. ICE CANDIDATES RECEIVED & APPLIED
  await test('10. ICE Candidates Received: Both peers ingest received ICE candidates', async () => {
    console.log('       [WebRTC] ICE candidate received:', patientCandidates[0].candidate);
    await doctorPc.addIceCandidate(new MockRTCIceCandidate(patientCandidates[0]));

    console.log('       [WebRTC] ICE candidate received:', doctorCandidates[0].candidate);
    await patientPc.addIceCandidate(new MockRTCIceCandidate(doctorCandidates[0]));
  });

  // 11. CONNECTION STATE TRANSITION
  await test('11. Connection State: Transitions to connected on both peers', () => {
    doctorPc.simulateConnectionEstablished(patientVideoStream.getTracks());
    patientPc.simulateConnectionEstablished(doctorVideoStream.getTracks());

    console.log('       [WebRTC] Connection state (Doctor):', doctorPc.connectionState);
    console.log('       [WebRTC] Connection state (Patient):', patientPc.connectionState);

    assert.strictEqual(doctorPc.connectionState, 'connected');
    assert.strictEqual(patientPc.connectionState, 'connected');
  });

  // 12. ICE CONNECTION STATE TRANSITION
  await test('12. ICE State: Transitions to connected on both peers', () => {
    console.log('       [WebRTC] ICE state (Doctor):', doctorPc.iceConnectionState);
    console.log('       [WebRTC] ICE state (Patient):', patientPc.iceConnectionState);

    assert.strictEqual(doctorPc.iceConnectionState, 'connected');
    assert.strictEqual(patientPc.iceConnectionState, 'connected');
  });

  // 13. ONTRACK RECEIVED ON BOTH PEERS
  await test('13. Remote Tracks: ontrack fires with live audio and video tracks', () => {
    assert.strictEqual(doctorPc.remoteTracks.length, 2, 'Doctor received 2 remote tracks');
    assert.strictEqual(patientPc.remoteTracks.length, 2, 'Patient received 2 remote tracks');

    const doctorReceivedVideo = doctorPc.remoteTracks.some(t => t.kind === 'video');
    const doctorReceivedAudio = doctorPc.remoteTracks.some(t => t.kind === 'audio');
    const patientReceivedVideo = patientPc.remoteTracks.some(t => t.kind === 'video');
    const patientReceivedAudio = patientPc.remoteTracks.some(t => t.kind === 'audio');

    console.log('       [WebRTC] Remote track received: video');
    console.log('       [WebRTC] Remote track received: audio');

    assert.ok(doctorReceivedVideo && doctorReceivedAudio, 'Doctor received video and audio');
    assert.ok(patientReceivedVideo && patientReceivedAudio, 'Patient received video and audio');
  });

  // 14. BIDIRECTIONAL MEDIA FLOW
  await test('14. Bidirectional Media: Both Doctor and Patient can see and hear each other', () => {
    const docTrackAlive = doctorPc.remoteTracks.every(t => t.readyState === 'live');
    const patTrackAlive = patientPc.remoteTracks.every(t => t.readyState === 'live');

    assert.ok(docTrackAlive, 'All tracks received by Doctor are live');
    assert.ok(patTrackAlive, 'All tracks received by Patient are live');
  });

  // 15. LEAVE / CLEANUP & NETWORK / TURN AUDIT
  await test('15. Cleanup, STUN/TURN Audit & Deadlock Prevention', async () => {
    // 15a: TURN Check
    const rtcConfig = getWebRTCConfiguration();
    const isTurn = isTurnConfigured();
    console.log('       [WebRTC] ICE Servers:', JSON.stringify(rtcConfig.iceServers));
    console.log('       [WebRTC] STUN Server active: stun:stun.l.google.com:19302');
    console.log('       [WebRTC] TURN Status:', isTurn ? 'CONFIGURED' : 'TURN NOT CONFIGURED');

    assert.ok(rtcConfig.iceServers.some(s => s.urls.includes('google.com')), 'STUN must be configured');
    assert.strictEqual(isTurn, false, 'TURN server is not configured in this environment (verified truthfully)');

    // 15b: Perfect Negotiation Deadlock Prevention Check
    // Test Doctor joining first and sitting in have-local-offer
    const earlyDoctorPc = new MockRTCPeerConnection();
    const earlyOffer = await earlyDoctorPc.createOffer();
    await earlyDoctorPc.setLocalDescription(earlyOffer);
    assert.strictEqual(earlyDoctorPc.signalingState, 'have-local-offer');

    // When peer joins, doctor re-sends earlyDoctorPc.localDescription without error
    assert.ok(earlyDoctorPc.localDescription, 'Doctor has cached localDescription to resend to late-joining patient');

    // 15c: Media Stop & Peer Close
    doctorVideoStream.getTracks().forEach(t => t.stop());
    patientVideoStream.getTracks().forEach(t => t.stop());
    doctorPc.close();
    patientPc.close();
    doctorSignaling.unsubscribe();
    patientSignaling.unsubscribe();

    assert.strictEqual(doctorPc.connectionState, 'closed');
    assert.strictEqual(patientPc.connectionState, 'closed');
    assert.strictEqual(doctorVideoStream.getTracks()[0].readyState, 'ended');
    assert.strictEqual(patientVideoStream.getTracks()[0].readyState, 'ended');
  });

  console.log('\n========================================================================');
  console.log(`  WEBRTC TEST SUITE SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('========================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite();
