import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { VideoRoom } from '../features/consultation/VideoRoom';
import { Lock, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { isAppointmentForDoctor, appointmentService } from '../services/appointmentService';
import { checkAppointmentAccessIST } from '../utils/dateUtils';

export const VideoConsultationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getAppointmentById, refreshAppointments } = useAppointments();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const appointment = getAppointmentById(id || '');

  // Access check state
  const [serverCheckDone, setServerCheckDone] = useState(false);
  const [serverAllowed, setServerAllowed] = useState<boolean | null>(null);
  const [serverMessage, setServerMessage] = useState<string>('');
  const [minutesUntil, setMinutesUntil] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Periodic interval to auto-unlock when appointment time arrives
  useEffect(() => {
    if (!appointment) return;

    let isMounted = true;
    const verifyAccess = async () => {
      setIsVerifying(true);
      try {
        const res = await appointmentService.verifyConsultationAccess(appointment.id, user);
        if (isMounted) {
          setServerAllowed(res.allowed);
          setServerMessage(res.message);
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

    // Recheck every 10 seconds to auto-unlock as soon as scheduled time arrives
    const interval = setInterval(() => {
      verifyAccess();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [appointment?.id, user]);

  if (!appointment) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 my-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Consultation Session Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested consultation link does not exist or has expired.
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

  // Access Control Guard: Student can join only own appointment, Doctor can join only assigned appointment
  const isStudentOwner = (role === 'student' || !role) && (
    (user?.id && user.id === appointment.patientId) || 
    (user?.email && user.email.toLowerCase() === appointment.patientEmail?.toLowerCase()) ||
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
        <Link
          to="/appointments"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Go to My Appointments
        </Link>
      </div>
    );
  }

  // Status Check
  const rawStatus = (appointment.status || 'pending').toLowerCase();
  const isPermittedStatus = ['confirmed', 'accepted', 'ready', 'in_progress'].includes(rawStatus);

  if (!isPermittedStatus) {
    let statusMsg = `This consultation currently has status: ${rawStatus.toUpperCase()}.`;
    if (rawStatus === 'pending') {
      statusMsg = 'This appointment is pending doctor acceptance. The video room will become available once confirmed.';
    } else if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
      statusMsg = 'This appointment has been cancelled or declined. The video room is closed.';
    } else if (rawStatus === 'completed') {
      statusMsg = 'This consultation session has already concluded.';
    }

    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 my-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Consultation is Not Active</h2>
        <p className="text-xs text-slate-500">
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

  // Evaluate IST Scheduled Time Check (Both Local & Server Verification)
  const localAccess = checkAppointmentAccessIST(appointment);
  const isBlockedByServer = serverCheckDone && serverAllowed === false;
  const isBlockedByLocal = !localAccess.isAccessible && rawStatus !== 'in_progress';
  const isLocked = isBlockedByServer || isBlockedByLocal;

  if (isLocked) {
    const displayMsg = serverMessage || localAccess.message || `Video consultation will be available at ${appointment.timeSlot}.`;
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
            <span className="font-bold text-primary-600 dark:text-primary-400">{appointment.appointmentDate} at {appointment.timeSlot}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              refreshAppointments();
              appointmentService.verifyConsultationAccess(appointment.id, user).then(res => {
                setServerAllowed(res.allowed);
                setServerMessage(res.message);
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

  return (
    <div className="max-w-7xl mx-auto">
      <VideoRoom appointment={appointment} />
    </div>
  );
};
