import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  Calendar,
  ShieldAlert,
  Activity,
  CheckCircle2,
  TrendingUp,
  Building2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Info,
  Phone,
  Edit,
  Save,
  Clock,
  Hospital
} from 'lucide-react';
import { Doctor, FirstAidCentre, EmergencyContact } from '../types';
import { doctorService } from '../services/doctorService';
import { statsService, PlatformMetrics } from '../services/statsService';
import { mockDoctors } from '../data/doctors';
import { mockHospitals } from '../data/hospitals';
import { useAppointments } from '../context/AppointmentContext';
import { useEmergency } from '../context/EmergencyContext';
import { healthcareDirectoryService } from '../services/healthcareDirectoryService';
import { firstAidService } from '../services/firstAidService';

export const AdminDashboard: React.FC = () => {
  const { appointments } = useAppointments();
  const { emergencyHistory, firstAidCentre, emergencyContacts, refreshFirstAidData } = useEmergency();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalRegisteredUsers: 48,
    totalAppointments: 16,
    activeDoctors: 5,
    activeEmergencyRequests: 0,
    isLiveDatabase: false,
    dataSourceLabel: 'Prototype Demo Metrics'
  });

  useEffect(() => {
    statsService.getMetrics().then(m => setMetrics(m));
    doctorService.getDoctors().then(docs => setDoctors(docs));
  }, []);

  const totalAppointments = appointments.length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const pending = appointments.filter(a => a.status === 'pending').length;

  const totalEmergencies = emergencyHistory.length;
  const activeEmergencies = emergencyHistory.filter(e => !['RESOLVED', 'CANCELLED', 'resolved', 'cancelled'].includes(e.status)).length;
  const referredEmergencies = emergencyHistory.filter(e => e.status === 'REFERRED').length;
  const resolvedEmergencies = emergencyHistory.filter(e => ['RESOLVED', 'resolved'].includes(e.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" /> MCE Campus Health Admin Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            System overview, clinical metrics, First-Aid management, and campus emergency command
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700">
            <span className={'w-2 h-2 rounded-full ' + (metrics.isLiveDatabase ? 'bg-emerald-500' : 'bg-amber-500')} />
            {metrics.dataSourceLabel}
          </span>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Registered</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {metrics.totalRegisteredUsers}
            </h3>
            <span className="text-[10px] text-slate-500">Students & Faculty</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Appointments</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalAppointments}
            </h3>
            <span className="text-[10px] text-emerald-600 font-semibold">{completed} completed</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Hassan Doctors</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {doctors.length || 5}
            </h3>
            <span className="text-[10px] text-purple-600 font-semibold">Verified directory</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Active Campus SOS</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {activeEmergencies}
            </h3>
            <span className="text-[10px] text-rose-600 font-semibold">{totalEmergencies} all-time logged</span>
          </div>
        </div>
      </div>

      {/* Emergency Response Aggregate Statistics */}
      <div className="p-5 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Campus Emergency Response Telemetry & Incident Summary
          </h3>
          <Link
            to="/emergency"
            className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-1"
          >
            Open Live Response Console <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900">
            <span className="text-slate-400 block text-[10px]">Total SOS Requests</span>
            <strong className="text-lg font-bold text-slate-900 dark:text-white">{totalEmergencies}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900">
            <span className="text-slate-400 block text-[10px]">In Progress / Open</span>
            <strong className="text-lg font-bold text-rose-600">{activeEmergencies}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900">
            <span className="text-slate-400 block text-[10px]">Hospital Referrals</span>
            <strong className="text-lg font-bold text-purple-600">{referredEmergencies}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900">
            <span className="text-slate-400 block text-[10px]">Resolved Incidents</span>
            <strong className="text-lg font-bold text-emerald-600">{resolvedEmergencies}</strong>
          </div>
        </div>
      </div>

      {/* Admin First-Aid Centre & Emergency Contacts Management */}
      <AdminFirstAidManagement
        firstAidCentre={firstAidCentre}
        emergencyContacts={emergencyContacts}
        onRefresh={refreshFirstAidData}
      />

      {/* Hassan Healthcare Directory Management */}
      <AdminHealthcareDirectory />
    </div>
  );
};

const AdminFirstAidManagement: React.FC<{
  firstAidCentre: FirstAidCentre;
  emergencyContacts: EmergencyContact[];
  onRefresh: () => Promise<void>;
}> = ({ firstAidCentre, emergencyContacts, onRefresh }) => {
  const [isEditingCentre, setIsEditingCentre] = useState(false);
  const [centreForm, setCentreForm] = useState<FirstAidCentre>(firstAidCentre);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCentreForm(firstAidCentre);
  }, [firstAidCentre]);

  const handleSaveCentre = async () => {
    setIsSaving(true);
    try {
      await firstAidService.updateFirstAidCentre(centreForm);
      await onRefresh();
      setIsEditingCentre(false);
    } catch (e) {
      console.warn('Save first aid centre error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleContactVerified = async (id: string, current: boolean) => {
    await firstAidService.updateEmergencyContact(id, { verified: !current });
    await onRefresh();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            MCE Campus First-Aid Centre & Emergency Directory Configuration
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin management for official First-Aid room details, operating hours, and emergency contacts
          </p>
        </div>

        <button
          onClick={() => setIsEditingCentre(!isEditingCentre)}
          className="px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-xs font-bold hover:bg-primary-100 flex items-center gap-1.5 self-start"
        >
          <Edit className="w-3.5 h-3.5" /> {isEditingCentre ? 'Cancel Edit' : 'Edit First-Aid Centre'}
        </button>
      </div>

      {isEditingCentre ? (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Facility Name:</label>
              <input
                type="text"
                value={centreForm.name}
                onChange={e => setCentreForm({ ...centreForm, name: e.target.value })}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Building & Room:</label>
              <input
                type="text"
                value={centreForm.building + ' - ' + centreForm.roomNumber}
                onChange={e => {
                  const parts = e.target.value.split('-');
                  setCentreForm({ ...centreForm, building: parts[0]?.trim() || '', roomNumber: parts[1]?.trim() || '' });
                }}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Official Direct Phone:</label>
              <input
                type="text"
                value={centreForm.officialPhone || ''}
                placeholder="e.g. +91 8172 240501"
                onChange={e => setCentreForm({ ...centreForm, officialPhone: e.target.value })}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Operating Hours:</label>
              <input
                type="text"
                value={centreForm.operatingHours}
                onChange={e => setCentreForm({ ...centreForm, operatingHours: e.target.value })}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={centreForm.verified}
                onChange={e => setCentreForm({ ...centreForm, verified: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Mark Verified by MCE Official Administration
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleSaveCentre}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save First-Aid Centre
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-400 block text-[10px]">Location:</span>
            <strong className="text-slate-800 dark:text-slate-200">{firstAidCentre.name}</strong>
            <p className="text-slate-500 text-[11px]">{firstAidCentre.building}, {firstAidCentre.roomNumber}</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Direct Phone:</span>
            <strong className="text-slate-800 dark:text-slate-200">
              {firstAidCentre.officialPhone || 'Not Configured (Pending Verification)'}
            </strong>
            <p className="text-slate-500 text-[11px]">{firstAidCentre.operatingHours}</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Verification Status:</span>
            <span className={'px-2 py-0.5 rounded text-[10px] font-bold ' + (
              firstAidCentre.verified
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            )}>
              {firstAidCentre.verified ? 'Verified Official MCE Facility' : 'Pending Official Verification'}
            </span>
          </div>
        </div>
      )}

      {/* Emergency Contacts Table */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Admin Emergency Contacts Roster:
        </h4>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {emergencyContacts.map(c => (
            <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                <span className="text-[10px] text-slate-400 ml-2">({c.category})</span>
                <div className="text-[11px] text-slate-500 font-mono">
                  {c.phone || 'Phone Pending Verification'}
                </div>
              </div>
              <button
                onClick={() => handleToggleContactVerified(c.id, c.verified)}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all ' + (
                  c.verified
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                    : 'bg-emerald-600 text-white'
                )}
              >
                {c.verified ? 'Revoke Verified' : 'Mark Verified'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminHealthcareDirectory: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'hospitals' | 'pharmacies' | 'diagnostics'>('hospitals');
  const [hospitals, setHospitals] = React.useState<any[]>([]);
  const [pharmacies, setPharmacies] = React.useState<any[]>([]);
  const [diagnostics, setDiagnostics] = React.useState<any[]>([]);

  const loadData = async () => {
    const [h, p, d] = await Promise.all([
      healthcareDirectoryService.getHospitals(),
      healthcareDirectoryService.getPharmacies(),
      healthcareDirectoryService.getDiagnosticCentres()
    ]);
    setHospitals(h);
    setPharmacies(p);
    setDiagnostics(d);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            Hassan Healthcare Directory Management
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin oversight, source URL audits, and verified badge management for Hassan institutions
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={'px-3 py-1.5 rounded-xl transition-all ' + (
              activeTab === 'hospitals'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveTab('pharmacies')}
            className={'px-3 py-1.5 rounded-xl transition-all ' + (
              activeTab === 'pharmacies'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            Pharmacies ({pharmacies.length})
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={'px-3 py-1.5 rounded-xl transition-all ' + (
              activeTab === 'diagnostics'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            Diagnostics ({diagnostics.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'hospitals' ? hospitals : activeTab === 'pharmacies' ? pharmacies : diagnostics).map((facility: any) => (
          <div
            key={facility.id}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {facility.category || activeTab}
                </span>
                <span className={'px-2 py-0.5 rounded text-[10px] font-bold ' + (
                  facility.verified
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                )}>
                  {facility.verified ? 'Verified' : 'Pending'}
                </span>
              </div>

              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                {facility.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {facility.address}
              </p>
              {facility.phone && (
                <div className="text-[11px] text-primary-600 dark:text-primary-400 mt-1 font-mono">
                  📞 {facility.phone}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Lat: {facility.lat.toFixed(4)}, Lng: {facility.lng.toFixed(4)}
              </span>
              <button
                onClick={async () => {
                  const nextState = !facility.verified;
                  if (activeTab === 'hospitals') {
                    await healthcareDirectoryService.updateHospitalVerification(facility.id, nextState);
                  } else if (activeTab === 'pharmacies') {
                    await healthcareDirectoryService.updatePharmacyVerification(facility.id, nextState);
                  } else {
                    await healthcareDirectoryService.updateDiagnosticVerification(facility.id, nextState);
                  }
                  await loadData();
                }}
                className={'px-3 py-1 rounded-lg text-xs font-bold transition-all ' + (
                  facility.verified
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 hover:bg-rose-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                )}
              >
                {facility.verified ? 'Revoke Verification' : 'Mark Verified'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
