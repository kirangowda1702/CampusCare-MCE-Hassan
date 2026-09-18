import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Video,
  Pill,
  Sparkles,
  ShieldAlert,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  Activity,
  Heart,
  Stethoscope,
  Building2,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useMedical } from '../context/MedicalContext';
import { useEmergency } from '../context/EmergencyContext';
import { AppointmentCard } from '../components/cards/AppointmentCard';
import { ReminderCard } from '../components/cards/ReminderCard';
import { PrescriptionCard } from '../components/cards/PrescriptionCard';
import { MedicalRecordCard } from '../components/cards/MedicalRecordCard';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { appointments, cancelAppointment } = useAppointments();
  const { reminders, toggleReminderStatus, prescriptions, records } = useMedical();
  const { setIsEmergencyModalOpen } = useEmergency();

  const userAppointments = appointments.filter(a => a.patientRole === 'student' || a.patientId === user?.id);
  const upcomingApt = userAppointments.find(a => a.status === 'confirmed' || a.status === 'pending');
  const userPrescriptions = prescriptions.slice(0, 2);
  const recentRecords = records.slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-primary-700 via-primary-600 to-tealAccent-600 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              MCE Campus Health Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName || 'Rahul Sharma'}!
            </h1>
            <p className="text-xs sm:text-sm text-primary-100 max-w-xl">
              USN: <span className="font-mono font-bold text-white">{user?.usn || '4MC21CS089'}</span> • {user?.branch || 'Computer Science & Engineering'} • Semester {user?.semester || 7}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/appointments/book"
              className="px-5 py-2.5 rounded-xl bg-white text-primary-700 hover:bg-primary-50 font-bold text-xs shadow transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-primary-600" /> Book Doctor
            </Link>
            <Link
              to="/symptom-checker"
              className="px-5 py-2.5 rounded-xl bg-primary-800/80 hover:bg-primary-900/80 text-white border border-primary-400/30 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-tealAccent-400" /> AI Guidance
            </Link>
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-900/30 flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" /> SOS
            </button>
          </div>
        </div>
      </div>

      {/* Primary Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upcoming Appointment & Active Medicine Schedule */}
        <div className="lg:col-span-8 space-y-6">
          {/* Next Confirmed Appointment Alert */}
          {upcomingApt ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-600" /> Next Scheduled Consultation
                </h3>
                <Link to="/appointments" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                  View All ({userAppointments.length})
                </Link>
              </div>
              <AppointmentCard appointment={upcomingApt} onCancel={cancelAppointment} />
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">No Appointments Today</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Need medical advice or experiencing symptoms? Book a free appointment with an MCE doctor.
              </p>
              <Link
                to="/appointments/book"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow"
              >
                <Plus className="w-4 h-4" /> Book Consultation
              </Link>
            </div>
          )}

          {/* Active Medicine Reminders Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary-600" /> Today's Medicine Reminders
              </h3>
              <Link to="/medications" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Manage Pill Tracker ({reminders.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reminders.slice(0, 4).map(rem => (
                <ReminderCard
                  key={rem.id}
                  reminder={rem}
                  onStatusChange={toggleReminderStatus}
                />
              ))}
            </div>
          </div>

          {/* Recent Digital Prescriptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" /> Active Prescriptions
              </h3>
              <Link to="/prescriptions" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                View All Prescriptions
              </Link>
            </div>

            <div className="space-y-3">
              {userPrescriptions.map(rx => (
                <PrescriptionCard key={rx.id} prescription={rx} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Health Status Overview & Emergency Access */}
        <div className="lg:col-span-4 space-y-6">
          {/* Health Profile Snapshot */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" /> Student Health Card
              </h4>
              <Link to="/profile" className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Edit Details
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Blood Group</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{user?.bloodGroup || 'O+ Positive'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Drug Allergies</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                  {user?.allergies?.join(', ') || 'Penicillin'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Emergency Contact:</div>
              <div className="font-bold text-slate-800 dark:text-slate-200">{user?.emergencyContactName || 'Rajesh Sharma (Parent)'}</div>
              <div className="text-slate-600 dark:text-slate-400 font-mono">{user?.emergencyContactPhone || '+91 94480 11223'}</div>
            </div>
          </div>

          {/* Quick AI Symptom Checker Widget */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 border border-indigo-800 shadow-md space-y-3">
            <div className="flex items-center gap-2 text-tealAccent-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> AI Symptom Guidance
            </div>
            <h4 className="font-bold text-sm">Feeling unwell or confused about symptoms?</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Answer 4 quick questions about your symptoms to receive instant severity triage & campus specialist recommendations.
            </p>
            <Link
              to="/symptom-checker"
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-tealAccent-500 hover:bg-tealAccent-600 text-slate-950 text-xs font-bold shadow transition-all"
            >
              Start Symptom Check <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Recent E-Vault Records */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Medical E-Vault
              </h4>
              <Link to="/medical-records" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                View All ({records.length})
              </Link>
            </div>
            <div className="space-y-3">
              {recentRecords.map(rec => (
                <MedicalRecordCard key={rec.id} record={rec} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
