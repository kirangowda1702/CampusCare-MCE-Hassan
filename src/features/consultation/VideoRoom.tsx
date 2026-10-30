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
  Info,
  Activity,
  Volume2,
  VolumeX,
  Wifi,
  CheckCircle2,
  X
} from 'lucide-react';
import { Appointment, ChatMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { PrescriptionModal } from '../prescriptions/PrescriptionModal';
import { useNavigate } from 'react-router-dom';
import { 
  RealtimeSignalingChannel, 
  getWebRTCConfiguration, 
  fetchDynamicIceServers,
  getIceTransportPolicy,
  parseCandidateType,
  hasTurnRelay,
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

  const isDoctor = (role || user?.role || '').toLowerCase() === 'doctor' || Boolean(user?.doctorId) || (appointment.doctorId === user?.id) || ((appointment as any).doctorEmail === user?.email);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasRealStream, setHasRealStream] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [remotePeerPresent, setRemotePeerPresent] = useState(false);
  const [peerLeft, setPeerLeft] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [signalingStatus, setSignalingStatus] = useState<string>('Initializing WebRTC Room...');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const [isAudioAutoplayBlocked, setIsAudioAutoplayBlocked] = useState(false);
  const [remoteVideoResolution, setRemoteVideoResolution] = useState<string>('');
  const [localVideoResolution, setLocalVideoResolution] = useState<string>('');
  const [iceConnectionState, setIceConnectionState] = useState<string>('new');
  const [peerConnectionState, setPeerConnectionState] = useState<string>('new');
  const [lastSignalEvent, setLastSignalEvent] = useState<string>('INITIALIZING');
  const [offerAnswerState, setOfferAnswerState] = useState<string>('idle');
  const [selectedCandidatePair, setSelectedCandidatePair] = useState<string>('Detecting candidate pair...');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isConnectionDelayed, setIsConnectionDelayed] = useState(false);
  const [isTurnActive, setIsTurnActive] = useState<boolean>(false);
  const iceRestartAttemptedRef = useRef(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<RealtimeSignalingChannel | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const localCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const sessionDurationRef = useRef(0);
  const localMediaPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const triggerOfferRef = useRef<(() => Promise<void>) | null>(null);

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
  const processQueuedCandidates = async (targetPc: RTCPeerConnection) => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          const candInit: RTCIceCandidateInit = {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid !== undefined && candidate.sdpMid !== null ? String(candidate.sdpMid) : undefined,
            sdpMLineIndex: typeof candidate.sdpMLineIndex === 'number'
              ? candidate.sdpMLineIndex
              : (candidate.sdpMid != null ? undefined : 0)
          };
          await targetPc.addIceCandidate(candInit);
        } catch (err) {
          console.warn('[WebRTC] Error adding queued ICE candidate:', err);
        }
      }
    }
  };

  // Helper: Start or acquire local media with progressive fallback for Android and laptop
  const startLocalMedia = async (): Promise<MediaStream | null> => {
    if (streamRef.current && streamRef.current.getTracks().some(t => t.readyState === 'live')) {
      return streamRef.current;
    }
    try {
      setMediaError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMediaError('MediaDevices API not available in this browser or environment (requires HTTPS/localhost).');
        return null;
      }

      let stream: MediaStream | null = null;
      const attempts = [
        // Tier 1: Ideal 720p HD with user facing camera + audio (laptops & high-end mobile)
        {
          video: {
            facingMode: 'user',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: { echoCancellation: true, noiseSuppression: true }
        },
        // Tier 2: Flexible facingMode user + standard audio (Android Chrome standard)
        {
          video: { facingMode: 'user' },
          audio: true
        },
        // Tier 3: Unconstrained generic video + audio
        {
          video: true,
          audio: true
        },
        // Tier 4: Video only (if microphone hardware or permission is blocked)
        {
          video: true,
          audio: false
        },
        // Tier 5: Audio only (if camera hardware is blocked or in-use)
        {
          video: false,
          audio: true
        }
      ];

      for (let i = 0; i < attempts.length; i++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(attempts[i] as any);
          if (stream && stream.getTracks().some(t => t.readyState === 'live')) {
            console.log(`[WebRTC] getUserMedia succeeded on attempt ${i + 1}`);
            break;
          }
        } catch (tierErr: any) {
          console.warn(`[WebRTC] getUserMedia attempt ${i + 1} failed:`, tierErr.name || tierErr.message);
          if (i === attempts.length - 1) {
            throw tierErr;
          }
        }
      }

      if (!stream) {
        throw new Error('Unable to obtain audio/video stream from device.');
      }

      streamRef.current = stream;
      setHasRealStream(true);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCamOn;
        const settings = videoTrack.getSettings ? videoTrack.getSettings() : ({} as any);
        if (settings.width && settings.height) {
          setLocalVideoResolution(`${settings.width}x${settings.height}`);
        } else {
          setLocalVideoResolution('Live');
        }
      }
      if (audioTrack) {
        audioTrack.enabled = isMicOn;
      }

      console.log('[WebRTC] Local video track live:', videoTrack?.readyState === 'live', `(${videoTrack?.readyState || 'none'})`);
      console.log('[WebRTC] Local audio track live:', audioTrack?.readyState === 'live', `(${audioTrack?.readyState || 'none'})`);

      // Immediately assign stream to local video DOM element if mounted
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.defaultMuted = true;
        localVideoRef.current.playsInline = true;
        localVideoRef.current.play().catch(err => {
          console.warn('[WebRTC] Local video play failed:', err);
        });
      }

      return stream;
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

  const getOrCreateLocalMedia = (): Promise<MediaStream | null> => {
    if (streamRef.current && streamRef.current.getTracks().some(t => t.readyState === 'live')) {
      return Promise.resolve(streamRef.current);
    }
    if (!localMediaPromiseRef.current) {
      localMediaPromiseRef.current = startLocalMedia();
    }
    return localMediaPromiseRef.current;
  };

  // Synchronize local video element srcObject whenever stream or camera state updates
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) return;

    const activeStream = isScreenSharing ? screenStreamRef.current : streamRef.current;
    if (activeStream && hasRealStream && isCamOn) {
      if (videoEl.srcObject !== activeStream) {
        videoEl.srcObject = activeStream;
      }
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.play().catch(err => {
        console.warn('[WebRTC] Local preview play error:', err);
      });
    }
  }, [hasRealStream, isCamOn, isScreenSharing]);

  const isRemoteVideoPlayingRef = useRef(false);

  // Play remote video (Always muted so mobile browser autoplay policies NEVER pause or block incoming video)
  const playRemoteVideo = async (videoEl: HTMLVideoElement) => {
    if (!videoEl) return;
    if (isRemoteVideoPlayingRef.current) return;
    try {
      isRemoteVideoPlayingRef.current = true;
      console.log('[WebRTC] REMOTE_VIDEO_PLAY');
      console.log('[WebRTC] REMOTE_VIDEO_PLAY_ATTEMPT');
      setLastSignalEvent('REMOTE_VIDEO_PLAY_ATTEMPT');
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play();
      console.log('[WebRTC] REMOTE_VIDEO_PLAY_SUCCESS');
      setLastSignalEvent('REMOTE_VIDEO_PLAY_SUCCESS');
      setAutoplayBlocked(false);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.warn('[WebRTC] REMOTE_VIDEO_PLAY_BLOCKED (Autoplay restriction):', err);
        setAutoplayBlocked(true);
      } else if (err.name === 'AbortError') {
        console.log('[WebRTC] REMOTE_VIDEO_PLAY: transient play aborted by new frame or element refresh');
      } else {
        console.error('[WebRTC] REMOTE_VIDEO_ERROR: Error playing remote video stream:', err);
      }
    } finally {
      isRemoteVideoPlayingRef.current = false;
    }
  };

  // Play remote audio through dedicated audio element with mobile autoplay policy detection
  const playRemoteAudio = async () => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;
    try {
      console.log('[WebRTC] REMOTE_AUDIO_PLAY_ATTEMPT');
      await audioEl.play();
      console.log('[WebRTC] REMOTE_AUDIO_PLAY_SUCCESS');
      setIsAudioAutoplayBlocked(false);
      setIsRemoteAudioMuted(false);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        console.warn('[WebRTC] REMOTE_AUDIO_PLAY_BLOCKED by browser autoplay policy (User interaction required):', err);
        setIsAudioAutoplayBlocked(true);
        setIsRemoteAudioMuted(true);
      } else {
        console.warn('[WebRTC] REMOTE_AUDIO_ERROR:', err);
      }
    }
  };

  // Direct user-initiated click handler to enable audio on mobile
  const handleEnableAudioClick = async () => {
    console.log('[WebRTC] USER_ENABLE_AUDIO_CLICK');
    setLastSignalEvent('USER_ENABLE_AUDIO_CLICK');
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;
    try {
      if (remoteAudioStreamRef.current && audioEl.srcObject !== remoteAudioStreamRef.current) {
        audioEl.srcObject = remoteAudioStreamRef.current;
      }
      await audioEl.play();
      setIsAudioAutoplayBlocked(false);
      setIsRemoteAudioMuted(false);
      console.log('[WebRTC] Remote audio unblocked by user gesture successfully');
    } catch (err) {
      console.warn('[WebRTC] Failed to unblock audio via user gesture:', err);
    }
  };

  // Direct user-initiated click handler for the tap-to-play video button
  const handleEnableRemoteVideoClick = async () => {
    const videoEl = remoteVideoRef.current;
    if (!videoEl) return;
    console.log('[WebRTC] REMOTE_VIDEO_PLAY');
    console.log('[WebRTC] User clicked Enable Remote Video button');
    setLastSignalEvent('USER_ENABLE_REMOTE_VIDEO_CLICK');
    if (remoteVideoStreamRef.current && videoEl.srcObject !== remoteVideoStreamRef.current) {
      videoEl.srcObject = remoteVideoStreamRef.current;
    }
    videoEl.muted = true;
    videoEl.playsInline = true;
    try {
      await videoEl.play();
      setAutoplayBlocked(false);
      console.log('[WebRTC] REMOTE_VIDEO_PLAY_SUCCESS');
    } catch (err) {
      console.warn('[WebRTC] Remote video manual play error:', err);
    }
  };

  // Handler to unmute remote consultation audio
  const handleUnmuteRemoteAudio = async () => {
    await handleEnableAudioClick();
  };

  // Synchronize remote media elements srcObject whenever peer connects or remote streams arrive
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl && remoteVideoStreamRef.current) {
      if (videoEl.srcObject !== remoteVideoStreamRef.current) {
        console.log('[WebRTC] Attaching remote video stream to video element via sync effect');
        videoEl.srcObject = remoteVideoStreamRef.current;
      }
      videoEl.muted = true;
      videoEl.playsInline = true;
      playRemoteVideo(videoEl);
    }

    const audioEl = remoteAudioRef.current;
    if (audioEl && remoteAudioStreamRef.current) {
      if (audioEl.srcObject !== remoteAudioStreamRef.current) {
        console.log('[WebRTC] Attaching remote audio stream to audio element via sync effect');
        audioEl.srcObject = remoteAudioStreamRef.current;
      }
      playRemoteAudio();
    }
  }, [peerConnected, hasRemoteVideo, hasRemoteAudio]);

  // Handle manual retry of device access
  const handleRetryMedia = async () => {
    const stream = await startLocalMedia();
    if (stream && peerConnectionRef.current) {
      const pc = peerConnectionRef.current;
      const senders = pc.getSenders();
      stream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack error:', e));
        } else {
          try {
            pc.addTrack(track, stream);
          } catch (e) {
            console.warn('[WebRTC] addTrack error:', e);
          }
        }
      });
    }
  };

  // Handle manual WebRTC & ICE reconnection
  const handleManualReconnect = async () => {
    console.log('[WebRTC] Manual WebRTC reconnect requested');
    setLastSignalEvent('MANUAL_RECONNECT');
    setConnectionError(null);
    setIsConnectionDelayed(false);
    if (!peerConnectionRef.current) return;
    const pc = peerConnectionRef.current;
    try {
      pc.restartIce();
      if (triggerOfferRef.current) {
        await triggerOfferRef.current();
      } else if (signalingRef.current) {
        signalingRef.current.sendSignal('peer-presence', {
          userId: user?.id,
          role: role,
          name: user?.fullName
        });
      }
    } catch (e: any) {
      console.warn('[WebRTC] Manual reconnect error:', e);
      setConnectionError(e?.message || 'Reconnection error');
    }
  };

  // WebRTC Connection Watchdog: Alert and trigger ICE restart if peers in room cannot connect within 12s
  useEffect(() => {
    let watchdogTimer: any = null;
    if (remotePeerPresent && !peerConnected) {
      watchdogTimer = setTimeout(() => {
        if (!peerConnected) {
          console.warn('[WebRTC] Connection watchdog triggered: >12s in negotiation without connection. Possible symmetric NAT/firewall.');
          setIsConnectionDelayed(true);
          setSignalingStatus('P2P Direct Negotiation Delayed — Symmetric NAT / Firewall Detected');

          const pc = peerConnectionRef.current;
          if (pc && !iceRestartAttemptedRef.current) {
            iceRestartAttemptedRef.current = true;
            console.log('[WebRTC] Watchdog triggering automatic ICE restart...');
            try {
              pc.restartIce();
              triggerOfferRef.current?.();
            } catch (e) {
              console.warn('[WebRTC] Watchdog ICE restart error:', e);
            }
          }
        }
      }, 12000);
    } else if (peerConnected) {
      setIsConnectionDelayed(false);
      iceRestartAttemptedRef.current = false;
    }
    return () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
    };
  }, [remotePeerPresent, peerConnected]);

  // Helper: Format doctor name without duplication
  const doctorDisplayName = appointment.doctorName?.startsWith('Dr.') || appointment.doctorName?.startsWith('Dr ')
    ? appointment.doctorName
    : `Dr. ${appointment.doctorName}`;

  // 3. WebRTC Peer Connection & Realtime Signaling (Perfect Negotiation Pattern)
  useEffect(() => {
    let isMounted = true;
    const currentUserId = user?.id || `usr-${Date.now()}`;
    const currentUserName = user?.fullName || (isDoctor ? appointment.doctorName : appointment.patientName);
    const currentUserRole = role || (isDoctor ? 'doctor' : 'student');
    const canonicalRoomId = ((appointment as any).bookingId || (appointment as any).booking_id || appointment.id || '').trim();

    console.log('[WebRTC] appointmentId:', appointment.id);
    console.log('[WebRTC] bookingId:', (appointment as any).bookingId || (appointment as any).booking_id);
    console.log('[WebRTC] roomId:', canonicalRoomId);
    console.log('[WebRTC] userId:', currentUserId);
    console.log('[WebRTC] role:', currentUserRole);

    const signaling = new RealtimeSignalingChannel(
      canonicalRoomId,
      currentUserId,
      currentUserRole,
      currentUserName
    );
    signalingRef.current = signaling;

    console.log('[WebRTC] ROOM_ID:', canonicalRoomId);
    console.log('[WebRTC] SIGNALING_CHANNEL:', `consultation:${canonicalRoomId}`);

    const transportPolicy = getIceTransportPolicy();
    console.log('[WebRTC] ICE transport policy:', transportPolicy);

    const rtcConfig = getWebRTCConfiguration();
    const isTurnPresent = isTurnConfigured();
    console.log('[WebRTC] WebRTC Config initialized. TURN Status:', isTurnPresent ? 'CONFIGURED' : 'TURN NOT CONFIGURED');

    let pc: RTCPeerConnection | null = null;
    let isMakingOffer = false;
    let isIgnoringOffer = false;
    let isSettingRemoteAnswerPending = false;
    let triggerOffer: (() => Promise<void>) | null = null;
    // Doctor is impolite peer (primary caller), Student/Patient is polite peer
    const isPolite = !isDoctor;

    // Helper: Resend gathered local ICE candidates to newly arrived or reconnecting peers
    const resendLocalCandidates = () => {
      if (localCandidatesRef.current.length > 0) {
        console.log(`[WebRTC] Re-sending ${localCandidatesRef.current.length} cached local ICE candidates to peer...`);
        localCandidatesRef.current.forEach(cand => {
          console.log('[WebRTC] ICE_SENT:', cand.candidate);
          console.log('[WebRTC] ICE candidate sent:', cand.candidate);
          signaling.sendSignal('candidate', cand);
        });
      }
    };

    // Helper: Attach local media tracks to RTCPeerConnection with native MediaStream association
    const attachStreamTracksToPc = (stream: MediaStream, targetPc: RTCPeerConnection) => {
      const transceivers = targetPc.getTransceivers ? targetPc.getTransceivers() : [];
      const senders = targetPc.getSenders();
      stream.getTracks().forEach(track => {
        const matchingTransceiver = transceivers.find(
          t => (t.receiver && t.receiver.track && t.receiver.track.kind === track.kind) ||
               (t.sender && t.sender.track && t.sender.track.kind === track.kind)
        );
        if (matchingTransceiver && matchingTransceiver.sender) {
          if (matchingTransceiver.direction !== 'sendrecv') {
            matchingTransceiver.direction = 'sendrecv';
          }
          if (matchingTransceiver.sender.track) {
            matchingTransceiver.sender.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack warning:', e));
          } else {
            try {
              targetPc.addTrack(track, stream);
            } catch {
              matchingTransceiver.sender.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack warning:', e));
            }
          }
          console.log('[WebRTC] Bound track to transceiver:', track.kind, track.label);
          return;
        }

        const existingSender = senders.find(s => s.track && s.track.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack warning:', e));
        } else {
          try {
            targetPc.addTrack(track, stream);
            console.log('[WebRTC] Attached local track to PeerConnection:', track.kind, track.label);
          } catch (e) {
            console.warn('[WebRTC] Error adding track:', e);
          }
        }
      });
    };

    // Helper: Guarantee local tracks are attached before generating offer or answer
    const ensureLocalTracksAttached = async (targetPc: RTCPeerConnection | null): Promise<boolean> => {
      if (!targetPc) return false;
      const currentSenders = targetPc.getSenders();
      if (currentSenders.length > 0 && currentSenders.some(s => s.track && s.track.readyState === 'live')) {
        return true;
      }
      try {
        const stream = await getOrCreateLocalMedia();
        if (stream && targetPc) {
          attachStreamTracksToPc(stream, targetPc);
          const senders = targetPc.getSenders();
          const hasVideoSender = senders.some(s => s.track && s.track.kind === 'video');
          const hasAudioSender = senders.some(s => s.track && s.track.kind === 'audio');
          console.log('[WebRTC] Local senders verified - Video:', hasVideoSender, 'Audio:', hasAudioSender);
          return senders.length > 0;
        }
      } catch (err) {
        console.warn('[WebRTC] ensureLocalTracksAttached error:', err);
      }
      return false;
    };

    try {
      pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Pre-add audio and video transceivers with explicit sendrecv direction
      try {
        pc.addTransceiver('video', { direction: 'sendrecv' });
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        console.log('[WebRTC] Pre-configured audio and video sendrecv transceivers');
      } catch (transceiverErr) {
        console.warn('[WebRTC] addTransceiver warning:', transceiverErr);
      }

      // Asynchronously fetch dynamic ICE servers from /api/ice and update PeerConnection
      fetchDynamicIceServers(user).then(dynamicServers => {
        if (!isMounted || !pc) return;
        const turnActive = hasTurnRelay(dynamicServers);
        setIsTurnActive(turnActive);
        console.log('[WebRTC] Dynamic ICE servers updated. TURN Active:', turnActive);
        try {
          pc.setConfiguration({
            iceServers: dynamicServers,
            iceTransportPolicy: transportPolicy
          });
          // If we haven't connected yet and are in stable state, restart ICE so new TURN servers are actively utilized
          if (
            pc.iceConnectionState !== 'connected' &&
            pc.iceConnectionState !== 'completed' &&
            pc.signalingState === 'stable' &&
            isDoctor
          ) {
            console.log('[WebRTC] Restarting ICE with updated TURN servers configuration...');
            pc.restartIce();
            triggerOffer?.();
          }
        } catch (e) {
          console.warn('[WebRTC] PeerConnection setConfiguration warning:', e);
        }
      });

      // Log all WebRTC lifecycle state transitions
      pc.onsignalingstatechange = () => {
        console.log('[WebRTC] signalingState:', pc?.signalingState);
      };

      pc.onicegatheringstatechange = () => {
        console.log('[WebRTC] iceGatheringState:', pc?.iceGatheringState);
        console.log('[WebRTC] ICE_GATHERING_STATE:', pc?.iceGatheringState);
      };

      pc.oniceconnectionstatechange = () => {
        if (!pc) return;
        const iceState = pc.iceConnectionState;
        console.log('[WebRTC] ICE state:', iceState);
        console.log('[WebRTC] ICE_STATE:', iceState);
        console.log('[WebRTC] ICE_CONNECTION_STATE:', iceState);
        setIceConnectionState(iceState);
        setLastSignalEvent(`ICE_${iceState.toUpperCase()}`);

        if (iceState === 'connected' || iceState === 'completed') {
          setPeerConnected(true);
          signalingRef.current?.setPeerConnected(true);
          setPeerLeft(false);
          setConnectionError(null);
          setSignalingStatus('Live Encrypted P2P Stream Established');
        } else if (iceState === 'failed') {
          setPeerConnected(false);
          setConnectionError('ICE Connection Failed (TURN relay candidate required for symmetric NAT)');
          if (isDoctor && pc.signalingState === 'stable') {
            console.log('[WebRTC] ICE failed - Doctor triggering ICE restart...');
            try {
              pc.restartIce();
              triggerOffer?.();
            } catch (restartErr) {
              console.warn('[WebRTC] restartIce error:', restartErr);
            }
          } else {
            setSignalingStatus('ICE Connection Failed (TURN server required for symmetric NAT)');
          }
        } else if (iceState === 'disconnected') {
          setPeerConnected(false);
          setSignalingStatus('Peer Disconnected — Awaiting Reconnection');
        }
      };

      // Connection State Handler
      pc.onconnectionstatechange = () => {
        if (!pc) return;
        const state = pc.connectionState;
        console.log('[WebRTC] Connection state:', state);
        console.log('[WebRTC] CONNECTION_STATE:', state);
        console.log('[WebRTC] PEER_CONNECTION_STATE:', state);
        setPeerConnectionState(state);
        setLastSignalEvent(`PEER_${state.toUpperCase()}`);

        if (state === 'connected') {
          setPeerConnected(true);
          signalingRef.current?.setPeerConnected(true);
          setPeerLeft(false);
          setConnectionError(null);
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
          setConnectionError('Peer connection failed. Check NAT/Firewall or click Restart WebRTC.');
          if (isDoctor && pc.signalingState === 'stable') {
            console.log('[WebRTC] Peer connection failed - Doctor triggering ICE restart...');
            try {
              pc.restartIce();
              triggerOffer?.();
            } catch (restartErr) {
              console.warn('[WebRTC] restartIce error:', restartErr);
            }
          } else {
            setSignalingStatus('WebRTC Direct Connection Failed (STUN/TURN required)');
          }
        } else if (state === 'closed') {
          setPeerConnected(false);
          setSignalingStatus('Consultation Closed');
        }
      };

      // Periodic candidate pair and media statistics monitor
      const statsInterval = setInterval(async () => {
        if (!pc) return;
        try {
          const stats = await pc.getStats();
          let activePair: any = null;
          stats.forEach((report: any) => {
            if (report.type === 'transport' && report.selectedCandidatePairId) {
              activePair = stats.get(report.selectedCandidatePairId);
            }
            if (report.type === 'candidate-pair' && (report.selected || (report.nominated && report.state === 'succeeded'))) {
              activePair = report;
            }
          });
          if (activePair) {
            const localCand = stats.get(activePair.localCandidateId);
            const remoteCand = stats.get(activePair.remoteCandidateId);
            const localType = (localCand?.candidateType || 'host').toUpperCase();
            const remoteType = (remoteCand?.candidateType || 'host').toUpperCase();
            const localProtocol = (localCand?.protocol || 'udp').toUpperCase();
            setSelectedCandidatePair(`${localType} (${localProtocol}) ↔ ${remoteType}`);
          } else if (pc.iceConnectionState === 'checking') {
            setSelectedCandidatePair('Probing Candidate Pairs...');
          } else if (pc.iceConnectionState === 'failed') {
            setSelectedCandidatePair('No Candidate Pair (ICE Failed)');
          }
        } catch (e) {
          // quiet
        }
      }, 1200);

      // ICE Candidate Handler
      pc.onicecandidate = event => {
        if (event.candidate && event.candidate.candidate) {
          const candType = parseCandidateType(event.candidate.candidate);
          console.log('[WebRTC] ICE_CANDIDATE_TYPE:', candType);
          console.log('[WebRTC] ICE_SENT:', event.candidate.candidate);
          console.log('[WebRTC] ICE candidate sent:', event.candidate.candidate);
          setLastSignalEvent('ICE_SENT');
          const candJson = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          };
          localCandidatesRef.current.push(candJson);
          signaling.sendSignal('candidate', candJson);
        } else if (!event.candidate) {
          console.log('[WebRTC] ICE candidate gathering complete (end-of-candidates)');
          signaling.sendSignal('candidate', {
            candidate: '',
            sdpMid: '0',
            sdpMLineIndex: 0
          });
        }
      };

      // Remote Track Handler: Decoupled video and audio pipelines
      pc.ontrack = async event => {
        console.log('[WebRTC] REMOTE_TRACK_RECEIVED:', event.track.kind);
        console.log('[WebRTC] Remote track received:', event.track.kind);
        setLastSignalEvent(`REMOTE_TRACK_${event.track.kind.toUpperCase()}`);

        if (event.track.kind === 'video') {
          setHasRemoteVideo(true);
          const settings = event.track.getSettings ? event.track.getSettings() : ({} as any);
          if (settings.width && settings.height) {
            setRemoteVideoResolution(`${settings.width}x${settings.height}`);
          } else {
            setRemoteVideoResolution('Live');
          }
          event.track.onunmute = () => {
            console.log('[WebRTC] Remote video track unmuted');
            setHasRemoteVideo(true);
            const videoEl = remoteVideoRef.current;
            if (videoEl) {
              playRemoteVideo(videoEl);
            }
          };
          event.track.onmute = () => {
            console.log('[WebRTC] Remote video track muted');
          };

          // Use native browser stream if available, otherwise construct MediaStream
          const incomingVideoStream = (event.streams && event.streams[0])
            ? event.streams[0]
            : (remoteVideoStreamRef.current || new MediaStream());

          if (!remoteVideoStreamRef.current) {
            remoteVideoStreamRef.current = incomingVideoStream;
          }
          if (!remoteVideoStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
            remoteVideoStreamRef.current.addTrack(event.track);
          }

          const videoEl = remoteVideoRef.current;
          if (videoEl) {
            if (videoEl.srcObject !== remoteVideoStreamRef.current) {
              videoEl.srcObject = remoteVideoStreamRef.current;
            }
            videoEl.muted = true;
            videoEl.playsInline = true;
            playRemoteVideo(videoEl);
          }
        } else if (event.track.kind === 'audio') {
          setHasRemoteAudio(true);
          event.track.onunmute = () => {
            console.log('[WebRTC] Remote audio track unmuted');
            setHasRemoteAudio(true);
            playRemoteAudio();
          };
          event.track.onmute = () => {
            console.log('[WebRTC] Remote audio track muted');
          };

          const incomingAudioStream = (event.streams && event.streams[0])
            ? event.streams[0]
            : (remoteAudioStreamRef.current || new MediaStream());

          if (!remoteAudioStreamRef.current) {
            remoteAudioStreamRef.current = incomingAudioStream;
          }
          if (!remoteAudioStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
            remoteAudioStreamRef.current.addTrack(event.track);
          }

          const audioEl = remoteAudioRef.current;
          if (audioEl) {
            if (audioEl.srcObject !== remoteAudioStreamRef.current) {
              audioEl.srcObject = remoteAudioStreamRef.current;
            }
            playRemoteAudio();
          }
        }
      };

      // Perfect Negotiation: onnegotiationneeded
      pc.onnegotiationneeded = async () => {
        try {
          if (!pc) return;
          // Polite peer waits for Doctor initial offer to avoid colliding offers
          if (!isDoctor && !peerConnected) {
            console.log('[WebRTC] Polite peer waiting for Doctor initial offer (avoiding offer collision)');
            return;
          }
          console.log('[WebRTC] onnegotiationneeded fired. isMakingOffer:', isMakingOffer, 'signalingState:', pc.signalingState);
          if (isMakingOffer || pc.signalingState !== 'stable') return;
          await triggerOffer?.();
        } catch (err) {
          console.warn('[WebRTC] Negotiation offer error:', err);
        }
      };

      // Helper function to trigger offer creation or re-broadcast existing offer
      triggerOffer = async () => {
        if (!pc) return;
        try {
          // Guarantee local tracks are attached before generating the offer
          await ensureLocalTracksAttached(pc);

          if (pc.signalingState !== 'stable') {
            if (pc.signalingState === 'have-local-offer' && pc.localDescription) {
              console.log('[WebRTC] Signaling state is have-local-offer, re-broadcasting existing local offer');
              console.log('[WebRTC] OFFER_SENT');
              setLastSignalEvent('OFFER_SENT');
              setOfferAnswerState('OFFER_REBROADCAST');
              const descPayload = {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp
              };
              signaling.sendSignal('offer', descPayload);
              resendLocalCandidates();
            } else {
              console.log('[WebRTC] Skipping triggerOffer: signalingState is:', pc.signalingState);
            }
            return;
          }

          isMakingOffer = true;
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          console.log('[WebRTC] OFFER_CREATED');
          console.log('[WebRTC] Offer created');
          console.log('[WebRTC] OFFER_SENT');
          setLastSignalEvent('OFFER_SENT');
          setOfferAnswerState('OFFER_SENT');
          const descPayload = {
            type: pc.localDescription?.type || offer.type,
            sdp: pc.localDescription?.sdp || offer.sdp
          };
          signaling.sendSignal('offer', descPayload);
        } catch (err) {
          console.warn('[WebRTC] triggerOffer error:', err);
        } finally {
          isMakingOffer = false;
        }
      };
      triggerOfferRef.current = triggerOffer;

      // Signaling message router
      signaling.subscribe(async (payload: SignalPayload) => {
        if (payload.senderId === currentUserId) return;

        try {
          if (payload.type === 'peer-joined') {
            console.log('[WebRTC] PEER_JOINED:', payload.senderName || payload.senderId);
            console.log('[WebRTC] PEER_PRESENCE_RECEIVED');
            setLastSignalEvent('PEER_PRESENCE_RECEIVED');
            setPeerLeft(false);
            setRemotePeerPresent(true);
            const peerName = payload.senderName || 'Participant';
            setSignalingStatus(`Peer (${peerName}) joined room. Exchanging handshake...`);
            console.log(`[WebRTC] Peer joined: ${peerName} (${payload.senderRole || 'peer'}). Replying with presence...`);
            
            // Acknowledge presence back to the newly joined peer
            console.log('[WebRTC] PEER_PRESENCE_SENT');
            signaling.sendSignal('peer-presence', {
              userId: currentUserId,
              role: currentUserRole,
              name: currentUserName
            });

            // Re-send our cached candidates
            resendLocalCandidates();

            // If Doctor, initiate offer now
            if (isDoctor) {
              setTimeout(() => {
                triggerOffer?.();
              }, 150);
            }
          } else if (payload.type === 'peer-presence') {
            console.log('[WebRTC] PEER_PRESENCE_RECEIVED');
            console.log('[WebRTC] PEER_JOINED (Presence Heartbeat):', payload.senderName || payload.senderId);
            setLastSignalEvent('PEER_PRESENCE_RECEIVED');
            setPeerLeft(false);
            setRemotePeerPresent(true);
            const peerName = payload.senderName || 'Participant';
            console.log(`[WebRTC] Peer presence confirmed: ${peerName}`);
            setSignalingStatus(`Peer (${peerName}) in room. Starting peer handshake...`);
            
            // Re-send cached candidates
            resendLocalCandidates();

            // Doctor initiates offer upon presence
            if (isDoctor && pc) {
              setTimeout(() => {
                triggerOffer?.();
              }, 150);
            } else if (!isDoctor && pc && pc.signalingState === 'stable' && !peerConnected) {
              // Polite fallback: if doctor hasn't offered within 2s, initiate offer safely
              setTimeout(() => {
                if (pc && pc.signalingState === 'stable' && !peerConnected && !isSettingRemoteAnswerPending) {
                  console.log('[WebRTC] Polite peer safety timeout - triggering offer fallback');
                  triggerOffer?.();
                }
              }, 2000);
            }
          } else if (payload.type === 'offer' && payload.data && pc) {
            console.log('[WebRTC] OFFER_RECEIVED');
            console.log('[WebRTC] Offer received');
            setLastSignalEvent('OFFER_RECEIVED');
            setPeerLeft(false);

            // Ensure local tracks are attached before creating answer!
            await ensureLocalTracksAttached(pc);

            const sdpData = payload.data?.sdp ? payload.data : payload.data;

            // Check if this is a re-broadcasted duplicate offer with identical SDP while we already answered
            if (
              pc.remoteDescription?.sdp === sdpData.sdp &&
              pc.localDescription?.type === 'answer'
            ) {
              console.log('[WebRTC] Re-broadcasting existing answer for duplicate offer');
              console.log('[WebRTC] ANSWER_SENT');
              setLastSignalEvent('ANSWER_SENT');
              signaling.sendSignal('answer', {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp
              });
              resendLocalCandidates();
              return;
            }
            
            const offerCollision = isMakingOffer || pc.signalingState !== 'stable';
            isIgnoringOffer = !isPolite && offerCollision;
            if (isIgnoringOffer) {
              console.log('[WebRTC] Impolite peer ignoring colliding offer');
              return;
            }

            if (offerCollision && isPolite) {
              console.log('[WebRTC] Polite peer handling colliding offer via rollback');
              try {
                await pc.setLocalDescription({ type: 'rollback' } as any);
              } catch (rollbackErr) {
                console.warn('[WebRTC] Rollback error:', rollbackErr);
              }
            }

            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdpData));
              await processQueuedCandidates(pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              console.log('[WebRTC] ANSWER_CREATED');
              console.log('[WebRTC] Answer created');
              console.log('[WebRTC] ANSWER_SENT');
              setLastSignalEvent('ANSWER_SENT');
              const descPayload = {
                type: pc.localDescription?.type || answer.type,
                sdp: pc.localDescription?.sdp || answer.sdp
              };
              signaling.sendSignal('answer', descPayload);
              
              // Re-send our candidates now that answer is ready
              resendLocalCandidates();
            } catch (offerProcErr) {
              console.warn('[WebRTC] Error processing offer:', offerProcErr);
            }
          } else if (payload.type === 'answer' && payload.data && pc) {
            console.log('[WebRTC] ANSWER_RECEIVED');
            console.log('[WebRTC] Answer received from peer:', payload.senderName || payload.senderId);
            setLastSignalEvent('ANSWER_RECEIVED');
            
            if (pc.signalingState !== 'have-local-offer') {
              console.log('[WebRTC] Ignoring unexpected/redundant answer in signalingState:', pc.signalingState);
              return;
            }

            isSettingRemoteAnswerPending = true;
            try {
              const sdpData = payload.data?.sdp ? payload.data : payload.data;
              await pc.setRemoteDescription(new RTCSessionDescription(sdpData));
              console.log('[WebRTC] ANSWER_PROCESSED: Remote description set to answer successfully. Signaling state:', pc.signalingState);
              await processQueuedCandidates(pc);
              resendLocalCandidates();
            } catch (answerErr) {
              console.error('[WebRTC] ANSWER_ERROR: Failed to setRemoteDescription with answer:', answerErr);
            } finally {
              isSettingRemoteAnswerPending = false;
            }
          } else if (payload.type === 'candidate' && payload.data && pc) {
            const candidateStr = payload.data?.candidate || (typeof payload.data === 'string' ? payload.data : '');
            if (candidateStr) {
              const candType = parseCandidateType(candidateStr);
              console.log('[WebRTC] ICE_CANDIDATE_TYPE:', candType);
              console.log('[WebRTC] ICE_RECEIVED:', candidateStr);
              console.log('[WebRTC] ICE candidate received:', candidateStr);
              setLastSignalEvent('ICE_RECEIVED');
              const candInit: RTCIceCandidateInit = {
                candidate: candidateStr,
                sdpMid: payload.data?.sdpMid !== undefined && payload.data?.sdpMid !== null ? String(payload.data.sdpMid) : undefined,
                sdpMLineIndex: typeof payload.data?.sdpMLineIndex === 'number'
                  ? payload.data.sdpMLineIndex
                  : (payload.data?.sdpMid != null ? undefined : 0)
              };
              try {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                  await pc.addIceCandidate(candInit);
                } else {
                  iceCandidatesQueue.current.push(candInit);
                }
              } catch (candErr) {
                if (!isIgnoringOffer) {
                  console.warn('[WebRTC] Error adding received ICE candidate:', candErr);
                }
              }
            } else if (payload.data && payload.data.candidate === '') {
              console.log('[WebRTC] End-of-candidates received from peer');
              try {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                  await pc.addIceCandidate(new RTCIceCandidate({ candidate: '', sdpMid: '0', sdpMLineIndex: 0 }));
                }
              } catch (e) {
                // benign in browsers
              }
            }
          } else if (payload.type === 'peer-left') {
            console.log('[WebRTC] Peer left room:', payload.senderName || payload.senderId);
            setPeerConnected(false);
            setRemotePeerPresent(false);
            signalingRef.current?.setPeerConnected(false);
            setPeerLeft(true);
            setSignalingStatus('The other participant has left the consultation room.');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          } else if (payload.type === 'end-consultation') {
            console.log('[WebRTC] Doctor ended consultation.');
            setPeerConnected(false);
            signalingRef.current?.setPeerConnected(false);
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
    getOrCreateLocalMedia().then(stream => {
      if (!isMounted || !pc) return;
      if (stream) {
        attachStreamTracksToPc(stream, pc);

        const senders = pc.getSenders();
        const hasVideoSender = senders.some(s => s.track && s.track.kind === 'video');
        const hasAudioSender = senders.some(s => s.track && s.track.kind === 'audio');
        console.log('[WebRTC] Local senders verified - Video sender:', hasVideoSender, 'Audio sender:', hasAudioSender);

        // Broadcast presence after media is attached so other peer knows we are ready with tracks
        console.log('[WebRTC] PEER_PRESENCE_SENT');
        signaling.sendSignal('peer-presence', {
          userId: currentUserId,
          role: currentUserRole,
          name: currentUserName
        });

        // If Doctor and ready with tracks, initiate offer
        if (isDoctor && triggerOffer) {
          setTimeout(() => {
            if (triggerOffer) triggerOffer();
          }, 200);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      isMounted = false;
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiagnostics(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all ${
              showDiagnostics
                ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle WebRTC Connection Diagnostics"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Diagnostics</span>
          </button>

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

      {/* On-Screen WebRTC Diagnostics HUD */}
      {showDiagnostics && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-3 text-xs text-slate-300 backdrop-blur-md relative z-40 transition-all shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
            <div className="flex items-center gap-2 font-mono font-bold text-white text-[13px]">
              <Activity className="w-4 h-4 text-primary-400 animate-pulse" />
              <span>WebRTC Diagnostics (Real-Time HUD)</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRetryMedia}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1 transition-colors"
                title="Re-request camera & microphone access"
              >
                <RefreshCw className="w-3 h-3" /> Retry Media
              </button>
              <button
                onClick={handleManualReconnect}
                className="px-2.5 py-1 rounded-lg bg-primary-900/80 hover:bg-primary-800 text-primary-200 border border-primary-700 text-[11px] flex items-center gap-1 transition-colors"
                title="Restart ICE and re-negotiate WebRTC offer"
              >
                <RefreshCw className="w-3 h-3" /> Restart WebRTC
              </button>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Minimize diagnostics panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {connectionError && (
            <div className="mb-2 p-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>Error: {connectionError}</span>
              </div>
              <button
                onClick={handleManualReconnect}
                className="px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white font-bold text-[10px]"
              >
                Reconnect
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-[11px]">
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">ROOM & ROLE</span>
              <span className="text-primary-300 font-bold truncate block">{appointment.bookingId || appointment.id}</span>
              <span className="text-slate-400">{isDoctor ? 'Doctor (Caller)' : 'Patient (Callee)'}</span>
              <span className="text-[10px] text-slate-500 block truncate">{remotePeerPresent ? 'Peer: In Room' : 'Peer: Waiting'}</span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">LOCAL TRACKS</span>
              <span className={hasRealStream && isCamOn ? 'text-emerald-400 font-bold block truncate' : 'text-amber-400 block truncate'}>
                Cam: {isCamOn ? localVideoResolution || 'Active' : 'Off'}
              </span>
              <span className={isMicOn ? 'text-slate-300 block' : 'text-rose-400 block'}>
                Mic: {isMicOn ? 'Live (Sending)' : 'Muted'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">ICE & TURN RELAY</span>
              <span className={`font-bold block ${
                iceConnectionState === 'connected' || iceConnectionState === 'completed'
                  ? 'text-emerald-400'
                  : iceConnectionState === 'checking'
                  ? 'text-amber-400'
                  : iceConnectionState === 'failed'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}>
                ICE: {iceConnectionState.toUpperCase()}
              </span>
              <span className={isTurnActive ? 'text-emerald-400 font-semibold truncate block text-[10px]' : 'text-amber-400 truncate block text-[10px]'}>
                TURN: {isTurnActive ? 'Active (Relay Ready)' : 'Not Set (P2P Only)'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">PEER & SDP STATE</span>
              <span className={`font-bold block ${
                peerConnectionState === 'connected'
                  ? 'text-emerald-400'
                  : peerConnectionState === 'connecting'
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}>
                PC: {peerConnectionState.toUpperCase()}
              </span>
              <span className="text-slate-400 truncate block text-[10px]">{offerAnswerState}</span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">REMOTE TRACKS</span>
              <span className={hasRemoteVideo ? 'text-emerald-400 font-bold block truncate' : 'text-slate-500 block truncate'}>
                Video: {hasRemoteVideo ? remoteVideoResolution || 'Received' : 'Waiting'}
              </span>
              <span className={hasRemoteAudio ? (isAudioAutoplayBlocked ? 'text-amber-400 font-bold block' : 'text-emerald-400 block') : 'text-slate-500 block'}>
                Audio: {hasRemoteAudio ? (isAudioAutoplayBlocked ? 'Blocked (Autoplay)' : 'Playing') : 'Waiting'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">LAST SIGNAL & PAIR</span>
              <span className="text-tealAccent-300 font-bold truncate block">{lastSignalEvent}</span>
              <span className="text-tealAccent-400 truncate block text-[10px]" title={selectedCandidatePair}>
                {selectedCandidatePair}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Media Error Notice Banner */}
      {mediaError && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{mediaError}</span>
          </div>
          <button
            onClick={handleRetryMedia}
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
            {/* Dedicated Persistent Remote Audio Element */}
            <audio ref={remoteAudioRef} autoPlay playsInline />

            {/* Remote Feed Display */}
            <div className="w-full h-full relative flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain md:object-cover transition-opacity duration-300 ${
                  hasRemoteVideo || peerConnected ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                }`}
              />

              {/* Tap to Enable Audio Banner (Mobile browser autoplay policy handler) */}
              {(isAudioAutoplayBlocked || isRemoteAudioMuted) && (hasRemoteAudio || hasRemoteVideo || peerConnected) && (
                <div className="absolute top-4 right-4 z-30">
                  <button
                    onClick={handleEnableAudioClick}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer border-2 border-amber-200 transition-all active:scale-95"
                  >
                    <VolumeX className="w-4 h-4 text-slate-950" />
                    <span>Tap to Enable Audio</span>
                  </button>
                </div>
              )}

              {/* Tap to Play Fallback if browser rejected video playback */}
              {autoplayBlocked && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <button
                    onClick={handleEnableRemoteVideoClick}
                    className="px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm shadow-xl flex items-center gap-2 animate-bounce cursor-pointer active:scale-95 transition-transform"
                  >
                    <Video className="w-5 h-5" /> Enable Remote Video (Tap to Play)
                  </button>
                  <p className="text-xs text-slate-300 mt-2 text-center">Browser autoplay policy paused the incoming video stream.</p>
                </div>
              )}

              {/* Remote Peer Name Overlay when connected */}
              {(peerConnected || hasRemoteVideo) && (
                <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-2 z-20 border border-slate-700/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isDoctor ? appointment.patientName : doctorDisplayName}</span>
                  {remoteVideoResolution && (
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {remoteVideoResolution}
                    </span>
                  )}
                  {hasRemoteAudio && (
                    <Volume2 className={`w-3.5 h-3.5 ${isRemoteAudioMuted ? 'text-amber-400' : 'text-emerald-400'}`} />
                  )}
                </div>
              )}

              {/* Waiting for Peer Placeholder */}
              {(!peerConnected && !hasRemoteVideo) && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-0">
                  <div className="space-y-4 max-w-md">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-primary-500/30 flex items-center justify-center mx-auto text-primary-400">
                      <Radio className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">
                        {peerLeft 
                          ? 'Participant Left Room' 
                          : remotePeerPresent
                            ? isDoctor
                              ? `${appointment.patientName} is in the room`
                              : `${doctorDisplayName} is in the room`
                            : isDoctor 
                              ? `Waiting for ${appointment.patientName} to join` 
                              : `Waiting for ${doctorDisplayName} to join`}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {peerLeft
                          ? 'The other party disconnected. You may wait for them to reconnect or exit the room.'
                          : remotePeerPresent
                            ? 'Both participants have entered the consultation room. Establishing encrypted WebRTC media peer connection...'
                            : `Realtime signaling active on room ${appointment.bookingId || appointment.id}. Remote video will stream as soon as the other participant connects.`}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 text-xs text-slate-300 font-mono">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      {remotePeerPresent ? (isConnectionDelayed ? 'P2P negotiation delayed...' : 'Negotiating WebRTC stream...') : 'Waiting for peer WebRTC handshake...'}
                    </div>

                    {isConnectionDelayed && !peerConnected && (
                      <div className="p-3 bg-amber-950/80 border border-amber-600/80 rounded-xl text-amber-200 text-left space-y-2 max-w-sm mx-auto shadow-lg">
                        <div className="flex items-center gap-2 font-semibold text-xs text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>P2P Direct Negotiation Delayed</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Direct P2P connection blocked by Symmetric NAT / Mobile Firewall. STUN candidates cannot peer directly. A configured TURN relay server is required for this cross-network call.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={handleManualReconnect}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Restart WebRTC Handshake
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Signaling Status Badge */}
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold border border-slate-700 text-slate-200 flex items-center gap-1.5 z-20">
              <ShieldCheck className="w-3.5 h-3.5 text-tealAccent-400" />
              <span>{signalingStatus}</span>
            </div>

            {/* Self Video Picture-in-Picture */}
            <div className="absolute bottom-4 right-4 w-28 h-36 sm:w-44 sm:h-32 md:w-48 md:h-36 rounded-xl bg-slate-800 border-2 border-slate-700 shadow-2xl overflow-hidden z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  isScreenSharing ? '' : '-scale-x-100'
                } ${hasRealStream && isCamOn ? 'opacity-100' : 'opacity-0'}`}
              />
              {(!hasRealStream || !isCamOn) && (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-900 p-2 text-center absolute inset-0">
                  <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                  <span className="text-[11px]">{!isCamOn ? 'Camera Off' : mediaError ? 'Camera Error' : 'Starting Camera...'}</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold z-10 pointer-events-none text-slate-200 flex items-center gap-1">
                <span>You ({isDoctor ? 'Doctor' : 'Patient'})</span>
                {localVideoResolution && <span className="font-mono text-primary-300">[{localVideoResolution}]</span>}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="mt-4 py-3 px-4 sm:px-6 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={toggleMic}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all ${
                isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleCam}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all ${
                isCamOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={isCamOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all ${
                isScreenSharing ? 'bg-primary-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(prev => !prev)}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all lg:hidden ${
                isMobileSidebarOpen ? 'bg-primary-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
              title={isMobileSidebarOpen ? 'Hide Chat / Notes' : 'Show Chat / Notes'}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {isDoctor && (
              <button
                onClick={() => setIsRxModalOpen(true)}
                className="px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl bg-tealAccent-600 hover:bg-tealAccent-700 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> Issue Rx
              </button>
            )}

            {isDoctor ? (
              <button
                onClick={handleDoctorEndConsultation}
                className="px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5" /> End Consultation
              </button>
            ) : (
              <button
                onClick={handleLeaveCall}
                className="px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-slate-800 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow border border-slate-700 hover:border-rose-600 flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5" /> Leave Consultation
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className={`w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col ${
          isMobileSidebarOpen ? 'h-72 lg:h-auto' : 'hidden lg:flex'
        }`}>
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
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="px-3 py-3 lg:hidden text-slate-400 hover:text-white border-b-2 border-transparent"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
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
