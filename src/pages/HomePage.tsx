import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Video,
  Calendar,
  Sparkles,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  Building2,
  Pill,
  Star,
  Activity,
  Users,
  Award,
  Database,
  Info
} from 'lucide-react';
import { Doctor } from '../types';
import { doctorService } from '../services/doctorService';
import { statsService, PlatformMetrics } from '../services/statsService';
import { mockDoctors } from '../data/doctors';
import { mockServices } from '../data/services';
import { DoctorCard } from '../components/cards/DoctorCard';
import { CampusMap } from '../components/feedback/CampusMap';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { DemoLoginModal } from '../features/auth/DemoLoginModal';

export const HomePage: React.FC = () => {
  const { setIsEmergencyModalOpen } = useEmergency();
  const { role, isAuthenticated } = useAuth();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalRegisteredUsers: 0,
    totalAppointments: 0,
    activeDoctors: 0,
    availableDoctors: 0,
    activeEmergencyRequests: 0,
    isLiveDatabase: false,
    dataSourceLabel: 'Loading Metrics...'
  });

  useEffect(() => {
    statsService.getMetrics().then(m => setMetrics(m));
    doctorService.getDoctors().then(docs => setDoctors(docs));
  }, []);

  const getDashboardLink = () => {
    if (role === 'doctor') return '/doctor/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'faculty') return '/faculty/dashboard';
    return '/student/dashboard';
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Disclaimer / Academic Project Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Academic Project Notice:</strong> CampusCare is an engineering project prototype developed for Malnad College of Engineering (MCE Hassan). All medical profiles and clinical schedules shown in demo mode represent prototype data. For campus medical emergencies, contact MCE First Aid at <strong>9110885805</strong>.
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900 text-amber-950 dark:text-amber-100 hidden md:inline-block">
            {metrics.dataSourceLabel}
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 sm:pt-12 pb-12 sm:pb-20 border-b border-slate-200/60 dark:border-slate-800">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50/50 via-transparent to-transparent dark:from-primary-950/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Institutional Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100 dark:bg-primary-950/80 border border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                MCE CampusCare • Malnad College of Engineering, Hassan
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                CampusCare — <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-primary-600 via-tealAccent-500 to-primary-800 bg-clip-text text-transparent">
                  Digital Healthcare for MCE Hassan
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Access campus health services, doctor consultations, AI-assisted health guidance, medical records and emergency support from one secure platform.
              </p>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/appointments/book"
                  className="px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-lg shadow-primary-600/25 hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Book Consultation
                </Link>

                <Link
                  to="/symptom-checker"
                  className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-tealAccent-500" /> AI Health Guidance
                </Link>

                <button
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/25 transition-all flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 animate-pulse" /> Campus Emergency
                </button>
              </div>

              {/* Quick Demo Switcher Prompt */}
              <div className="pt-3">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center justify-center lg:justify-start gap-1 mx-auto lg:mx-0"
                >
                  ⚡ Fast Examiner Demo: Switch between Student, Doctor, Faculty, or Admin Profiles <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dynamic Database Metrics Bar */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-200/80 dark:border-slate-800">
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 justify-center lg:justify-start">
                    {metrics.totalRegisteredUsers}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Registered Users</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                    {metrics.activeDoctors}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Verified Doctors</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-tealAccent-500">
                    {metrics.totalAppointments}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Appointments</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {metrics.availableDoctors}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Available Doctors</div>
                </div>
              </div>
            </div>

            {/* Hero Visual Card / Telehealth Mockup */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-tealAccent-500/10 text-tealAccent-600 dark:text-tealAccent-400 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">MCE Health Center Portal</h4>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Available Consultation Schedules
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                    Prototype Mode
                  </span>
                </div>

                {/* Quick Consultation Preview */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Sample Practitioner Roster:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {doctors[0]?.name || 'Dr. Priya Rao (MD)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={doctors[0]?.avatarUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200"}
                      alt="Doctor Profile"
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {doctors[0]?.specialization || 'General Medicine & Preventive Care'}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Consultation slot: <strong className="text-emerald-600">Configured via DB Schedule</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Action Shortcuts */}
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                  <Link
                    to="/consultation/apt-101"
                    className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 text-primary-700 dark:text-primary-300 flex items-center justify-center gap-2 transition-all border border-primary-100 dark:border-primary-900"
                  >
                    <Video className="w-4 h-4" /> Join Video Call
                  </Link>
                  <Link
                    to="/medications"
                    className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 flex items-center justify-center gap-2 transition-all border border-teal-100 dark:border-teal-900"
                  >
                    <Pill className="w-4 h-4" /> Pill Reminders
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Healthcare Services Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Campus Clinical Specialties
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Comprehensive Campus Healthcare Services
            </h2>
          </div>
          <Link
            to="/services"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 mt-2 md:mt-0"
          >
            View All 10 Clinical Categories <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockServices.slice(0, 4).map(service => (
            <div
              key={service.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{service.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {service.description}
                </p>
              </div>

              <Link
                to={`/appointments/book?service=${service.id}`}
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 pt-3 border-t border-slate-100 dark:border-slate-800"
              >
                Book This Service <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Campus Doctors */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Medical Panel
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Experienced Doctors & Mental Health Counselors
            </h2>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 mt-2 md:mt-0"
          >
            Browse Full Directory <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(doctors.length > 0 ? doctors : mockDoctors).slice(0, 3).map(doctor => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      </section>

      {/* How CampusCare Works */}
      <section className="bg-slate-100 dark:bg-slate-900/60 py-16 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Seamless Healthcare Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              How CampusCare Protects MCE Hassan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Describe or Check Symptoms',
                desc: 'Use AI triage to evaluate severity or select your medical specialty.'
              },
              {
                step: '02',
                title: 'Book a Doctor Slot',
                desc: 'Choose an online video call or in-person consultation at MCE Health Center.'
              },
              {
                step: '03',
                title: 'Attend Consultation',
                desc: 'Connect in an encrypted room, discuss vitals, and receive a digital prescription.'
              },
              {
                step: '04',
                title: 'E-Records & Reminders',
                desc: 'Get automated pill reminder notifications and download clinical reports.'
              }
            ].map(item => (
              <div key={item.step} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
                <span className="text-3xl font-extrabold text-primary-600/30 dark:text-primary-400/30">
                  {item.step}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Hassan Healthcare & Campus Map */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Hassan Locality & Campus Locator
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Nearby Hospitals, Dispensaries & Pharmacies
          </h2>
        </div>
        <CampusMap />
      </section>

      <DemoLoginModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
};
