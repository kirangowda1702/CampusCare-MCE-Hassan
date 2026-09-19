import React from 'react';
import { Calendar, Clock, Video, User, FileText, ChevronRight, XCircle } from 'lucide-react';
import { Appointment } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Link } from 'react-router-dom';

interface AppointmentCardProps {
  appointment: Appointment;
  isDoctorView?: boolean;
  onCancel?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewPatient?: (appointment: Appointment) => void;
  onStartConsultation?: (id: string) => void;
  onComplete?: (id: string) => void;
  onReschedule?: (id: string) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  isDoctorView = false,
  onCancel,
  onAccept,
  onReject,
  onViewPatient,
  onStartConsultation,
  onComplete,
  onReschedule
}) => {
  const isVideo = appointment.consultationType === 'video';
  const isPending = appointment.status === 'pending';
  const isConfirmed = appointment.status === 'confirmed';
  const isInProgress = appointment.status === 'in_progress';

  const bookingTimestamp = appointment.createdAt
    ? new Date(appointment.createdAt).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Recently';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {appointment.bookingId}
            </span>
            <StatusBadge status={appointment.status} size="sm" />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1">
            {isDoctorView ? appointment.patientName : appointment.doctorName}
          </h4>
          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
            {isDoctorView
              ? `USN/ID: ${appointment.patientUSNorEmpId || 'MCE Member'} • ${appointment.serviceName}`
              : `${appointment.doctorSpecialization} • ${appointment.serviceName}`}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
          {isVideo ? <Video className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs mb-4">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-primary-500" />
          <span>{appointment.appointmentDate}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-primary-500" />
          <span>{appointment.timeSlot}</span>
        </div>
        <div className="col-span-2 text-slate-600 dark:text-slate-400 truncate">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Reason: </span>
          {appointment.reason}
        </div>
        <div className="col-span-2 text-[11px] text-slate-400">
          <span>Booked: {bookingTimestamp}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
        <Link
          to={`/appointments/${appointment.id}`}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" /> Details
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Doctor Actions */}
          {isDoctorView && isPending && (
            <>
              {onViewPatient && (
                <button
                  onClick={() => onViewPatient(appointment)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  View Patient
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(appointment.id)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                >
                  Reject
                </button>
              )}
              {onAccept && (
                <button
                  onClick={() => onAccept(appointment.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow"
                >
                  Accept
                </button>
              )}
            </>
          )}

          {isDoctorView && isConfirmed && onStartConsultation && (
            <button
              onClick={() => onStartConsultation(appointment.id)}
              className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors shadow flex items-center gap-1"
            >
              <Video className="w-3.5 h-3.5" /> Start Consult
            </button>
          )}

          {isDoctorView && isInProgress && onComplete && (
            <button
              onClick={() => onComplete(appointment.id)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow"
            >
              ✓ Complete
            </button>
          )}

          {/* Student / Patient Actions */}
          {(isConfirmed || isInProgress) && isVideo && (
            <Link
              to={`/consultation/${appointment.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow transition-all animate-pulse-subtle"
            >
              <Video className="w-3.5 h-3.5" /> Join Video Consultation
            </Link>
          )}

          {!isDoctorView && isConfirmed && onCancel && (
            <button
              onClick={() => onCancel(appointment.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
              title="Cancel Appointment"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
