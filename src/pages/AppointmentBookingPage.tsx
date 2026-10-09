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
  Info,
  AlertCircle
} from 'lucide-react';
import { mockServices } from '../data/services';
import { mockDoctors } from '../data/doctors';
import { doctorService } from '../services/doctorService';
import { doctorAvailabilityService, GeneratedSlot } from '../services/doctorAvailabilityService';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { ConsultationType, HealthService, Doctor, Appointment } from '../types';
import { CalendarDatePicker } from '../components/calendar/CalendarDatePicker';
import {
  getTodayIST,
  isDateInPast,
  isDateToday,
  isTimeSlotInPastToday,
  formatDateFull,
  getDayOfWeek,
  convert24To12,
  calculateSlotEndTime,
  formatAppointmentScheduleDisplay
} from '../utils/dateUtils';

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
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('10:00');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('10:30');
  const [timeValidation, setTimeValidation] = useState<{ isValid: boolean; message: string } | null>(null);
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

  const validateSelectedTime = (dateStr: string, time24: string, slots: GeneratedSlot[]) => {
    if (!time24) {
      return { isValid: false, message: 'Please select a preferred consultation time.' };
    }
    if (isDateInPast(dateStr)) {
      return { isValid: false, message: 'Selected date is in the past. Please choose a future date.' };
    }
    if (isDateToday(dateStr) && isTimeSlotInPastToday(time24)) {
      return { isValid: false, message: 'Selected time has already passed for today. Please select a future time.' };
    }
    const slotLabel = convert24To12(time24);
    const conflicting = slots.find(
      s => (s.startTime === time24 || s.slot.toLowerCase() === slotLabel.toLowerCase()) && !s.isAvailable
    );
    if (conflicting) {
      return { isValid: false, message: conflicting.bookedReason || 'This time slot is already reserved.' };
    }
    return { isValid: true, message: `Time selected: ${slotLabel}` };
  };

  const handleManualTimeChange = (time24: string) => {
    setSelectedStartTime(time24);
    const end24 = calculateSlotEndTime(time24, 30);
    setSelectedEndTime(end24);
    const label = convert24To12(time24);
    setSelectedSlot(label);
    const val = validateSelectedTime(selectedDate, time24, generatedSlots);
    setTimeValidation(val);
  };

  const handleSlotSelection = (slotItem: GeneratedSlot) => {
    setSelectedSlot(slotItem.slot);
    setSelectedStartTime(slotItem.startTime);
    setSelectedEndTime(slotItem.endTime);
    setTimeValidation({ isValid: true, message: `Selected clinical slot: ${slotItem.slot}` });
  };

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
            setTimeValidation({ isValid: true, message: `Available slot: ${firstAvailable.slot}` });
          } else {
            // Keep existing manual time if valid, or clear
            if (selectedStartTime) {
              const val = validateSelectedTime(selectedDate, selectedStartTime, slots);
              setTimeValidation(val);
            } else {
              setSelectedSlot('');
              setTimeValidation({ isValid: false, message: 'No available slots for this date. Please select another date.' });
            }
          }
        })
        .catch(() => {
          setGeneratedSlots([]);
          setSelectedSlot('');
          setTimeValidation({ isValid: false, message: 'Could not load slots. You may enter a preferred time manually.' });
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
    if (step === 3) {
      if (!selectedDate || isDateInPast(selectedDate)) {
        alert('Please select a valid future consultation date');
        return;
      }
    }
    if (step === 4) {
      if (!selectedSlot || !selectedStartTime) {
        alert('Please select or specify a preferred consultation time');
        return;
      }
      const val = validateSelectedTime(selectedDate, selectedStartTime, generatedSlots);
      if (!val.isValid) {
        alert(val.message);
        return;
      }
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
        doctorId: selectedDoctor.doctorId || selectedDoctor.id,
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
        status: 'pending'
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

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <label htmlFor="manual-date-picker" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Consultation Date Picker (Manual Selection):
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select your consultation date manually using the date picker or choose from the interactive calendar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="manual-date-picker"
                    type="date"
                    min={getTodayIST()}
                    value={selectedDate}
                    onChange={e => {
                      const val = e.target.value;
                      if (val) {
                        setSelectedDate(val);
                        setSelectedSlot('');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Consultation Date (Interactive Monthly Calendar):
                </label>
                <CalendarDatePicker
                  selectedDate={selectedDate}
                  onSelectDate={d => {
                    setSelectedDate(d);
                    setSelectedSlot('');
                  }}
                  doctorName={selectedDoctor?.name}
                  doctorAvailableDays={selectedDoctor?.availableDays || selectedDoctor?.availability_days}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 4: Select Preferred Consultation Time</h3>
              <span className="text-xs text-primary-600 font-semibold">Real-Time Clinical Schedule</span>
            </div>
            <p className="text-xs text-slate-500">
              Schedule consultation with <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDoctor?.name}</span> for <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDateFull(selectedDate)}</span>:
            </p>

            {/* Manual Time Picker Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label htmlFor="manual-time-picker" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Preferred Time Picker (Manual Time Selection):
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Choose your exact preferred consultation time using the time picker, or click an available clinical duty slot below.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="manual-time-picker"
                    type="time"
                    value={selectedStartTime}
                    onChange={e => handleManualTimeChange(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  />
                  <span className="text-xs font-bold px-3 py-2 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-900">
                    {selectedSlot || 'Select time'}
                  </span>
                </div>
              </div>

              {/* Live validation feedback */}
              {timeValidation && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium transition-all ${
                    timeValidation.isValid
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                  }`}
                >
                  {timeValidation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  )}
                  <span>{timeValidation.message}</span>
                </div>
              )}
            </div>

            {/* Clinical Duty Slots Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Available Clinical Duty Slots:
                </span>
                <span className="text-[11px] text-slate-500">
                  Click any slot to select and auto-sync with time picker
                </span>
              </div>

              {loadingSlots ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-primary-600 animate-spin" />
                  <span>Fetching live slot availability from database...</span>
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
                        onClick={() => handleSlotSelection(slotItem)}
                        className={`p-3 rounded-xl border text-center text-xs font-bold transition-all relative ${
                          !isAvailable
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                            : isSelected
                            ? 'bg-primary-600 text-white shadow-md border-primary-600 ring-2 ring-primary-400'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                        {slotItem.slot}
                        {!isAvailable && (
                          <span className="block text-[9px] font-normal no-underline text-rose-500 mt-0.5">
                            {slotItem.bookedReason || 'Unavailable'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-center text-xs text-amber-800 dark:text-amber-200 space-y-3">
                  <p className="font-semibold text-sm">
                    No predefined duty slots for {selectedDoctor?.name} on {formatDateFull(selectedDate)}.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    You can use the manual time picker above to request a specific consultation time, or select another date on the calendar.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Choose Another Date on Calendar
                  </button>
                </div>
              )}
            </div>
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
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white block">{formatDateFull(selectedDate)} at {selectedSlot}</span>
                  {formatAppointmentScheduleDisplay(selectedDate, selectedSlot, selectedStartTime).isLocalDifferent && (
                    <span className="text-[11px] text-slate-500 block">
                      Local Time: {formatAppointmentScheduleDisplay(selectedDate, selectedSlot, selectedStartTime).displayLocal}
                    </span>
                  )}
                </div>
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
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
                Status: Pending Doctor Confirmation
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Appointment Request Submitted!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your consultation booking ID is <span className="font-mono font-bold text-primary-600">{confirmedAppointment.bookingId}</span>. The request has been sent to {confirmedAppointment.doctorName}.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-left text-xs space-y-2">
              <div><strong>Doctor:</strong> {confirmedAppointment.doctorName}</div>
              <div><strong>Date & Time:</strong> {formatDateFull(confirmedAppointment.appointmentDate)} at {confirmedAppointment.timeSlot}</div>
              <div><strong>Consultation Type:</strong> <span className="capitalize font-semibold">{confirmedAppointment.consultationType}</span></div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                You will receive an in-app notification once the doctor accepts your appointment request.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link
                to="/appointments"
                className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> View My Appointments
              </Link>
              <Link
                to="/student/dashboard"
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Go to Dashboard
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
