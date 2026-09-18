import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Video,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Users,
  Activity,
  ShieldCheck,
  Stethoscope,
  Pill,
  Power,
  Settings,
  Save,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { AppointmentCard } from '../components/cards/AppointmentCard';
import { PrescriptionModal } from '../features/prescriptions/PrescriptionModal';
import { doctorAvailabilityService } from '../services/doctorAvailabilityService';
import { DoctorAvailability } from '../types';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { appointments, updateStatus } = useAppointments();
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'today' | 'upcoming' | 'completed' | 'cancelled' | 'availability'>('pending');
  const [selectedPatientForRx, setSelectedPatientForRx] = useState<{ name: string; id: string; aptId: string } | null>(null);

  // Doctor Availability Configuration State
  const [availability, setAvailability] = useState<DoctorAvailability>({
    id: 'avail-campus-001',
    doctorId: user?.doctorId || user?.id || 'doc-1',
    dayOfWeek: 'Daily',
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    isOnlineEnabled: true,
    isInPersonEnabled: true,
    isActive: true
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const docId = user?.doctorId || user?.id || 'doc-1';
    doctorAvailabilityService.getAvailabilities(docId).then(rules => {
      if (rules && rules.length > 0) {
        setAvailability(rules[0]);
      }
    });
  }, [user]);

  const todayStr = new Date().toISOString().split('T')[0];

  const doctorAppointments = appointments.filter(
    a => !user?.doctorId || a.doctorId === user.doctorId || a.doctorId === user.id || a.doctorId === 'doc-1'
  );

  const pendingAppointments = doctorAppointments.filter(a => a.status === 'pending');
  const confirmedAppointments = doctorAppointments.filter(a => a.status === 'confirmed');
  const todayAppointments = doctorAppointments.filter(
    a => a.appointmentDate === todayStr && (a.status === 'confirmed' || a.status === 'in_progress')
  );
  const upcomingAppointments = doctorAppointments.filter(
    a => a.appointmentDate > todayStr && a.status === 'confirmed'
  );
  const completedAppointments = doctorAppointments.filter(a => a.status === 'completed');
  const cancelledAppointments = doctorAppointments.filter(
    a => a.status === 'cancelled' || a.status === 'rejected'
  );

  const getTabAppointments = () => {
    switch (activeTab) {
      case 'pending': return pendingAppointments;
      case 'confirmed': return confirmedAppointments;
      case 'today': return todayAppointments;
      case 'upcoming': return upcomingAppointments;
      case 'completed': return completedAppointments;
      case 'cancelled': return cancelledAppointments;
      default: return doctorAppointments;
    }
  };

  const handleStartConsultation = async (id: string) => {
    await updateStatus(id, 'in_progress');
    navigate(`/consultation/${id}`);
  };

  const handleCompleteConsultation = async (id: string) => {
    const apt = appointments.find(a => a.id === id);
    await updateStatus(id, 'completed');
    if (apt) {
      setSelectedPatientForRx({
        name: apt.patientName,
        id: apt.patientId,
        aptId: apt.id
      });
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    await doctorAvailabilityService.saveAvailability(availability);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'}
            alt="Doctor"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold">{user?.fullName || 'Dr. Priya Rao'}</h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                MCE Medical Officer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user?.specialization || 'General Medicine & Campus Physician'} • License: {user?.licenseNumber || 'KMC/2012/67843'}
            </p>
          </div>
        </div>

        {/* Doctor Availability Switcher */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
          <div>
            <div className="text-xs font-bold">Clinical Duty Status</div>
            <div className="text-[11px] text-slate-400">
              {isAvailable ? 'Accepting Teleconsultations' : 'Offline / In Clinic'}
            </div>
          </div>
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isAvailable ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isAvailable ? 'Online' : 'Offline'}
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">Pending Requests</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{pendingAppointments.length}</div>
        </button>

        <button
          onClick={() => setActiveTab('today')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'today'
              ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">Today's Schedule</span>
          <div className="text-2xl font-extrabold text-primary-600 mt-1">{todayAppointments.length}</div>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'completed'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">Completed Consults</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{completedAppointments.length}</div>
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activeTab === 'availability'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">Duty Availability Config</span>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>{availability.startTime} - {availability.endTime}</span>
          </div>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { key: 'pending', label: `Pending (${pendingAppointments.length})` },
          { key: 'confirmed', label: `Confirmed (${confirmedAppointments.length})` },
          { key: 'today', label: `Today (${todayAppointments.length})` },
          { key: 'upcoming', label: `Upcoming (${upcomingAppointments.length})` },
          { key: 'completed', label: `Completed (${completedAppointments.length})` },
          { key: 'cancelled', label: `Cancelled/Declined (${cancelledAppointments.length})` },
          { key: 'availability', label: 'Availability & Slots Setting' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      {activeTab === 'availability' ? (
        /* Doctor Schedule Configuration Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary-600" />
                Doctor Availability & Slot Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your active duty hours, consultation slot duration, and break times. Available booking slots will be generated dynamically.
              </p>
            </div>
            {savedSuccess && (
              <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveAvailability} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Duty Day Schedule</label>
                <select
                  value={availability.dayOfWeek}
                  onChange={e => setAvailability({ ...availability, dayOfWeek: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                >
                  <option value="Daily">Daily (Monday to Sunday)</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Slot Duration</label>
                <select
                  value={availability.slotDurationMinutes}
                  onChange={e => setAvailability({ ...availability, slotDurationMinutes: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                >
                  <option value={15}>15 Minutes (Fast consults)</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes (Recommended standard)</option>
                  <option value={45}>45 Minutes (Detailed clinical)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time (24h)</label>
                <input
                  type="time"
                  value={availability.startTime}
                  onChange={e => setAvailability({ ...availability, startTime: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Time (24h)</label>
                <input
                  type="time"
                  value={availability.endTime}
                  onChange={e => setAvailability({ ...availability, endTime: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Break Start Time (Optional)</label>
                <input
                  type="time"
                  value={availability.breakStartTime || ''}
                  onChange={e => setAvailability({ ...availability, breakStartTime: e.target.value || undefined })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Break End Time (Optional)</label>
                <input
                  type="time"
                  value={availability.breakEndTime || ''}
                  onChange={e => setAvailability({ ...availability, breakEndTime: e.target.value || undefined })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={availability.isOnlineEnabled}
                  onChange={e => setAvailability({ ...availability, isOnlineEnabled: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                Enable Video Consultations
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={availability.isInPersonEnabled}
                  onChange={e => setAvailability({ ...availability, isInPersonEnabled: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                Enable In-Person OPD
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Availability Schedule
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Appointment Cards Grid */
        <div className="space-y-3">
          {getTabAppointments().length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getTabAppointments().map(apt => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  isDoctorView={true}
                  onAccept={id => updateStatus(id, 'confirmed')}
                  onReject={id => updateStatus(id, 'rejected')}
                  onStartConsultation={handleStartConsultation}
                  onComplete={handleCompleteConsultation}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No {activeTab} appointments found
              </div>
              <p className="text-xs text-slate-500">
                New consultation requests and schedule changes will appear here automatically via real-time updates.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prescription Generator Modal */}
      {selectedPatientForRx && (
        <PrescriptionModal
          isOpen={true}
          onClose={() => setSelectedPatientForRx(null)}
          patientName={selectedPatientForRx.name}
          patientId={selectedPatientForRx.id}
          appointmentId={selectedPatientForRx.aptId}
        />
      )}
    </div>
  );
};
