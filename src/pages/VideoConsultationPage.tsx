import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { VideoRoom } from '../features/consultation/VideoRoom';
import { Lock, ArrowLeft, AlertCircle, RefreshCw, Video, Loader2, CheckCircle2 } from 'lucide-react';
import { isAppointmentForDoctor, appointmentService } from '../services/appointmentService';
import { checkAppointmentAccessIST } from '../utils/dateUtils';
import { Appointment } from '../types';

export const VideoConsultationPage: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const { getAppointmentById, refreshAppointments, loading: contextLoading } = useAppointments();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // 1. Direct appointment resolution state if not yet in local context
  const [directAppointment, setDirectAppointment] = useState<Appointment | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState(false);

  // Authoritative appointment object: context first, then direct server/Supabase lookup
  const contextAppointment = routeId ? getAppointmentById(routeId) : undefined;
  const appointment = contextAppointment || directAppointment;

  // 2. Server-side access check state
  const [serverCheckDone, setServerCheckDone] = useState(false);
  const [serverAllowed, setServerAllowed] = useState<boolean | null>(null);
  const [serverMessage, setServerMessage] = useState<string>('');
  const [serverReason, setServerReason] = useState<string>('');
  const [minutesUntil, setMinutesUntil] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasEnteredRoom, setHasEnteredRoom] = useState(false);

  // Directly fetch from database/API if context doesn't have it yet (e.g. direct link or page refresh)
  useEffect(() => {
    if (!routeId || contextAppointment) return;

    let isMounted = true;
    setIsFetchingDirect(true);

    appointmentService
      .getAppointmentById(routeId, user)
      .then(fetched => {
        if (isMounted && fetched) {
          setDirectAppointment(fetched);
        }
      })
      .catch(err => {
        console.warn('[VideoConsultation] Direct appointment fetch warning:', err);
      })
      .finally(() => {
        if (isMounted) setIsFetchingDirect(false);
      });

    return () => {
      isMounted = false;
    };
  }, [routeId, contextAppointment, user]);

  // Periodic interval to verify server authorization and auto-unlock when scheduled time arrives
  useEffect(() => {
    if (!appointment) return;

    // Temporary detailed logging for audit (Requirement 14)
    console.log('[VideoConsultation] route appointment ID:', routeId);
    console.log('[VideoConsultation] fetched appointment ID:', appointment.id);
    console.log('[VideoConsultation] booking ID:', appointment.bookingId);
    console.log('[VideoConsultation] doctor ID:', appointment.doctorId);
    console.log('[VideoConsultation] patient ID:', appointment.patientId);

    let isMounted = true;
    const verifyAccess = async () => {
      setIsVerifying(true);
      try {
        const res = await appointmentService.verifyConsultationAccess(
          { id: appointment.id, bookingId: appointment.bookingId },
          user
        );
        console.log('[VideoConsultation] API response status:', res);
        console.log('[VideoConsultation] consultation access response:', res.allowed, res.reason);

        if (isMounted) {
          setServerAllowed(res.allowed);
          setServerReason(res.reason || '');
          if (res.reason === 'SCHEDULED_TIME_NOT_REACHED' || res.allowed) {
            setServerMessage(res.message);
          }
          if (res.minutesUntil !== undefined) {
            setMinutesUntil(res.minutesUntil);
          }
          setServerCheckDone(true);
        }
      } catch (err) {
        if (isMounted) setServerCheckDone(true);
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    verifyAccess();

    // Recheck every 8 seconds to auto-unlock as soon as scheduled time arrives
    const interval = setInterval(() => {
      verifyAccess();
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [appointment?.id, appointment?.bookingId, user, routeId]);

  // =========================================================================
  // STATE A: Loading
  // =========================================================================
  const isLoading = (contextLoading && !appointment) || isFetchingDirect;
  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 my-12 shadow-sm">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connecting to Consultation Session...</h2>
        <p className="text-xs text-slate-500">
          Verifying appointment details and clinical room access...
        </p>
      </div>
    );
  }

  // =========================================================================
  // STATE B: Appointment genuinely not found
  // =========================================================================
  if (!appointment) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 my-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Consultation Session Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested appointment ({routeId || 'unknown'}) was not found in the health system registry.
        </p>
        <Link
          to="/appointments"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Appointments
        </Link>
      </div>
    );
  }

  // =========================================================================
  // STATE E: Unauthorized Participant
  // =========================================================================
  const isStudentOwner = (role === 'student' || !role) && (
    (user?.id && (user.id === appointment.patientId || user.id === (appointment as any).patient_id)) || 
    (user?.email && user.email.toLowerCase() === (appointment.patientEmail || '').toLowerCase()) ||
    (user?.usn && user.usn === appointment.patientUSNorEmpId)
  );
  const isAssignedDoctor = (role === 'doctor') && isAppointmentForDoctor(appointment, user);
  const isAdmin = role === 'admin';
  const isAuthorized = isStudentOwner || isAssignedDoctor || isAdmin;

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 text-center space-y-4 my-12 shadow-sm">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied: Consultation Locked</h2>
        <p className="text-xs text-slate-500">
          You are not authorized to access this consultation room. Only the assigned doctor and patient can participate.
        </p>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-left space-y-1.5 max-w-sm mx-auto">
          <div className="flex justify-between text-slate-500">
            <span>Booking ID:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{appointment.bookingId}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Attending Doctor:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{appointment.doctorName}</span>
          </div>
        </div>
        <Link
          to="/appointments"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Go to My Appointments
        </Link>
      </div>
    );
  }

  // =========================================================================
  // STATE F: Cancelled / Rejected / Completed / Pending
  // =========================================================================
  const rawStatus = (appointment.status || 'pending').toLowerCase();
  const isPermittedStatus = ['confirmed', 'accepted', 'ready', 'in_progress'].includes(rawStatus);

  if (!isPermittedStatus) {
    let statusTitle = 'Consultation is Not Active';
    let statusMsg = `This consultation currently has status: ${rawStatus.toUpperCase()}.`;
    if (rawStatus === 'pending') {
      statusTitle = 'Appointment Pending Doctor Acceptance';
      statusMsg = 'This appointment is pending doctor acceptance. The video room will become available once confirmed.';
    } else if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
      statusTitle = 'Consultation Cancelled or Declined';
      statusMsg = 'This appointment has been cancelled or declined. The video room is closed.';
    } else if (rawStatus === 'completed') {
      statusTitle = 'Consultation Session Completed';
      statusMsg = 'This consultation session has already concluded.';
    }

    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 my-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{statusTitle}</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {statusMsg}
        </p>
        <Link
          to="/appointments"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Appointments
        </Link>
      </div>
    );
  }

  // =========================================================================
  // STATE C: Appointment Found BUT Scheduled Time Not Reached (Locked)
  // =========================================================================
  const localAccess = checkAppointmentAccessIST(appointment);
  const isTimeReached = localAccess.isAccessible || rawStatus === 'in_progress';
  const isBlockedByServer = serverCheckDone && serverAllowed === false && serverReason === 'SCHEDULED_TIME_NOT_REACHED';
  const isLocked = !isTimeReached || isBlockedByServer;

  if (isLocked) {
    // Strictly ensure no false-positive "Appointment not found" message appears when appointment data exists
    const displayMsg =
      (serverReason === 'SCHEDULED_TIME_NOT_REACHED' && serverMessage) ||
      localAccess.message ||
      `Video consultation will be available at ${appointment.timeSlot}.`;

    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-center space-y-5 my-12 shadow-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Video Consultation Locked
          </h2>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {displayMsg}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Appointments cannot be joined before the scheduled appointment time. The room will automatically unlock at {appointment.timeSlot}.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-left space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Booking ID:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{appointment.bookingId}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Attending Doctor:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{appointment.doctorName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Patient:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{appointment.patientName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Scheduled Slot (IST):</span>
            <span className="font-bold text-primary-600 dark:text-primary-400">
              {appointment.appointmentDate} at {appointment.timeSlot}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              refreshAppointments();
              appointmentService
                .verifyConsultationAccess(
                  { id: appointment.id, bookingId: appointment.bookingId },
                  user
                )
                .then(res => {
                  setServerAllowed(res.allowed);
                  setServerReason(res.reason || '');
                  if (res.reason === 'SCHEDULED_TIME_NOT_REACHED' || res.allowed) {
                    setServerMessage(res.message);
                  }
                  if (res.minutesUntil !== undefined) setMinutesUntil(res.minutesUntil);
                });
            }}
            disabled={isVerifying}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            Check Availability
          </button>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Appointments
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE D: Appointment Found AND Consultation Time Reached (Unlocked)
  // WebRTC only initializes when entering the room
  // =========================================================================
  if (!hasEnteredRoom) {
    const isDoctor = role === 'doctor';
    const ctaText = isDoctor ? 'Start Video Consultation' : 'Join Video Consultation';

    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-center space-y-6 my-12 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <Video className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            Session Unlocked & Active
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Consultation Room Ready
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The scheduled appointment time ({appointment.timeSlot} IST) has arrived. Both doctor and patient can now connect.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-left space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Booking ID:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{appointment.bookingId}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Attending Doctor:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{appointment.doctorName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Patient:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{appointment.patientName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Scheduled Slot:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {appointment.appointmentDate} at {appointment.timeSlot}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setHasEnteredRoom(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-lg shadow-primary-950/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Video className="w-4 h-4" /> {ctaText}
          </button>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>
    );
  }

  // Active Video Consultation Room (WebRTC mounts only upon explicit user entry)
  return (
    <div className="max-w-7xl mx-auto">
      <VideoRoom appointment={appointment} />
    </div>
  );
};
