import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { Video, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';

export const AppointmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAppointmentById, cancelAppointment } = useAppointments();

  const appointment = getAppointmentById(id || '');

  if (!appointment) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Appointment Not Found</h2>
        <Link to="/appointments" className="text-xs text-primary-600 font-bold hover:underline">
          Return to appointments list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500">{appointment.bookingId}</span>
              <StatusBadge status={appointment.status} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {appointment.serviceName}
            </h2>
          </div>

          {appointment.status === 'confirmed' && appointment.consultationType === 'video' && (
            <Link
              to={`/consultation/${appointment.id}`}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow flex items-center gap-1.5 animate-pulse"
            >
              <Video className="w-4 h-4" /> Join Room
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
            <span className="text-slate-500">Doctor in Attendance:</span>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{appointment.doctorName}</div>
            <div className="text-primary-600 font-medium">{appointment.doctorSpecialization}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
            <span className="text-slate-500">Scheduled Date & Time:</span>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {appointment.appointmentDate} at {appointment.timeSlot}
            </div>
            <div className="text-slate-500 capitalize">Mode: {appointment.consultationType}</div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Reason / Reported Symptoms
          </h4>
          <p className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {appointment.reason}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">Booked on {appointment.createdAt.split('T')[0]}</span>
          {appointment.status === 'confirmed' && (
            <button
              onClick={() => {
                cancelAppointment(appointment.id);
                navigate('/appointments');
              }}
              className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
            >
              Cancel Consultation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
