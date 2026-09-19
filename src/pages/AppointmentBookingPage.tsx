import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Info
} from 'lucide-react';
import { mockServices } from '../data/services';
import { mockDoctors } from '../data/doctors';
import { doctorService } from '../services/doctorService';
import { doctorAvailabilityService, GeneratedSlot } from '../services/doctorAvailabilityService';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { ConsultationType, HealthService, Doctor, Appointment } from '../types';

export const AppointmentBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { createAppointment } = useAppointments();

  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>(mockDoctors);

  const preselectedDoctorId = searchParams.get('doctor');
  const preselectedServiceId = searchParams.get('service');
  const preselectedMode = searchParams.get('mode');

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<HealthService | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-18');
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('10:00');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('10:30');
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [consultationType, setConsultationType] = useState<ConsultationType>(preselectedMode === 'in_person' ? 'in_person' : 'video');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (preselectedMode === 'video' || preselectedMode === 'in_person') {
      setConsultationType(preselectedMode as ConsultationType);
    }
  }, [preselectedMode]);

  useEffect(() => {
    doctorService.getDoctors().then(docs => {
      setAvailableDoctors(docs);
      if (preselectedDoctorId) {
        const doc = docs.find(d => d.id === preselectedDoctorId || d.doctorId === preselectedDoctorId);
        if (doc) {
          setSelectedDoctor(doc);
          const srv = mockServices.find(s => s.name.toLowerCase().includes(doc.specialization.split(' ')[0].toLowerCase())) || mockServices[0];
          setSelectedService(srv);
          setStep(3);
        }
      }
    });

    if (preselectedServiceId) {
      const srv = mockServices.find(s => s.id === preselectedServiceId);
      if (srv) {
        setSelectedService(srv);
        setStep(2);
      }
    }
  }, [preselectedDoctorId, preselectedServiceId]);

  // Fetch dynamic available slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setLoadingSlots(true);
      doctorAvailabilityService.getAvailableSlots(selectedDoctor.id, selectedDate)
        .then(slots => {
          setGeneratedSlots(slots);
          const firstAvailable = slots.find(s => s.isAvailable);
          if (firstAvailable) {
            setSelectedSlot(firstAvailable.slot);
            setSelectedStartTime(firstAvailable.startTime);
            setSelectedEndTime(firstAvailable.endTime);
          }
        })
        .catch(() => {
          setGeneratedSlots([]);
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    }
  }, [selectedDoctor, selectedDate]);

  const handleNextStep = () => {
    if (step === 1 && !selectedService) {
      alert('Please select a healthcare service');
      return;
    }
    if (step === 2 && !selectedDoctor) {
      alert('Please select a doctor');
      return;
    }
    if (step === 4 && !selectedSlot) {
      alert('Please select an available time slot');
      return;
    }
    if (step === 5 && !reason.trim()) {
      alert('Please enter a brief reason or symptoms for the consultation');
      return;
    }
    setStep(step + 1);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedService) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const apt = await createAppointment({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorSpecialization: selectedDoctor.specialization,
        doctorAvatar: selectedDoctor.avatarUrl,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        consultationType,
        reason,
        symptoms,
        patientId: user?.id || 'usr-student-1',
        patientName: user?.fullName || 'Rahul Sharma',
        patientRole: role || 'student',
        patientEmail: user?.email || 'rahul.sharma@mcehassan.ac.in',
        patientPhone: user?.phone || '+91 98765 43210',
        patientUSNorEmpId: user?.usn || user?.employeeId || '4MC21CS089',
        status: 'confirmed'
      });

      setConfirmedAppointment(apt);
      setStep(7);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book appointment due to scheduling conflict. Please choose another slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Book Healthcare Consultation</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          7-Step MCE Campus Telemedicine & Clinical Booking Wizard
        </p>
      </div>

      {step < 7 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs overflow-x-auto gap-2">
          {[
            { num: 1, label: 'Service' },
            { num: 2, label: 'Doctor' },
            { num: 3, label: 'Date' },
            { num: 4, label: 'Slot' },
            { num: 5, label: 'Symptoms' },
            { num: 6, label: 'Confirm' }
          ].map(s => (
            <div key={s.num} className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  step === s.num
                    ? 'bg-primary-600 text-white'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span className={`font-semibold ${step === s.num ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {s.num < 6 && <span className="text-slate-300 dark:text-slate-700 ml-1">›</span>}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 1: Choose Healthcare Service</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mockServices.map(srv => {
                const isSelected = selectedService?.id === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60 text-primary-900 dark:text-primary-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white mb-1">{srv.name}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{srv.description}</p>
                    <div className="mt-2 text-[11px] font-semibold text-primary-600">Available on Campus Schedule</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 2: Select Available Doctor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableDoctors.map(doc => {
                const isSelected = selectedDoctor?.id === doc.id;
                const isDirOnly = doc.provider_status === 'directory_only';
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDoctor(doc);
                      if (doc.video_consultation_enabled === false && consultationType === 'video') {
                        setConsultationType('in_person');
                      }
                    }}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-tr from-primary-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {doc.avatarUrl ? (
                        <img 
                          src={doc.avatarUrl} 
                          alt={doc.name} 
                          className="w-full h-full object-cover object-top" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{doc.initials || doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{doc.name}</span>
                        {isDirOnly ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
                            Directory Profile
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium">
                            Onboarded
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-primary-600 font-semibold">{doc.specialization}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{doc.hospital_name || 'Hassan, Karnataka'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{doc.availableDays.join(', ')} • {doc.experienceYears} yrs exp</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 3: Select Date & Mode</h3>

            {selectedDoctor?.provider_status === 'directory_only' && (
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold">Public Directory Notice: </span>
                  {selectedDoctor.name} is listed from <span className="font-semibold">{selectedDoctor.hospital_name || 'Karna Hospital, Hassan'}</span> for directory reference. Direct CampusCare video consultations are available once the provider is onboarded. In-person OPD consultations can be scheduled at the hospital premises.
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Consultation Mode:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={selectedDoctor?.video_consultation_enabled === false}
                  onClick={() => setConsultationType('video')}
                  className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold transition-all ${
                    selectedDoctor?.video_consultation_enabled === false
                      ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                      : consultationType === 'video'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Video className="w-5 h-5 text-primary-600" />
                  <div>
                    <div className="text-sm">Online Video Call</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      {selectedDoctor?.video_consultation_enabled === false 
                        ? 'Disabled (Provider not onboarded for video)' 
                        : 'Encrypted WebRTC call from hostel/home'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConsultationType('in_person')}
                  className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold transition-all ${
                    consultationType === 'in_person'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <User className="w-5 h-5 text-tealAccent-600" />
                  <div>
                    <div className="text-sm">
                      {selectedDoctor?.provider_status === 'directory_only' 
                        ? `In-Person at ${selectedDoctor.hospital_name || 'Hospital'}` 
                        : 'In-Person at MCE Health Center'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      {selectedDoctor?.provider_status === 'directory_only'
                        ? 'Visit during stated OPD consultation hours'
                        : 'Physical visit to Campus Health Clinic Room 101'}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Pick Date:</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {['2026-09-18', '2026-09-19', '2026-09-21', '2026-09-22', '2026-09-23'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                      selectedDate === d
                        ? 'bg-primary-600 text-white shadow'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 4: Select Available Time Slot</h3>
              <span className="text-xs text-primary-600 font-semibold">Database-Backed Availability</span>
            </div>
            <p className="text-xs text-slate-500">
              Generated clinical consultation slots for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDoctor?.name}</span> on <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDate}</span>:
            </p>

            {loadingSlots ? (
              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-primary-600 animate-spin" />
                <span>Fetching real available slots from database...</span>
              </div>
            ) : generatedSlots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {generatedSlots.map(slotItem => {
                  const isSelected = selectedSlot === slotItem.slot;
                  const isAvailable = slotItem.isAvailable;

                  return (
                    <button
                      key={slotItem.slot}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedSlot(slotItem.slot);
                        setSelectedStartTime(slotItem.startTime);
                        setSelectedEndTime(slotItem.endTime);
                      }}
                      className={`p-3 rounded-xl border text-center text-xs font-bold transition-all relative ${
                        !isAvailable
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                          : isSelected
                          ? 'bg-primary-600 text-white shadow-md border-primary-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {slotItem.slot}
                      {!isAvailable && (
                        <span className="block text-[9px] font-normal no-underline text-rose-500 mt-0.5">
                          Reserved
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-center text-xs text-amber-800 dark:text-amber-200">
                No active duty slots found for this doctor on the selected date. Please pick a different date above.
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 5: Describe Symptoms & Reason</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Consultation / Key Symptoms *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g., Having persistent fever (100°F) and sore throat since yesterday..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 6: Review Appointment Details</h3>

            {bookingError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
                <span className="font-bold">Booking Conflict: </span>
                {bookingError}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedDoctor?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500">Specialty / Service:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500">Date & Slot:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedDate} at {selectedSlot}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500">Mode:</span>
                <span className="font-bold capitalize text-primary-600">{consultationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold">{user?.fullName || 'Rahul Sharma'} ({user?.usn || user?.employeeId || 'MCE Member'})</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900 text-xs text-primary-800 dark:text-primary-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-600 flex-shrink-0" />
              Complimentary consultation under CampusCare Prototype Healthcare Policy.
            </div>
          </div>
        )}

        {step === 7 && confirmedAppointment && (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Appointment Confirmed!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your consultation booking ID is <span className="font-mono font-bold text-primary-600">{confirmedAppointment.bookingId}</span>
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-left text-xs space-y-2">
              <div><strong>Doctor:</strong> {confirmedAppointment.doctorName}</div>
              <div><strong>Date & Time:</strong> {confirmedAppointment.appointmentDate} at {confirmedAppointment.timeSlot}</div>
              <div><strong>Consultation Type:</strong> {confirmedAppointment.consultationType}</div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              {confirmedAppointment.consultationType === 'video' && (
                <Link
                  to={`/consultation/${confirmedAppointment.id}`}
                  className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow flex items-center gap-2"
                >
                  <Video className="w-4 h-4" /> Open Teleconsultation Room
                </Link>
              )}
              <Link
                to="/appointments"
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                View All My Appointments
              </Link>
            </div>
          </div>
        )}

        {step < 7 && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>
            ) : <div />}

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? 'Booking Consultation...' : 'Confirm & Book Consultation'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
