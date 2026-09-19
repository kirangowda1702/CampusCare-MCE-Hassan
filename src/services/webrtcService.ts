import { supabase, isSupabaseConfigured } from './supabase';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
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

  return { iceServers };
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

export class RealtimeSignalingChannel {
  private channelName: string;
  private channel: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private onMessageCallback: SignalingCallback | null = null;
  private currentUserId: string;
  private currentUserRole?: string;
  private currentUserName?: string;
  private isSubscribed: boolean = false;
  private outboxQueue: SignalPayload[] = [];
  private seenMessageIds: Set<string> = new Set();

  constructor(appointmentId: string, currentUserId: string, currentUserRole?: string, currentUserName?: string) {
    // Canonical room channel name based on appointment identifier
    this.channelName = `teleconsultation:${appointmentId}`;
    this.currentUserId = currentUserId;
    this.currentUserRole = currentUserRole;
    this.currentUserName = currentUserName;

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

  private handleIncomingPayload(payload: SignalPayload, source: string) {
    if (!payload || payload.senderId === this.currentUserId) return;
    
    // Deduplication check
    if (payload.msgId) {
      if (this.seenMessageIds.has(payload.msgId)) return;
      this.seenMessageIds.add(payload.msgId);
      if (this.seenMessageIds.size > 200) {
        const first = this.seenMessageIds.values().next().value;
        if (first) this.seenMessageIds.delete(first);
      }
    }

    console.log(`[WebRTC Signaling via ${source}] Received signal:`, payload.type, 'from:', payload.senderName || payload.senderId);
    if (this.onMessageCallback) {
      this.onMessageCallback(payload);
    }
  }

  public subscribe(callback: SignalingCallback) {
    this.onMessageCallback = callback;

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
              this.isSubscribed = true;
              
              // Flush any queued signals
              while (this.outboxQueue.length > 0) {
                const queued = this.outboxQueue.shift();
                if (queued) {
                  this.dispatchSupabaseSignal(queued);
                }
              }

              // Broadcast presence to room
              this.sendSignal('peer-joined', {
                userId: this.currentUserId,
                role: this.currentUserRole,
                name: this.currentUserName
              });
            } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
              console.warn(`[WebRTC] Supabase Realtime subscription issue (${status}). Retrying channel...`);
            }
          });
      } catch (err) {
        console.warn('[WebRTC] Error configuring Supabase Realtime channel:', err);
      }
    } else {
      console.log('[WebRTC] Supabase Realtime not configured. Operating via local WebRTC BroadcastChannel.');
      // Immediate presence on local broadcast channel
      setTimeout(() => {
        this.sendSignal('peer-joined', {
          userId: this.currentUserId,
          role: this.currentUserRole,
          name: this.currentUserName
        });
      }, 100);
    }
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
  }

  public unsubscribe() {
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
      } catch (e) {
        // ignore
      }
      this.channel = null;
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
