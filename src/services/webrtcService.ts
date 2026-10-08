import { supabase, isSupabaseConfigured } from './supabase';
import { getAuthHeaders } from './appointmentService';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

export function parseCandidateType(candidateStr?: string): string {
  if (!candidateStr) return 'unknown';
  const match = candidateStr.match(/\btyp\s+([a-zA-Z0-9]+)\b/i);
  return match ? match[1].toLowerCase() : 'unknown';
}

export function getIceTransportPolicy(): RTCIceTransportPolicy {
  if (typeof window !== 'undefined') {
    const search = window.location.search || '';
    if (search.includes('relay=true') || search.includes('policy=relay')) {
      return 'relay';
    }
  }
  if (typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem('campuscare_ice_relay') === 'true') {
        return 'relay';
      }
    } catch {}
  }
  return 'all';
}

export function hasTurnRelay(iceServers: RTCIceServer[]): boolean {
  if (!Array.isArray(iceServers)) return false;
  return iceServers.some(s => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some(u => typeof u === 'string' && (u.startsWith('turn:') || u.startsWith('turns:')));
  });
}

export function getWebRTCConfiguration(): WebRTCConfig {
  const env: any = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env
    : (typeof process !== 'undefined' && process.env ? process.env : {});

  const stunServer = env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302';
  const turnServer = env.VITE_TURN_SERVER;
  const turnUsername = env.VITE_TURN_USERNAME;
  const turnCredential = env.VITE_TURN_CREDENTIAL;

  const iceServers: RTCIceServer[] = [
    { urls: stunServer }
  ];

  if (turnServer && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnServer,
      username: turnUsername,
      credential: turnCredential
    });
  }

  const transportPolicy = getIceTransportPolicy();
  return { iceServers, iceTransportPolicy: transportPolicy };
}

export async function fetchDynamicIceServers(userContext?: any): Promise<RTCIceServer[]> {
  console.log('[WebRTC] TURN_FETCH_START');
  const defaultStun = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STUN_SERVER) ||
    'stun:stun.l.google.com:19302'
  );

  try {
    if (typeof fetch !== 'undefined') {
      const headers = await getAuthHeaders(userContext);
      const res = await fetch('/api/ice', {
        method: 'GET',
        headers,
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          console.log('[WebRTC] TURN_FETCH_SUCCESS');
          console.log('[WebRTC] ICE_SERVER_COUNT:', data.iceServers.length);

          // Ensure fallback STUN server is present in the list
          const hasStun = data.iceServers.some((s: any) => {
            const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
            return urls.some((u: string) => typeof u === 'string' && u.startsWith('stun:'));
          });

          const finalServers: RTCIceServer[] = hasStun
            ? data.iceServers
            : [{ urls: defaultStun }, ...data.iceServers];

          return finalServers;
        }
      }
      console.warn('[WebRTC] TURN_FETCH_FAILED (HTTP status:', res.status, ')');
    }
  } catch (err: any) {
    console.warn('[WebRTC] TURN_FETCH_FAILED:', err?.message || 'Network error');
  }

  // Fallback to static configuration
  const fallback = getWebRTCConfiguration().iceServers;
  console.log('[WebRTC] ICE_SERVER_COUNT:', fallback.length, '(Fallback STUN)');
  return fallback;
}

export function isTurnConfigured(): boolean {
  const env: any = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env
    : (typeof process !== 'undefined' && process.env ? process.env : {});

  return Boolean(env.VITE_TURN_SERVER && env.VITE_TURN_USERNAME && env.VITE_TURN_CREDENTIAL);
}

export type SignalType = 
  | 'peer-joined' 
  | 'peer-presence'
  | 'offer' 
  | 'answer' 
  | 'candidate' 
  | 'hangup' 
  | 'peer-left' 
  | 'end-consultation'
  | 'ping';

export interface SignalPayload {
  msgId?: string;
  type: SignalType;
  data?: any;
  senderId: string;
  senderRole?: string;
  senderName?: string;
  timestamp?: string;
}

export type SignalingCallback = (payload: SignalPayload) => void;
export type SignalingStatusCallback = (status: string, err?: any) => void;

export class RealtimeSignalingChannel {
  private roomId: string;
  private channelName: string;
  private channel: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private onMessageCallback: SignalingCallback | null = null;
  private onStatusCallback: SignalingStatusCallback | null = null;
  private currentUserId: string;
  private currentUserRole?: string;
  private currentUserName?: string;
  private isSubscribed: boolean = false;
  private isPeerConnected: boolean = false;
  private outboxQueue: SignalPayload[] = [];
  private seenMessageIds: Set<string> = new Set();
  private pollInterval: any = null;
  private heartbeatInterval: any = null;
  private lastPollTime: number = Date.now() - 30000;

  constructor(roomId: string, currentUserId: string, currentUserRole?: string, currentUserName?: string) {
    const cleanRoomId = (roomId || 'default-room').trim();
    this.roomId = cleanRoomId;
    this.channelName = `consultation:${cleanRoomId}`;
    this.currentUserId = currentUserId;
    this.currentUserRole = currentUserRole;
    this.currentUserName = currentUserName;

    console.log('[WebRTC] SIGNALING_CHANNEL:', this.channelName);

    // Local BroadcastChannel for same-origin multi-tab/window testing
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event) => {
          if (event && event.data) {
            this.handleIncomingPayload(event.data, 'BroadcastChannel');
          }
        };
      } catch (err) {
        console.warn('[WebRTC Signaling] BroadcastChannel unavailable:', err);
      }
    }
  }

  public isReady(): boolean {
    return this.isSubscribed || Boolean(this.broadcastChannel);
  }

  public getChannelName(): string {
    return this.channelName;
  }

  public setPeerConnected(connected: boolean) {
    this.isPeerConnected = connected;
    if (connected && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleIncomingPayload(payload: SignalPayload, source: string) {
    if (!payload || payload.senderId === this.currentUserId) return;
    
    // Deduplication check
    if (payload.msgId) {
      if (this.seenMessageIds.has(payload.msgId)) return;
      this.seenMessageIds.add(payload.msgId);
      if (this.seenMessageIds.size > 300) {
        const first = this.seenMessageIds.values().next().value;
        if (first) this.seenMessageIds.delete(first);
      }
    }

    console.log(`[WebRTC Signaling via ${source}] Received signal:`, payload.type, 'from:', payload.senderName || payload.senderId);
    if (payload.type === 'peer-presence') {
      console.log('[WebRTC] PEER_PRESENCE_RECEIVED');
    }
    if (this.onMessageCallback) {
      this.onMessageCallback(payload);
    }
  }

  public subscribe(callback: SignalingCallback, onStatusChange?: SignalingStatusCallback) {
    this.onMessageCallback = callback;
    this.onStatusCallback = onStatusChange || null;

    const onChannelReady = () => {
      if (this.isSubscribed) return;
      this.isSubscribed = true;
      console.log('[WebRTC] CHANNEL_SUBSCRIBED:', this.channelName);
      console.log('[WebRTC] PRESENCE_STARTED');
      if (this.onStatusCallback) {
        this.onStatusCallback('SUBSCRIBED');
      }

      // Flush queued signals
      while (this.outboxQueue.length > 0) {
        const queued = this.outboxQueue.shift();
        if (queued) {
          this.dispatchSupabaseSignal(queued);
        }
      }

      // Proactively broadcast presence
      this.sendSignal('peer-joined', {
        userId: this.currentUserId,
        role: this.currentUserRole,
        name: this.currentUserName
      });
    };

    // 1. Setup Supabase Realtime channel if configured
    if (isSupabaseConfigured) {
      try {
        this.channel = supabase.channel(this.channelName, {
          config: { broadcast: { self: false } }
        });

        this.channel
          .on('broadcast', { event: 'signal' }, (event: any) => {
            if (event?.payload) {
              this.handleIncomingPayload(event.payload, 'Supabase Realtime');
            }
          })
          .subscribe((status: string, err?: any) => {
            console.log(`[WebRTC] Supabase Realtime subscription status [${this.channelName}]:`, status, err || '');
            if (status === 'SUBSCRIBED') {
              onChannelReady();
            } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
              console.warn(`[WebRTC] Supabase Realtime subscription issue (${status}). Falling back to cloud signaling relay.`);
              onChannelReady();
            }
          });
      } catch (err) {
        console.warn('[WebRTC] Error configuring Supabase Realtime channel:', err);
        onChannelReady();
      }
    }

    // Safety fallback: If not yet subscribed after 1000ms, mark ready via relay
    setTimeout(() => {
      onChannelReady();
    }, 1000);

    // 2. Setup Serverless Cloud Signaling Relay Polling (Ensures cross-network arrival)
    this.startRelayPolling();

    // 3. Proactive Presence Heartbeat while waiting for peer connection
    this.heartbeatInterval = setInterval(() => {
      if (!this.isPeerConnected && this.isSubscribed) {
        this.sendSignal('peer-presence', {
          userId: this.currentUserId,
          role: this.currentUserRole,
          name: this.currentUserName
        });
      }
    }, 2500);
  }

  private startRelayPolling() {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;

    this.pollInterval = setInterval(async () => {
      if (this.isPeerConnected) {
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
        return;
      }

      try {
        const userCtx = {
          id: this.currentUserId,
          role: this.currentUserRole,
          fullName: this.currentUserName
        };
        const headers = await getAuthHeaders(userCtx);
        const res = await fetch(`/api/appointments?action=signal_poll&roomId=${encodeURIComponent(this.roomId)}&since=${this.lastPollTime}`, {
          method: 'GET',
          headers,
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.serverTime) {
            this.lastPollTime = Math.max(this.lastPollTime, data.serverTime - 500);
          }
          if (Array.isArray(data?.signals)) {
            data.signals.forEach((sig: SignalPayload) => {
              this.handleIncomingPayload(sig, 'Cloud Relay');
            });
          }
        }
      } catch (e) {
        // quiet retry
      }
    }, 1200);
  }

  private dispatchSupabaseSignal(payload: SignalPayload) {
    if (this.channel && isSupabaseConfigured) {
      this.channel.send({
        type: 'broadcast',
        event: 'signal',
        payload
      }).catch((e: any) => {
        console.warn('[WebRTC] Supabase broadcast send error:', e);
      });
    }
  }

  private dispatchRelaySignal(payload: SignalPayload) {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    const userCtx = {
      id: this.currentUserId,
      role: this.currentUserRole,
      fullName: this.currentUserName
    };
    getAuthHeaders(userCtx).then(headers => {
      fetch('/api/appointments', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'signal_send',
          roomId: this.roomId,
          payload
        }),
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
      }).catch(() => {
        // quiet retry
      });
    }).catch(() => {});
  }

  public sendSignal(type: SignalType, data?: any) {
    const payload: SignalPayload = {
      msgId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      data,
      senderId: this.currentUserId,
      senderRole: this.currentUserRole,
      senderName: this.currentUserName,
      timestamp: new Date().toISOString()
    };

    if (payload.msgId) {
      this.seenMessageIds.add(payload.msgId);
    }

    console.log('[WebRTC Signaling] Sending signal:', type, 'sender:', this.currentUserName || this.currentUserId);
    if (type === 'peer-presence') {
      console.log('[WebRTC] PEER_PRESENCE_SENT');
    }

    // 1. Send via local BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('[WebRTC] BroadcastChannel send error:', err);
      }
    }

    // 2. Send via Supabase Realtime
    if (isSupabaseConfigured) {
      if (this.isSubscribed) {
        this.dispatchSupabaseSignal(payload);
      } else {
        this.outboxQueue.push(payload);
      }
    }

    // 3. Send via Serverless Cloud Signaling Relay
    this.dispatchRelaySignal(payload);
  }

  public unsubscribe() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    try {
      this.sendSignal('peer-left', { userId: this.currentUserId });
    } catch (e) {
      // ignore
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
        this.broadcastChannel = null;
      } catch (e) {
        // ignore
      }
    }

    if (this.channel && isSupabaseConfigured) {
      try {
        supabase.removeChannel(this.channel);
        this.channel = null;
      } catch (e) {
        // ignore
      }
      this.isSubscribed = false;
    }
  }
}

export interface ConsultationSessionRecord {
  id?: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  status: 'started' | 'connected' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export const consultationSessionService = {
  async recordSessionStart(appointmentId: string, patientId: string, doctorId: string): Promise<string | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('consultation_sessions')
        .insert([{
          appointment_id: appointmentId,
          patient_id: patientId,
          doctor_id: doctorId,
          status: 'connected',
          started_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        console.warn('Could not record consultation session start in DB:', error.message);
        return null;
      }
      return data?.id || null;
    } catch (err) {
      console.warn('Session start recording error:', err);
      return null;
    }
  },

  async recordSessionEnd(sessionId: string | null, appointmentId: string, durationSeconds: number): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      if (sessionId) {
        await supabase
          .from('consultation_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      } else {
        await supabase
          .from('consultation_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
            updated_at: new Date().toISOString()
          })
          .eq('appointment_id', appointmentId);
      }
    } catch (err) {
      console.warn('Session end recording error:', err);
    }
  }
};
