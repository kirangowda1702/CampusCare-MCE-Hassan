import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { AppointmentCard } from '../components/cards/AppointmentCard';
import { Calendar, Plus, Search } from 'lucide-react';

export const AppointmentListPage: React.FC = () => {
  const { appointments, cancelAppointment, updateStatus } = useAppointments();
  const { role } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const isDoctor = role === 'doctor';
  const filtered = appointments.filter(a => {
    if (filterStatus === 'today') {
      if (a.appointmentDate !== todayStr || (a.status === 'cancelled' || a.status === 'rejected')) return false;
    } else if (filterStatus === 'upcoming') {
      if (a.appointmentDate < todayStr || a.status === 'cancelled' || a.status === 'rejected' || a.status === 'completed') return false;
    } else if (filterStatus !== 'all' && a.status !== filterStatus) {
      return false;
    }

    if (searchTerm) {
      const matchName = a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.bookingId.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName) return false;
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            {isDoctor ? 'Doctor Consultation Queue' : 'My Appointments'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track and manage all upcoming, completed, and past consultations with real-time status updates
          </p>
        </div>

        {!isDoctor && (
          <Link
            to="/appointments/book"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Book New Appointment
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'All' },
            { id: 'today', label: "Today's" },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'pending', label: 'Pending' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? 'bg-primary-600 text-white shadow'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search booking ID or doctor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
          filtered.map(apt => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              isDoctorView={isDoctor}
              onCancel={cancelAppointment}
              onAccept={id => updateStatus(id, 'confirmed')}
              onReject={id => updateStatus(id, 'rejected')}
            />
          ))
        ) : (
          <div className="col-span-2 p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            No appointments found matching the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
