import React, { useState, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { HealthcareMap } from '../components/maps/HealthcareMap';
import { firstAidService } from '../services/firstAidService';
import { mockHospitals } from '../data/hospitals';
import {
  ShieldAlert,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  UserCheck,
  Building2,
  AlertCircle,
  FileText,
  Hospital as HospitalIcon,
  ExternalLink,
  Shield,
  Activity,
  ArrowRight,
  Send,
  AlertTriangle
} from 'lucide-react';
import { EmergencyCampusStatus, HospitalReferral } from '../types';

export const EmergencyPage: React.FC = () => {
  const {
    setIsEmergencyModalOpen,
    activeEmergency,
    emergencyHistory,
    firstAidCentre,
    emergencyContacts,
    updateWorkflowStatus,
    cancelActiveEmergency
  } = useEmergency();

  const { role, user } = useAuth();
  const isResponderOrAdmin = role === 'admin' || role === 'doctor' || role === 'faculty';

  // Referral Modal State
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | null>(null);
  const [referralHospitalId, setReferralHospitalId] = useState<string>('hosp-hims');
  const [referralReason, setReferralReason] = useState<string>('');
  const [referralsList, setReferralsList] = useState<HospitalReferral[]>([]);

  // Assign Responder Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [responderNameInput, setResponderNameInput] = useState('Dr. Priya Rao (Campus MO)');

  useEffect(() => {
    if (activeEmergency) {
      firstAidService.getReferralsForEmergency(activeEmergency.id).then(refs => {
        setReferralsList(refs);
      });
    }
  }, [activeEmergency]);

  const handleOpenReferral = (emergencyId: string) => {
    setSelectedEmergencyId(emergencyId);
    setIsReferralModalOpen(true);
  };

  const handleConfirmReferral = async () => {
    if (!selectedEmergencyId) return;
    const targetHosp = mockHospitals.find(h => h.id === referralHospitalId);
    await firstAidService.createHospitalReferral({
      emergencyRequestId: selectedEmergencyId,
      hospitalId: referralHospitalId,
      hospitalName: targetHosp?.name || 'HIMS Govt Teaching Hospital',
      referredBy: user?.fullName || 'Campus Emergency Responder',
      reason: referralReason || 'Requires regional trauma / advanced surgical care',
      status: 'REFERRED'
    });

    await updateWorkflowStatus(selectedEmergencyId, 'REFERRED', {
      referredHospitalId: referralHospitalId,
      referralReason: referralReason
    });

    setIsReferralModalOpen(false);
    setReferralReason('');
  };

  const handleConfirmAssign = async () => {
    if (!selectedEmergencyId) return;
    await updateWorkflowStatus(selectedEmergencyId, 'RESPONDER_ASSIGNED', {
      responderName: responderNameInput
    });
    setIsAssignModalOpen(false);
  };

  const getStatusBadgeColor = (status: EmergencyCampusStatus) => {
    switch (status) {
      case 'REQUESTED': return 'bg-rose-600 text-white animate-pulse';
      case 'ACKNOWLEDGED': return 'bg-amber-500 text-white';
      case 'RESPONDER_ASSIGNED': return 'bg-blue-600 text-white';
      case 'ASSISTANCE_IN_PROGRESS': return 'bg-indigo-600 text-white';
      case 'REFERRED': return 'bg-purple-600 text-white';
      case 'RESOLVED':
      case 'resolved': return 'bg-emerald-600 text-white';
      case 'CANCELLED':
      case 'cancelled': return 'bg-slate-500 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Page Title & MCE Institutional Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-rose-600" />
          Campus Emergency Response & First-Aid Centre
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Malnad College of Engineering (MCE), Hassan — First-Aid Triage & Regional Trauma Escalation
        </p>
      </div>

      {/* Critical Medical Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">Campus Response vs External Emergency Services:</strong>
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            CampusCare coordinates on-campus first-aid assistance with MCE health staff and campus security. CampusCare does <strong>NOT</strong> independently dispatch an ambulance. For critical medical collapse, acute trauma, or road accidents in Hassan, immediately dial national emergency <strong>108</strong> (Govt Ambulance) or <strong>112</strong>.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. STUDENT ACTIVE EMERGENCY LIVE STATUS & TIMELINE */}
      {/* ======================================================== */}
      {activeEmergency && (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center animate-pulse shadow-md shadow-rose-600/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeColor(activeEmergency.status)}`}>
                  Status: {activeEmergency.status.replace(/_/g, ' ')}
                </span>
                <h3 className="text-lg font-bold text-rose-900 dark:text-rose-100 mt-1">
                  Emergency #{activeEmergency.id.slice(-6)} — {activeEmergency.emergencyType}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelActiveEmergency}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <XCircle className="w-4 h-4" /> Cancel SOS
              </button>
            </div>
          </div>

          {/* Details Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-400 block text-[11px]">Location Details:</span>
              <strong className="text-slate-800 dark:text-slate-200">{activeEmergency.locationDetails}</strong>
              <div className="text-[10px] mt-0.5">
                {activeEmergency.latitude && activeEmergency.longitude ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    📍 GPS Fixed: {activeEmergency.latitude.toFixed(4)}°, {activeEmergency.longitude.toFixed(4)}°
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Precise location was not shared.</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Caller Contact:</span>
              <strong className="text-slate-800 dark:text-slate-200">{activeEmergency.callerPhone}</strong>
              <div className="text-[10px] text-slate-400">{activeEmergency.callerName}</div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Campus Responder:</span>
              <strong className="text-primary-600 dark:text-primary-400">
                {activeEmergency.responderName || 'MCE First-Aid Duty Staff'}
              </strong>
            </div>
          </div>

          {/* Live Timeline Progression */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              CampusCare Real-Time Response Timeline:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center text-xs">
              <div className={`p-2.5 rounded-xl border ${activeEmergency.status ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400'}`}>
                <div className="font-bold text-[11px]">1. Requested</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-80">
                  {new Date(activeEmergency.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${activeEmergency.firstAidContactedAt || ['ACKNOWLEDGED', 'RESPONDER_ASSIGNED', 'ASSISTANCE_IN_PROGRESS', 'REFERRED', 'RESOLVED'].includes(activeEmergency.status) ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400'}`}>
                <div className="font-bold text-[11px]">2. Acknowledged</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-80">
                  {activeEmergency.firstAidContactedAt ? new Date(activeEmergency.firstAidContactedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${activeEmergency.responderAssignedAt || ['RESPONDER_ASSIGNED', 'ASSISTANCE_IN_PROGRESS', 'REFERRED', 'RESOLVED'].includes(activeEmergency.status) ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400'}`}>
                <div className="font-bold text-[11px]">3. Responder</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-80">
                  {activeEmergency.responderAssignedAt ? new Date(activeEmergency.responderAssignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${activeEmergency.assistanceStartedAt || ['ASSISTANCE_IN_PROGRESS', 'REFERRED', 'RESOLVED'].includes(activeEmergency.status) ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400'}`}>
                <div className="font-bold text-[11px]">4. In Progress</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-80">
                  {activeEmergency.assistanceStartedAt ? new Date(activeEmergency.assistanceStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${activeEmergency.referredAt || activeEmergency.status === 'REFERRED' ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 text-purple-800 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400'}`}>
                <div className="font-bold text-[11px]">5. Referred</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-80">
                  {activeEmergency.referredAt ? new Date(activeEmergency.referredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Optional'}
                </div>
              </div>

              <div className={`p-2.5 rounded-xl border ${activeEmergency.resolvedAt || ['RESOLVED', 'resolved'].includes(activeEmergency.status) ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400'}`}>
                <div className="font-bold text-[11px]">6. Resolved</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-80">
                  {activeEmergency.resolvedAt ? new Date(activeEmergency.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Referrals List if any */}
          {referralsList.length > 0 && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2 text-xs">
              <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <HospitalIcon className="w-4 h-4 text-purple-600" />
                Hospital Referral Initiated
              </h4>
              {referralsList.map(ref => (
                <div key={ref.id} className="text-purple-800 dark:text-purple-300">
                  Transferred to: <strong>{ref.hospitalName}</strong> • Reason: {ref.reason} (Referred by {ref.referredBy})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. FIRST-AID RESPONDER ACTION CONSOLE (Admin/Doctor/Staff) */}
      {/* ======================================================== */}
      {isResponderOrAdmin && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary-600" />
              First-Aid Responder & Emergency Dispatch Control
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-[10px] font-bold">
              {role.toUpperCase()} ACCESS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time interface for authorized on-duty campus medical officers, security chiefs, and first-aid staff.
          </p>

          {activeEmergency ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Active Incident #{activeEmergency.id.slice(-6)} ({activeEmergency.emergencyType})
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Caller: {activeEmergency.callerName} ({activeEmergency.callerPhone}) • Location: {activeEmergency.locationDetails}
                  </div>
                </div>
                <div className="text-xs font-bold text-rose-600">
                  Current Status: {activeEmergency.status}
                </div>
              </div>

              {/* Responder Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => updateWorkflowStatus(activeEmergency.id, 'ACKNOWLEDGED')}
                  disabled={activeEmergency.status !== 'REQUESTED'}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold shadow transition-all"
                >
                  1. Acknowledge
                </button>

                <button
                  onClick={() => {
                    setSelectedEmergencyId(activeEmergency.id);
                    setIsAssignModalOpen(true);
                  }}
                  disabled={['RESOLVED', 'CANCELLED'].includes(activeEmergency.status)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold shadow transition-all"
                >
                  2. Assign Responder
                </button>

                <button
                  onClick={() => updateWorkflowStatus(activeEmergency.id, 'ASSISTANCE_IN_PROGRESS')}
                  disabled={['ASSISTANCE_IN_PROGRESS', 'REFERRED', 'RESOLVED', 'CANCELLED'].includes(activeEmergency.status)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold shadow transition-all"
                >
                  3. Start Assistance
                </button>

                <button
                  onClick={() => handleOpenReferral(activeEmergency.id)}
                  disabled={['RESOLVED', 'CANCELLED'].includes(activeEmergency.status)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold shadow transition-all"
                >
                  4. Refer to Hospital
                </button>

                <button
                  onClick={() => updateWorkflowStatus(activeEmergency.id, 'RESOLVED')}
                  disabled={['RESOLVED', 'CANCELLED'].includes(activeEmergency.status)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold shadow transition-all"
                >
                  5. Resolve Incident
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500">
              ✅ No active emergencies in queue. All recent incidents resolved.
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN SOS TRIGGER HERO */}
      {/* ======================================================== */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
              Emergency Broadcast Center
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Instant Campus SOS Response</h2>
            <p className="text-xs sm:text-sm text-rose-100 max-w-xl">
              Activate the campus medical emergency broadcast to notify on-duty staff, safety coordinators, and record incident telemetry with permission-gated GPS.
            </p>
          </div>

          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className="px-8 py-4 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 font-extrabold text-sm shadow-2xl shadow-black/40 flex items-center gap-2 transform hover:scale-105 transition-all flex-shrink-0"
          >
            <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
            ACTIVATE CAMPUS SOS
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MCE CAMPUS FIRST-AID CENTRE CARD */}
      {/* ======================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Primary Campus Facility
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              {firstAidCentre.name}
            </h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            firstAidCentre.verified
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          }`}>
            {firstAidCentre.verified ? 'Verified Campus Facility' : 'First-Aid Centre information pending official verification.'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Location & Room:</span>
            <strong className="text-slate-800 dark:text-slate-200">
              {firstAidCentre.building}, {firstAidCentre.roomNumber}
            </strong>
            <p className="text-[11px] text-slate-500 mt-0.5">{firstAidCentre.location}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Operating Hours:</span>
            <strong className="text-slate-800 dark:text-slate-200">{firstAidCentre.operatingHours}</strong>
            <p className="text-[11px] text-slate-500 mt-0.5">After hours: On-call campus security</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <span className="text-slate-400 block text-[11px]">Official Direct Line:</span>
            {firstAidCentre.verified && firstAidCentre.officialPhone ? (
              <a
                href={`tel:${firstAidCentre.officialPhone}`}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow transition-all"
              >
                <Phone className="w-3.5 h-3.5" /> CALL FIRST-AID CENTRE
              </a>
            ) : (
              <div className="mt-1 text-[11px] text-amber-600 font-semibold italic">
                Official First-Aid Centre contact is not yet configured.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Available First-Aid Services (Verified Capabilities):
          </h4>
          <div className="flex flex-wrap gap-2">
            {firstAidCentre.services.map((svc, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
              >
                ✓ {svc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. EMERGENCY CONTACTS DIRECTORY */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Phone className="w-4 h-4 text-rose-600" />
          Verified Emergency Contacts & Hotlines
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {emergencyContacts.map(contact => (
            <div
              key={contact.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {contact.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    contact.verified
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {contact.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                  {contact.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {contact.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {contact.verified && contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" /> CALL {contact.phone}
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed"
                  >
                    Pending Verification
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. EMBEDDED MAP FOR EMERGENCY FACILITIES */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-rose-600" />
          Nearest Hassan Emergency Hospitals & Trauma Centers
        </h3>
        <HealthcareMap filterType="hospitals" height="380px" />
      </div>

      {/* ======================================================== */}
      {/* 7. RECENT CAMPUS SOS LOGS */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-600" /> Campus Emergency Broadcast History
        </h3>
        <div className="space-y-3 text-xs">
          {emergencyHistory.map(emg => (
            <div
              key={emg.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-rose-600 font-bold">{emg.emergencyType}</span>
                  <span className="text-slate-400">•</span>
                  <span>{emg.locationDetails}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Caller: {emg.callerPhone} ({emg.callerName})
                  {emg.latitude && emg.longitude && (
                    <span className="ml-2 text-emerald-600 font-mono">
                      (GPS: {emg.latitude.toFixed(4)}°, {emg.longitude.toFixed(4)}°)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase ${getStatusBadgeColor(emg.status)}`}>
                  {emg.status}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(emg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: HOSPITAL REFERRAL */}
      {/* ======================================================== */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HospitalIcon className="w-5 h-5 text-purple-600" />
              Refer Incident to Hassan Hospital
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Verified Hassan Hospital:
                </label>
                <select
                  value={referralHospitalId}
                  onChange={e => setReferralHospitalId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {mockHospitals.filter(h => h.verified).map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.emergencyNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Referral Reason:
                </label>
                <textarea
                  value={referralReason}
                  onChange={e => setReferralReason(e.target.value)}
                  placeholder="e.g., Compound fracture requiring orthopedic surgery and trauma resuscitation"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsReferralModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReferral}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow"
              >
                Confirm Hospital Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ASSIGN RESPONDER */}
      {/* ======================================================== */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Assign On-Duty First-Aid Responder
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Responder Name / Team:
                </label>
                <input
                  type="text"
                  value={responderNameInput}
                  onChange={e => setResponderNameInput(e.target.value)}
                  placeholder="e.g. Dr. Priya Rao / Lead First Aid Officer"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow"
              >
                Assign & Dispatch Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
