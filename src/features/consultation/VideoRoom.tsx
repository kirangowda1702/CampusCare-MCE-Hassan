import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  MessageSquare,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  Radio,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { Appointment, ChatMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { PrescriptionModal } from '../prescriptions/PrescriptionModal';
import { useNavigate } from 'react-router-dom';
import { 
  RealtimeSignalingChannel, 
  getWebRTCConfiguration, 
  isTurnConfigured,
  consultationSessionService,
  SignalPayload 
} from '../../services/webrtcService';
import { appointmentService } from '../../services/appointmentService';
import { chatService } from '../../services/chatService';

interface VideoRoomProps {
  appointment: Appointment;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({ appointment }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const isDoctor = role === 'doctor';

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasRealStream, setHasRealStream] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerLeft, setPeerLeft] = useState(false);
  const [signalingStatus, setSignalingStatus] = useState<string>('Initializing WebRTC Room...');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<RealtimeSignalingChannel | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const sessionDurationRef = useRef(0);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'info'>('chat');
  const [doctorNotes, setDoctorNotes] = useState(
    appointment.notes || 'Patient symptoms: ' + (appointment.symptoms?.join(', ') || 'Routine consultation')
  );
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  // Keep sessionDurationRef updated for cleanup
  useEffect(() => {
    sessionDurationRef.current = seconds;
  }, [seconds]);

  // 1. Session Duration Timer: Ticks ONLY when peer is connected
  useEffect(() => {
    let timer: any = null;
    if (peerConnected) {
      timer = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [peerConnected]);

  // 2. In-call Chat: Load history and subscribe to realtime messages
  useEffect(() => {
    chatService.getMessages(appointment.id).then(msgs => {
      if (msgs.length > 0) {
        setChatMessages(msgs);
      } else {
        setChatMessages([
          {
            id: 'init-msg',
            senderId: appointment.doctorId,
            senderName: appointment.doctorName,
            senderRole: 'doctor',
            text: `Consultation session opened for appointment ${appointment.bookingId}. Feel free to share symptoms or medical queries.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    });

    const unsubscribe = chatService.subscribeToMessages(appointment.id, msg => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [appointment.id, appointment.doctorId, appointment.doctorName, appointment.bookingId]);

  // Helper: Flush queued ICE candidates after remote description is set
  const processQueuedCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('Error adding queued ICE candidate:', err);
        }
      }
    }
  };

  // Helper: Start or acquire local media
  const startLocalMedia = async (): Promise<MediaStream | null> => {
    try {
      setMediaError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasRealStream(true);
        return stream;
      } else {
        setMediaError('MediaDevices API not available in this browser or environment.');
        return null;
      }
    } catch (err: any) {
      console.warn('getUserMedia error:', err);
      let errorMsg = 'Could not access camera or microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera and microphone permissions were denied. Please enable device permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera or microphone hardware found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Hardware device is currently in use by another application.';
      }
      setMediaError(errorMsg);
      setHasRealStream(false);
      return null;
    }
  };

  // Helper: Format doctor name without duplication
  const doctorDisplayName = appointment.doctorName?.startsWith('Dr.') || appointment.doctorName?.startsWith('Dr ')
    ? appointment.doctorName
    : `Dr. ${appointment.doctorName}`;

  // 3. WebRTC Peer Connection & Realtime Signaling (Perfect Negotiation Pattern)
  useEffect(() => {
    const currentUserId = user?.id || `usr-${Date.now()}`;
    const currentUserName = user?.fullName || (isDoctor ? appointment.doctorName : appointment.patientName);
    const currentUserRole = role || (isDoctor ? 'doctor' : 'student');

    console.log(`[WebRTC] Initializing consultation room for appointment: ${appointment.id} (${appointment.bookingId}) as ${currentUserRole} (${currentUserName})`);

    const signaling = new RealtimeSignalingChannel(
      appointment.id,
      currentUserId,
      currentUserRole,
      currentUserName
    );
    signalingRef.current = signaling;

    const rtcConfig = getWebRTCConfiguration();
    const isTurnPresent = isTurnConfigured();
    console.log('[WebRTC] WebRTC Config initialized. TURN Status:', isTurnPresent ? 'CONFIGURED' : 'TURN server not configured (STUN active)');

    let pc: RTCPeerConnection | null = null;
    let isMakingOffer = false;
    let isIgnoringOffer = false;
    let isSettingRemoteAnswerPending = false;
    // Doctor is impolite peer (primary caller), Student/Patient is polite peer
    const isPolite = !isDoctor;

    try {
      pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Log all WebRTC lifecycle state transitions
      pc.onsignalingstatechange = () => {
        console.log('[WebRTC] signalingState:', pc?.signalingState);
      };

      pc.onicegatheringstatechange = () => {
        console.log('[WebRTC] iceGatheringState:', pc?.iceGatheringState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] iceConnectionState:', pc?.iceConnectionState);
        if (pc?.iceConnectionState === 'connected' || pc?.iceConnectionState === 'completed') {
          setPeerConnected(true);
          setPeerLeft(false);
          setSignalingStatus('Live Encrypted P2P Stream Established');
        } else if (pc?.iceConnectionState === 'failed') {
          setPeerConnected(false);
          setSignalingStatus('ICE Connection Failed (TURN server required for symmetric NAT)');
        } else if (pc?.iceConnectionState === 'disconnected') {
          setPeerConnected(false);
          setSignalingStatus('Peer Disconnected — Awaiting Reconnection');
        }
      };

      // Connection State Handler
      pc.onconnectionstatechange = () => {
        if (!pc) return;
        const state = pc.connectionState;
        console.log('[WebRTC] connectionState:', state);
        if (state === 'connected') {
          setPeerConnected(true);
          setPeerLeft(false);
          setSignalingStatus('Live Encrypted P2P Stream Established');

          // Record session start in DB
          consultationSessionService.recordSessionStart(
            appointment.id,
            appointment.patientId,
            appointment.doctorId
          ).then(id => {
            sessionIdRef.current = id;
          });
        } else if (state === 'connecting') {
          setSignalingStatus('Establishing Direct WebRTC Peer Connection...');
        } else if (state === 'disconnected') {
          setPeerConnected(false);
          setSignalingStatus('Connection Interrupted — Reconnecting...');
        } else if (state === 'failed') {
          setPeerConnected(false);
          setSignalingStatus('WebRTC Direct Connection Failed (STUN/TURN required)');
        } else if (state === 'closed') {
          setPeerConnected(false);
          setSignalingStatus('Consultation Closed');
        }
      };

      // ICE Candidate Handler
      pc.onicecandidate = event => {
        if (event.candidate) {
          console.log('[WebRTC] ICE candidate sent:', event.candidate.candidate);
          signaling.sendSignal('candidate', event.candidate.toJSON());
        }
      };

      // Remote Track Handler
      pc.ontrack = event => {
        console.log('[WebRTC] remote stream received:', event.streams?.[0]?.id, 'Track kind:', event.track.kind);
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setPeerConnected(true);
          setPeerLeft(false);
        }
      };

      // Perfect Negotiation: onnegotiationneeded
      pc.onnegotiationneeded = async () => {
        try {
          if (!pc) return;
          console.log('[WebRTC] onnegotiationneeded fired. isMakingOffer:', isMakingOffer, 'signalingState:', pc.signalingState);
          isMakingOffer = true;
          const offer = await pc.createOffer();
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          console.log('[WebRTC] offer created & sent');
          signaling.sendSignal('offer', pc.localDescription);
        } catch (err) {
          console.warn('[WebRTC] Negotiation offer error:', err);
        } finally {
          isMakingOffer = false;
        }
      };

      // Helper function to trigger offer creation
      const triggerOffer = async () => {
        if (!pc) return;
        try {
          if (pc.signalingState !== 'stable') {
            console.log('[WebRTC] Skipping triggerOffer: signalingState is not stable:', pc.signalingState);
            return;
          }
          isMakingOffer = true;
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          console.log('[WebRTC] offer created & sent via triggerOffer');
          signaling.sendSignal('offer', pc.localDescription);
        } catch (err) {
          console.warn('[WebRTC] triggerOffer error:', err);
        } finally {
          isMakingOffer = false;
        }
      };

      // Signaling message router
      signaling.subscribe(async (payload: SignalPayload) => {
        if (payload.senderId === currentUserId) return;

        try {
          if (payload.type === 'peer-joined') {
            setPeerLeft(false);
            const peerName = payload.senderName || 'Participant';
            setSignalingStatus(`Peer (${peerName}) joined room. Exchanging handshake...`);
            console.log(`[WebRTC] Peer joined: ${peerName} (${payload.senderRole || 'peer'}). Replying with presence...`);
            
            // Acknowledge presence back to the newly joined peer
            signaling.sendSignal('peer-presence', {
              userId: currentUserId,
              role: currentUserRole,
              name: currentUserName
            });

            // If we are the doctor, or have local tracks ready, start offer
            if (isDoctor || (pc && pc.getSenders().length > 0)) {
              setTimeout(() => {
                triggerOffer();
              }, 200);
            }
          } else if (payload.type === 'peer-presence') {
            setPeerLeft(false);
            const peerName = payload.senderName || 'Participant';
            console.log(`[WebRTC] Peer presence confirmed: ${peerName}`);
            setSignalingStatus(`Peer (${peerName}) in room. Starting peer handshake...`);
            
            // If we are the doctor, start offer upon receiving presence
            if (isDoctor && pc) {
              setTimeout(() => {
                triggerOffer();
              }, 200);
            }
          } else if (payload.type === 'offer' && payload.data && pc) {
            console.log('[WebRTC] offer received from:', payload.senderName || payload.senderId);
            setPeerLeft(false);
            
            const offerCollision = isMakingOffer || pc.signalingState !== 'stable';
            isIgnoringOffer = !isPolite && offerCollision;
            if (isIgnoringOffer) {
              console.log('[WebRTC] Impolite peer ignoring colliding offer');
              return;
            }

            if (offerCollision && isPolite) {
              console.log('[WebRTC] Polite peer handling colliding offer via rollback');
              await pc.setLocalDescription({ type: 'rollback' } as any);
            }

            await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
            await processQueuedCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('[WebRTC] answer created & sent to:', payload.senderName || payload.senderId);
            signaling.sendSignal('answer', pc.localDescription);
          } else if (payload.type === 'answer' && payload.data && pc) {
            console.log('[WebRTC] answer received from:', payload.senderName || payload.senderId);
            isSettingRemoteAnswerPending = true;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
            isSettingRemoteAnswerPending = false;
            await processQueuedCandidates(pc);
          } else if (payload.type === 'candidate' && payload.data && pc) {
            console.log('[WebRTC] ICE candidate received from:', payload.senderName || payload.senderId);
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(payload.data));
              } else {
                iceCandidatesQueue.current.push(payload.data);
              }
            } catch (candErr) {
              if (!isIgnoringOffer) {
                console.warn('[WebRTC] Error adding received ICE candidate:', candErr);
              }
            }
          } else if (payload.type === 'peer-left') {
            console.log('[WebRTC] Peer left room:', payload.senderName || payload.senderId);
            setPeerConnected(false);
            setPeerLeft(true);
            setSignalingStatus('The other participant has left the consultation room.');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          } else if (payload.type === 'end-consultation') {
            console.log('[WebRTC] Doctor ended consultation.');
            setPeerConnected(false);
            alert('The doctor has concluded this consultation session. Returning to dashboard.');
            navigate(role === 'doctor' ? '/doctor/dashboard' : '/student/dashboard');
          }
        } catch (err) {
          console.warn('[WebRTC] signaling negotiation error:', err);
        }
      });
    } catch (err) {
      console.warn('[WebRTC] Failed to initialize RTCPeerConnection:', err);
      setSignalingStatus('WebRTC Unsupported or Blocked');
    }

    // Acquire Local Media and attach tracks to RTCPeerConnection
    startLocalMedia().then(stream => {
      if (stream && pc) {
        stream.getTracks().forEach(track => {
          try {
            pc?.addTrack(track, stream);
            console.log('[WebRTC] Attached local track to PeerConnection:', track.kind, track.label);
          } catch (e) {
            console.warn('[WebRTC] Error adding track to peer connection:', e);
          }
        });

        // Broadcast presence after media is attached so other peer knows we are ready with tracks
        signaling.sendSignal('peer-presence', {
          userId: currentUserId,
          role: currentUserRole,
          name: currentUserName
        });
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('[WebRTC] Cleaning up consultation room:', appointment.id);
      
      // Record session end
      if (sessionDurationRef.current > 0) {
        consultationSessionService.recordSessionEnd(
          sessionIdRef.current,
          appointment.id,
          sessionDurationRef.current
        );
      }

      // Stop local camera/mic tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('[WebRTC] Stopped track:', track.kind);
        });
        streamRef.current = null;
      }

      // Stop screen share tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      // Close RTCPeerConnection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
        console.log('[WebRTC] PeerConnection closed.');
      }

      // Unsubscribe Realtime signaling
      signaling.unsubscribe();
    };
  }, [appointment.id, appointment.doctorId, appointment.doctorName, appointment.patientId, appointment.patientName, isDoctor, role, user?.fullName, user?.id, navigate]);

  // Mic Toggle Handler (Real hardware track enable/disable)
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      const nextState = !isMicOn;
      audioTracks.forEach(t => {
        t.enabled = nextState;
      });
      setIsMicOn(nextState);
    } else {
      setIsMicOn(!isMicOn);
    }
  };

  // Cam Toggle Handler (Real hardware track enable/disable)
  const toggleCam = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      const nextState = !isCamOn;
      videoTracks.forEach(t => {
        t.enabled = nextState;
      });
      setIsCamOn(nextState);
    } else {
      setIsCamOn(!isCamOn);
    }
  };

  // Screen Share Toggle with seamless RTCRtpSender track replacement
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen sharing is not supported on this browser or device.');
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setIsScreenSharing(true);

      // Handle user stopping screen share via native browser floating UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn('Screen share failed:', err);
      }
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    if (streamRef.current) {
      const cameraTrack = streamRef.current.getVideoTracks()[0];
      if (peerConnectionRef.current && cameraTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }
    }

    setIsScreenSharing(false);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const sent = await chatService.sendMessage(appointment.id, {
      senderId: user?.id || 'usr-1',
      senderName: user?.fullName || (isDoctor ? appointment.doctorName : appointment.patientName),
      senderRole: role || 'student',
      text: newMessage.trim()
    });

    setChatMessages(prev => [...prev, sent]);
    setNewMessage('');
  };

  // Leave consultation (Patient flow)
  const handleLeaveCall = () => {
    const confirm = window.confirm('Are you sure you want to leave this consultation?');
    if (!confirm) return;

    if (signalingRef.current) {
      signalingRef.current.sendSignal('peer-left', { userId: user?.id });
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    navigate(role === 'doctor' ? '/doctor/dashboard' : '/student/dashboard');
  };

  // End consultation (Doctor flow: completes appointment in DB, records session, opens Rx)
  const handleDoctorEndConsultation = async () => {
    const confirm = window.confirm(
      'End consultation session? This will mark the appointment as COMPLETED and allow issuing a digital prescription.'
    );
    if (!confirm) return;

    try {
      // 1. Mark appointment as completed in Supabase / Appointment Service
      await appointmentService.updateAppointmentStatus(appointment.id, 'completed', doctorNotes);

      // 2. Record Session End
      await consultationSessionService.recordSessionEnd(
        sessionIdRef.current,
        appointment.id,
        seconds
      );

      // 3. Send End Consultation Signal to patient
      if (signalingRef.current) {
        signalingRef.current.sendSignal('end-consultation', {
          completedAt: new Date().toISOString(),
          durationSeconds: seconds
        });
      }

      // 4. Open Prescription Modal
      setIsRxModalOpen(true);
    } catch (err) {
      console.warn('Error completing consultation:', err);
      setIsRxModalOpen(true);
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${peerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              Teleconsultation: {appointment.serviceName}
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-950 text-primary-300 border border-primary-800 font-mono">
                {appointment.bookingId}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {isDoctor ? `Patient: ${appointment.patientName}` : `Consultant: ${doctorDisplayName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
            peerConnected 
              ? 'bg-slate-800 text-emerald-400 border-slate-700' 
              : 'bg-slate-800/80 text-slate-400 border-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {peerConnected ? formatTimer(seconds) : '00:00 (Waiting)'}
          </div>
          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5">
            <Radio className={`w-3.5 h-3.5 ${peerConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span>{peerConnected ? 'WebRTC P2P Stream Active' : 'P2P Standby'}</span>
          </div>
        </div>
      </div>

      {/* Media Error Notice Banner */}
      {mediaError && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{mediaError}</span>
          </div>
          <button
            onClick={() => startLocalMedia()}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" /> Retry Device Access
          </button>
        </div>
      )}

      {/* Main Video & Sidebar Panels */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 p-4 relative flex flex-col justify-between bg-slate-950">
          <div className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center">
            {/* Remote Feed Display */}
            {peerConnected ? (
              <div className="w-full h-full relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-slate-950/80 px-3 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isDoctor ? appointment.patientName : doctorDisplayName} (Live Remote)
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 max-w-md px-6">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-primary-500/30 flex items-center justify-center mx-auto text-primary-400">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">
                    {peerLeft 
                      ? 'Participant Left Room' 
                      : isDoctor 
                        ? `Waiting for ${appointment.patientName} to join` 
                        : `Waiting for ${doctorDisplayName} to join`}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {peerLeft
                      ? 'The other party disconnected. You may wait for them to reconnect or exit the room.'
                      : `Realtime signaling active on room ${appointment.bookingId || appointment.id}. Remote video will stream as soon as the other participant connects.`}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 text-xs text-slate-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Waiting for peer WebRTC handshake...
                </div>
              </div>
            )}

            {/* Signaling Status Badge */}
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold border border-slate-700 text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-tealAccent-400" />
              <span>{signalingStatus}</span>
            </div>

            {/* Self Video Picture-in-Picture */}
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl bg-slate-800 border-2 border-slate-700 shadow-2xl overflow-hidden relative">
              {hasRealStream && isCamOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isScreenSharing ? '' : 'mirror'}`}
                />
              ) : isCamOn ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-900 p-2 text-center">
                  <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                  Camera Not Detected
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-900">
                  <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                  Camera Off
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold">
                You ({isDoctor ? 'Doctor' : 'Patient'}) {isScreenSharing ? '• Sharing Screen' : ''}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="mt-4 py-3 px-6 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-center gap-3">
            <button
              onClick={toggleMic}
              className={`p-3.5 rounded-2xl transition-all ${
                isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleCam}
              className={`p-3.5 rounded-2xl transition-all ${
                isCamOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={isCamOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3.5 rounded-2xl transition-all ${
                isScreenSharing ? 'bg-primary-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Share2 className="w-5 h-5" />
            </button>

            {isDoctor && (
              <button
                onClick={() => setIsRxModalOpen(true)}
                className="px-4 py-3.5 rounded-2xl bg-tealAccent-600 hover:bg-tealAccent-700 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> Issue Rx
              </button>
            )}

            {isDoctor ? (
              <button
                onClick={handleDoctorEndConsultation}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5" /> End Consultation
              </button>
            ) : (
              <button
                onClick={handleLeaveCall}
                className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow border border-slate-700 hover:border-rose-600 flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5" /> Leave Consultation
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-72 lg:h-auto">
          <div className="flex border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'chat'
                  ? 'border-primary-500 text-primary-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Live Chat
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'notes'
                  ? 'border-primary-500 text-primary-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" /> Clinical Notes
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'info'
                  ? 'border-primary-500 text-primary-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" /> Details
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl text-xs space-y-1 ${
                        msg.senderRole === 'doctor'
                          ? 'bg-primary-950/60 border border-primary-800/60 text-slate-200'
                          : 'bg-slate-800 border border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-primary-400">{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type encrypted message..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Doctor Clinical Notes
                  </label>
                  <textarea
                    rows={6}
                    value={doctorNotes}
                    onChange={e => setDoctorNotes(e.target.value)}
                    placeholder="Document clinical observations, diagnosis, and treatment plan..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-[11px]">
                  <div className="font-bold text-slate-300">Appointment Symptoms:</div>
                  <div className="text-slate-400">{appointment.symptoms?.join(', ') || 'General Consultation'}</div>
                </div>

                {isDoctor && (
                  <button
                    onClick={() => setIsRxModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-tealAccent-600 hover:bg-tealAccent-700 text-white text-xs font-bold transition-all shadow"
                  >
                    Generate Digital Prescription
                  </button>
                )}
              </div>
            )}

            {activeTab === 'info' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Appointment Details</div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booking ID:</span>
                    <span className="font-mono text-primary-400">{appointment.bookingId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span>{appointment.appointmentDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time Slot:</span>
                    <span>{appointment.timeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="capitalize">{appointment.consultationType}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">WebRTC Media Pipeline</div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Signaling Channel:</span>
                    <span className="text-emerald-400 font-mono">Supabase Realtime + Broadcast</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Encryption:</span>
                    <span className="text-emerald-400 font-mono">DTLS-SRTP (256-bit)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">STUN Server:</span>
                    <span className="text-emerald-400 font-mono text-[11px]">stun.l.google.com:19302</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">TURN Relay:</span>
                    <span className={`font-mono text-[11px] ${isTurnConfigured() ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isTurnConfigured() ? 'Configured' : 'TURN server not configured'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PrescriptionModal
        isOpen={isRxModalOpen}
        onClose={() => {
          setIsRxModalOpen(false);
          if (isDoctor) {
            navigate('/doctor/dashboard');
          }
        }}
        patientName={appointment.patientName}
        patientId={appointment.patientId}
        appointmentId={appointment.id}
      />
    </div>
  );
};
