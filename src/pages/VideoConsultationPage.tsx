import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { VideoRoom } from '../features/consultation/VideoRoom';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';

export const VideoConsultationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getAppointmentById } = useAppointments();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const appointment = getAppointmentById(id || '');

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

  // Access Control Guard
  const isAuthorized = 
    role === 'admin' ||
    user?.id === appointment.patientId ||
    user?.id === appointment.doctorId ||
    user?.doctorId === appointment.doctorId ||
    role === 'doctor';

  const isStatusPermitted = 
    appointment.status === 'confirmed' || 
    appointment.status === 'in_progress';

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

  if (!isStatusPermitted) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 my-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Consultation is Not Active</h2>
        <p className="text-xs text-slate-500">
          This consultation currently has status: <strong className="uppercase">{appointment.status}</strong>. Teleconsultation rooms are only active for confirmed or in-progress appointments.
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

  return (
    <div className="max-w-7xl mx-auto">
      <VideoRoom appointment={appointment} />
    </div>
  );
};
