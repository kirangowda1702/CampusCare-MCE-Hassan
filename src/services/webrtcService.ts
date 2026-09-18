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
  | 'offer' 
  | 'answer' 
  | 'candidate' 
  | 'hangup' 
  | 'peer-left' 
  | 'end-consultation'
  | 'ping';

export interface SignalPayload {
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
  private onMessageCallback: SignalingCallback | null = null;
  private currentUserId: string;
  private currentUserRole?: string;
  private currentUserName?: string;

  constructor(appointmentId: string, currentUserId: string, currentUserRole?: string, currentUserName?: string) {
    this.channelName = `teleconsultation:${appointmentId}`;
    this.currentUserId = currentUserId;
    this.currentUserRole = currentUserRole;
    this.currentUserName = currentUserName;
  }

  public subscribe(callback: SignalingCallback) {
    this.onMessageCallback = callback;

    if (isSupabaseConfigured) {
      this.channel = supabase.channel(this.channelName, {
        config: { broadcast: { self: false } }
      });

      this.channel
        .on('broadcast', { event: 'signal' }, (event: any) => {
          if (this.onMessageCallback && event.payload) {
            this.onMessageCallback(event.payload);
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            // Broadcast initial presence announcement
            this.sendSignal('peer-joined', {
              userId: this.currentUserId,
              role: this.currentUserRole,
              name: this.currentUserName
            });
          }
        });
    }
  }

  public sendSignal(type: SignalType, data?: any) {
    if (this.channel && isSupabaseConfigured) {
      this.channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type,
          data,
          senderId: this.currentUserId,
          senderRole: this.currentUserRole,
          senderName: this.currentUserName,
          timestamp: new Date().toISOString()
        } as SignalPayload
      });
    }
  }

  public unsubscribe() {
    if (this.channel && isSupabaseConfigured) {
      try {
        this.sendSignal('peer-left', { userId: this.currentUserId });
      } catch (e) {
        // channel may already be closing
      }
      supabase.removeChannel(this.channel);
      this.channel = null;
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
