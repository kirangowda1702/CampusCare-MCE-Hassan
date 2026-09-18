import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Heart,
  Pill,
  Sparkles,
  ShieldAlert,
  FileText,
  Clock,
  CheckCircle2,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useMedical } from '../context/MedicalContext';
import { useEmergency } from '../context/EmergencyContext';
import { AppointmentCard } from '../components/cards/AppointmentCard';
import { PrescriptionCard } from '../components/cards/PrescriptionCard';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { appointments, cancelAppointment } = useAppointments();
  const { prescriptions } = useMedical();
  const { setIsEmergencyModalOpen } = useEmergency();

  const userAppointments = appointments.filter(a => a.patientRole === 'faculty' || a.patientId === user?.id);

  return (
    <div className="space-y-6">
      {/* Faculty Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <BookOpen className="w-4 h-4 text-purple-300" />
              MCE Faculty & Staff Healthcare Desk
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.fullName || 'Prof. Suresh Kumar H.N.'}!
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 max-w-xl">
              Employee ID: <span className="font-mono font-bold text-white">{user?.employeeId || 'MCE-FAC-CSE-014'}</span> • {user?.department || 'Department of Computer Science & Engg.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/appointments/book"
              className="px-5 py-2.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs shadow transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-purple-700" /> Book Health Check
            </Link>
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" /> SOS Emergency
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Appointments List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-600" /> Scheduled Consultations ({userAppointments.length})
              </h3>
              <Link to="/appointments/book" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Book New
              </Link>
            </div>

            <div className="space-y-3">
              {userAppointments.length > 0 ? (
                userAppointments.map(apt => (
                  <AppointmentCard key={apt.id} appointment={apt} onCancel={cancelAppointment} />
                ))
              ) : (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500">
                  No upcoming faculty consultations.
                </div>
              )}
            </div>
          </div>

          {/* Prescriptions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-600" /> Medical Prescriptions & Advice
            </h3>
            <div className="space-y-3">
              {prescriptions.slice(0, 1).map(rx => (
                <PrescriptionCard key={rx.id} prescription={rx} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Info Cards */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" /> Faculty Wellness Profile
            </h4>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Blood Group:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user?.bloodGroup || 'B+ Positive'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Emergency Contact:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user?.emergencyContactPhone || '+91 98451 98766'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Annual Checkup Status:</span>
                <span className="font-bold text-emerald-600">Completed (Valid 2026)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
