import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { useEmergency } from '../../context/EmergencyContext';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Phone, MapPin, CheckCircle2, LocateFixed, AlertTriangle, Building2 } from 'lucide-react';

export const EmergencyModal: React.FC = () => {
  const {
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
    triggerEmergency,
    activeEmergency,
    firstAidCentre
  } = useEmergency();

  const { user, role } = useAuth();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [location, setLocation] = useState('MCE Hassan Main Campus (Silver Jubilee Block)');
  const [phone, setPhone] = useState(user?.phone || '9110885805');
  const [description, setDescription] = useState('Immediate first aid assistance required on campus.');
  const [emergencyType, setEmergencyType] = useState<any>('Accident/Trauma');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('Location not requested');
  const [isTriggered, setIsTriggered] = useState(false);

  // Request browser location when opening modal
  useEffect(() => {
    if (isEmergencyModalOpen && !gpsCoords) {
      if (navigator.geolocation) {
        setGpsStatus('Requesting GPS coordinate fix...');
        navigator.geolocation.getCurrentPosition(
          pos => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setGpsCoords(coords);
            setGpsStatus(`GPS Coordinates Attached (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°)`);
          },
          err => {
            setGpsCoords(null);
            if (err.code === err.PERMISSION_DENIED) {
              setGpsStatus('Location permission denied. Please allow location in browser settings.');
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              setGpsStatus('Unable to determine your location.');
            } else if (err.code === err.TIMEOUT) {
              setGpsStatus('Location request timed out.');
            } else {
              setGpsStatus('Unable to determine your location.');
            }
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      } else {
        setGpsStatus('Unable to determine your location.');
      }
    }
  }, [isEmergencyModalOpen]);

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      const callerName = user?.fullName || 'Campus Member';
      const userRole = (role || 'Student').toUpperCase();
      triggerEmergency(location, phone, emergencyType, gpsCoords, description, callerName, userRole, user?.id);
      setIsTriggered(true);
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, location, phone, emergencyType, gpsCoords, description, triggerEmergency, user, role]);

  const handleStartCountdown = () => setCountdown(5);
  const handleCancelCountdown = () => setCountdown(null);
  const handleClose = () => {
    setCountdown(null);
    setIsTriggered(false);
    setIsEmergencyModalOpen(false);
  };

  return (
    <Modal
      isOpen={isEmergencyModalOpen}
      onClose={handleClose}
      title="MCE Campus Emergency & SOS Alert"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {isTriggered || activeEmergency ? (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
              Campus Emergency SOS Transmitted
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Incident broadcasted to MCE First-Aid Centre duty staff and campus security.
            </p>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1 text-left">
              <div>
                <MapPin className="w-4 h-4 text-emerald-600 inline mr-1" />
                {activeEmergency?.locationDetails || location}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {activeEmergency?.latitude && activeEmergency?.longitude
                  ? `GPS Fixed: ${activeEmergency.latitude.toFixed(4)}°, ${activeEmergency.longitude.toFixed(4)}°`
                  : 'Location unavailable. Please contact MCE First Aid and provide your current location.'}
              </div>
              <div className="text-[11px] text-primary-600 font-semibold">
                Status: {activeEmergency?.status || 'REQUESTED'}
              </div>
            </div>

            <div className="pt-2">
              <a
                href="tel:9110885805"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <Phone className="w-4 h-4" /> Call MCE First Aid (9110885805)
              </a>
            </div>
          </div>
        ) : countdown !== null ? (
          <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto text-3xl font-extrabold animate-pulse">
              {countdown}
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">
                Broadcasting Campus SOS in {countdown}s...
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                Dispatching incident notification to MCE First-Aid Centre and on-duty coordinators.
              </p>
            </div>
            <button
              onClick={handleCancelCountdown}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow"
            >
              Cancel SOS
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200">
                  MCE Campus Emergency & First-Aid Protocol
                </h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  Use this to notify on-duty campus medical staff for acute trauma, fainting, injuries, or lab incidents.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Category:
                </label>
                <select
                  value={emergencyType}
                  onChange={e => setEmergencyType(e.target.value as any)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Accident/Trauma">Accident / Physical Injury / Fall</option>
                  <option value="Respiratory Distress">Severe Breathing Difficulty / Asthma</option>
                  <option value="Cardiac">Severe Chest Pain / Palpitations</option>
                  <option value="Severe Allergic Reaction">Anaphylaxis / Acute Allergy</option>
                  <option value="Unconscious">Unconscious / Fainting in Hostel or Lab</option>
                  <option value="Other">Other Urgent First-Aid Situation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campus Location Details:
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g., Mechanical Lab 2, Kavery Hostel Room 304"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* GPS Telemetry Indicator */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                  <LocateFixed className={`w-3.5 h-3.5 ${gpsCoords ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span>{gpsStatus}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone:
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleStartCountdown}
                className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                TRANSMIT CAMPUS EMERGENCY SOS
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <a
                href="tel:9110885805"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-900 dark:text-white transition-all shadow-sm"
              >
                <Phone className="w-4 h-4 text-rose-500" /> Call MCE First Aid (9110885805)
              </a>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
