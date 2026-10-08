import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HeartPulse,
  Sparkles,
  Stethoscope,
  Calendar,
  Video,
  FileText,
  Pill,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Phone,
  FileCheck,
  Activity,
  Layers,
  Search,
  Eye,
  Info,
  KeyRound,
  Database,
  Bell,
  Mic,
  VideoOff,
  MicOff,
  MonitorUp,
  Sliders
} from 'lucide-react';
import { Doctor, Appointment, Prescription, MedicalRecord } from '../types';
import { doctorService } from '../services/doctorService';
import { statsService, PlatformMetrics } from '../services/statsService';
import { mockDoctors } from '../data/doctors';
import { CampusMap } from '../components/feedback/CampusMap';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useMedical } from '../context/MedicalContext';
import { FloatingMedicalAssistant } from '../components/common/FloatingMedicalAssistant';
import mceCampusPhoto from '../assets/images/mce-campus-twilight.jpg';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setIsEmergencyModalOpen } = useEmergency();
  const { user, role, isAuthenticated } = useAuth();
  const { appointments } = useAppointments();
  const { prescriptions, records } = useMedical();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [heroSymptom, setHeroSymptom] = useState('');
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalRegisteredUsers: 0,
    totalAppointments: 0,
    activeDoctors: 0,
    availableDoctors: 0,
    activeEmergencyRequests: 0,
    isLiveDatabase: false,
    dataSourceLabel: 'Campus Healthcare'
  });

  useEffect(() => {
    statsService.getMetrics().then(m => setMetrics(m));
    doctorService.getDoctors().then(docs => setDoctors(docs));
  }, []);

  const handleStartHeroAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSymptom.trim()) {
      navigate(`/symptom-checker?symptom=${encodeURIComponent(heroSymptom.trim())}`);
    } else {
      navigate('/symptom-checker');
    }
  };

  const handleQuickChipClick = (symptom: string) => {
    navigate(`/symptom-checker?symptom=${encodeURIComponent(symptom)}`);
  };

  // Up to 4 featured doctors from database / mock fallback
  const featuredDoctors = (doctors.length > 0 ? doctors : mockDoctors).slice(0, 4);

  // User dashboard items or clean realistic empty state
  const upcomingAppointment: Appointment | undefined = appointments && appointments.length > 0 ? appointments[0] : undefined;
  const latestPrescription: Prescription | undefined = prescriptions && prescriptions.length > 0 ? prescriptions[0] : undefined;
  const latestRecord: MedicalRecord | undefined = records && records.length > 0 ? records[0] : undefined;

  return (
    <div className="w-full pb-16 overflow-x-hidden">
      {/* ==================================================
          1. ACADEMIC / INSTITUTIONAL NOTICE (Seamless header)
      ================================================== */}
      <div className="w-full bg-slate-900 border-b border-slate-800 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <span className="leading-snug">
              <strong>CampusCare Telemedicine:</strong> Engineering academic healthcare platform developed for Malnad College of Engineering (MCE Hassan). For medical emergencies on campus, contact MCE First Aid at <strong>9110885805</strong>.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[11px] font-semibold border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Secure Healthcare Platform
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================
          2. PREMIUM DARK HERO + 3. HERO RIGHT AI PANEL
      ================================================== */}
      {/* ==================================================
          2. MCE HASSAN HERO SECTION WITH REAL OFFICIAL CAMPUS PHOTO
      ================================================== */}
      <section className="relative w-full text-white pt-8 sm:pt-14 pb-14 sm:pb-20 border-b border-slate-800 overflow-hidden bg-[#07162c]">
        {/* Real Official MCE Hassan Campus Background Photograph */}
        <div className="absolute inset-0 z-0">
          <img
            src={mceCampusPhoto}
            alt="Official campus photograph of Malnad College of Engineering (MCE), Hassan main administrative building"
            className="w-full h-full object-cover object-center filter brightness-[0.34] contrast-[1.12] saturate-[1.15]"
            loading="eager"
            onError={(e) => {
              // Graceful fallback to public folder asset or high-res official Wikimedia link if bundle fails
              const target = e.currentTarget;
              if (!target.src.includes('mce-campus-twilight.jpg')) {
                target.src = '/images/mce-campus-twilight.jpg';
              } else if (!target.src.includes('upload.wikimedia.org')) {
                target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Malnad_College_of_Engineering_Main_Block_at_Twilight.jpg/1920px-Malnad_College_of_Engineering_Main_Block_at_Twilight.jpg';
              }
            }}
          />

          {/* MCE Royal Blue (#1e3a8a) + Deep Navy + Golden Yellow Accent Overlay Gradient for High Contrast & Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030d22]/95 via-[#071d44]/88 to-[#040e22]/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060d17] via-transparent to-[#040f24]/70" />

          {/* Soft MCE Royal Blue & Golden Yellow Brand Glows */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Subtle Institutional Grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
              backgroundSize: '28px 28px'
            }}
          />
        </div>

        {/* Abstract Healthcare Waveform SVG Banner */}
        <div className="absolute top-0 right-0 w-full lg:w-2/3 h-48 opacity-10 pointer-events-none z-0">
          <svg viewBox="0 0 1000 200" fill="none" className="w-full h-full stroke-cyan-400 stroke-2">
            <path d="M0,100 L200,100 L220,60 L240,140 L260,30 L280,170 L300,100 L500,100 L520,70 L540,130 L560,40 L580,160 L600,100 L1000,100" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* HERO LEFT SIDE */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              {/* Institutional Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e3a8a]/90 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-lg shadow-blue-950/50 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="tracking-wide">MALNAD COLLEGE OF ENGINEERING • HASSAN</span>
              </div>

              {/* CampusCare Branding & Hero Titles */}
              <div className="space-y-3">
                <div className="flex items-center justify-center lg:justify-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-blue-600 border-2 border-amber-400/60 flex items-center justify-center shadow-xl shadow-blue-950/60 flex-shrink-0">
                    <HeartPulse className="w-7 h-7 text-amber-300" />
                  </div>
                  <div className="text-left">
                    <span className="block text-2xl sm:text-3xl font-black tracking-tight text-white uppercase drop-shadow-sm">
                      CampusCare
                    </span>
                    <span className="text-[11px] font-bold tracking-wider text-blue-200 uppercase">
                      College Telemedicine System
                    </span>
                  </div>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] drop-shadow-md">
                  College Telemedicine <br />
                  <span className="bg-gradient-to-r from-blue-200 via-white to-amber-300 bg-clip-text text-transparent">
                    System
                  </span>
                </h1>

                {/* Tagline / Subtitle */}
                <p className="text-xl sm:text-2xl font-bold text-amber-300 tracking-wide font-sans drop-shadow-sm">
                  &ldquo;Your Health, Connected to Campus&rdquo;
                </p>
              </div>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Connecting students, faculty, and staff of Malnad College of Engineering with verified campus doctors, AI-assisted symptom triage, digital prescriptions, and 24/7 First Aid emergency response.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-1">
                {/* Primary CTA: Book Appointment */}
                <Link
                  to="/appointments/book"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#1e3a8a] via-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-600 text-white font-extrabold text-sm shadow-xl shadow-blue-950/70 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 border border-amber-400/50"
                >
                  <Calendar className="w-4 h-4 text-amber-300" /> Book Appointment
                </Link>

                {/* Secondary CTA: Explore Healthcare Services */}
                <Link
                  to="/services"
                  className="px-6 py-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800/90 text-white border border-slate-700 hover:border-amber-400/60 font-bold text-sm shadow-md transition-all flex items-center gap-2 backdrop-blur-md"
                >
                  <Stethoscope className="w-4 h-4 text-teal-300" /> Explore Healthcare Services
                </Link>

                {/* Emergency SOS Button */}
                <button
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="px-5 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-900/40 transition-all flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 animate-pulse" /> Emergency SOS
                </button>
              </div>

              {/* Campus Location & Trust Indicators */}
              <div className="pt-2 flex flex-col items-center lg:items-start gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300 bg-slate-900/70 px-3.5 py-1.5 rounded-xl border border-slate-700/70 backdrop-blur-md shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="font-medium text-slate-200">
                    Real MCE Hassan Campus • Main Block & Health Center
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 font-semibold text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI-Assisted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Secure Records</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-teal-400" />
                    <span>Video Consultation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Campus Emergency Support</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* HERO RIGHT SIDE — 3. FLOATING AI HEALTH PANEL */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="relative rounded-3xl bg-slate-900/90 border border-slate-700/80 p-6 sm:p-7 shadow-2xl shadow-black/80 space-y-5 backdrop-blur-xl">
                {/* Card Title & Pulse */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1e3a8a] to-teal-500 text-white flex items-center justify-center shadow-md border border-amber-400/30">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                        CampusCare AI
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        How are you feeling today?
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-[#1e3a8a]/70 text-amber-300 border border-amber-400/40">
                    AI-Assisted Guidance
                  </span>
                </div>

                {/* Symptom Input & Form */}
                <form onSubmit={handleStartHeroAssessment} className="space-y-3.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={heroSymptom}
                      onChange={e => setHeroSymptom(e.target.value)}
                      placeholder="Describe your symptoms (e.g. headache, fever, cough)..."
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>

                  {/* Quick Symptom Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">
                      Quick select:
                    </span>
                    {['Headache', 'Fever', 'Cough', 'Stomach Pain'].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleQuickChipClick(chip)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 hover:border-amber-400/60 transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#1e3a8a] via-blue-600 to-teal-600 hover:from-blue-800 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-amber-400/30"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" /> Start AI Assessment
                  </button>
                </form>

                {/* Below Input Capabilities */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    <span className="text-slate-300">AI Health Guidance</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-slate-300">Follow-up Questions</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-slate-300">Red-Flag Screening</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">Doctor Matching</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content Sections with Controlled Spacing */}
      <div className="space-y-20 sm:space-y-28 pt-12 sm:pt-16">
        {/* ==================================================
            4. CAMPUS HEALTH COMMAND CENTER (Immediately below hero)
        ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
              <Activity className="w-3.5 h-3.5" /> University Health Portals
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              CAMPUS HEALTH COMMAND CENTER
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Everything you need for your digital healthcare journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: 'AI Health Guidance',
                desc: 'Triage symptoms, screen emergency flags, and receive instant clinical first-steps.',
                path: '/symptom-checker',
                icon: Sparkles,
                iconColor: 'text-amber-500',
                bgColor: 'bg-amber-50 dark:bg-amber-950/40'
              },
              {
                title: 'Doctors',
                desc: 'Directory of verified campus physicians, specializations, and availability.',
                path: '/doctors',
                icon: Stethoscope,
                iconColor: 'text-[#1e3a8a] dark:text-blue-400',
                bgColor: 'bg-blue-50 dark:bg-blue-950/40'
              },
              {
                title: 'Appointments',
                desc: 'Schedule consultations, check calendar availability, and review visit history.',
                path: '/appointments',
                icon: Calendar,
                iconColor: 'text-teal-600 dark:text-teal-400',
                bgColor: 'bg-teal-50 dark:bg-teal-950/40'
              },
              {
                title: 'Video Consultation',
                desc: 'Encrypted peer-to-peer WebRTC consultation room with campus doctors.',
                path: '/consultation/apt-101',
                icon: Video,
                iconColor: 'text-cyan-600 dark:text-cyan-400',
                bgColor: 'bg-cyan-50 dark:bg-cyan-950/40'
              },
              {
                title: 'Medical Records',
                desc: 'Confidential digital vault for clinical reports, diagnostic lab tests, and notes.',
                path: '/medical-records',
                icon: FileText,
                iconColor: 'text-indigo-600 dark:text-indigo-400',
                bgColor: 'bg-indigo-50 dark:bg-indigo-950/40'
              },
              {
                title: 'Prescriptions',
                desc: 'Access verified electronic doctor prescriptions and download medical slips.',
                path: '/prescriptions',
                icon: FileCheck,
                iconColor: 'text-emerald-600 dark:text-emerald-400',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/40'
              },
              {
                title: 'Medicine Reminders',
                desc: 'Personalized medicine schedule and notification reminders for exam periods.',
                path: '/medications',
                icon: Pill,
                iconColor: 'text-purple-600 dark:text-purple-400',
                bgColor: 'bg-purple-50 dark:bg-purple-950/40'
              },
              {
                title: 'Emergency SOS',
                desc: 'Instant 1-click distress trigger notifying MCE First Aid Desk with campus coordinates.',
                path: '/emergency',
                icon: ShieldAlert,
                iconColor: 'text-rose-600 dark:text-rose-400',
                bgColor: 'bg-rose-50 dark:bg-rose-950/40'
              }
            ].map(card => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.path}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-2xl ${card.bgColor} ${card.iconColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5">
                      {card.desc}
                    </p>
                  </div>
                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-primary-600 dark:text-primary-400">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ==================================================
            4. INTELLIGENT HEALTH GUIDANCE (AI GUIDANCE SECTION)
        ================================================== */}
        <section className="bg-gradient-to-b from-slate-100/70 via-slate-50/50 to-white dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950 py-16 sm:py-20 border-y border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Intelligent Clinical Safety Engine
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Intelligent Health Guidance
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Understand your symptoms and discover the right next step.
              </p>
            </div>

            {/* Sophisticated AI Interface Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* LEFT: AI Conversation Preview */}
              <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-xs">
                        AI
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">Conversational Assessment</h4>
                        <p className="text-[10px] text-slate-400">Interactive Follow-up & Red Flag Screening</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900">
                      Active Triage Session
                    </span>
                  </div>

                  {/* Simulated Conversation Flow */}
                  <div className="space-y-4 pt-5 text-xs">
                    {/* User Bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-primary-600 text-white p-3.5 rounded-2xl rounded-tr-xs shadow-sm font-medium">
                        "I have a throbbing headache since morning with some light sensitivity."
                      </div>
                    </div>

                    {/* AI Bubble */}
                    <div className="flex justify-start">
                      <div className="max-w-[90%] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3.5 rounded-2xl rounded-tl-xs space-y-2 border border-slate-200/60 dark:border-slate-700">
                        <p className="font-semibold text-primary-600 dark:text-primary-400">
                          CampusCare Medical AI:
                        </p>
                        <p className="leading-relaxed">
                          I can evaluate your symptoms safely. To screen for urgency:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                          <li>Did this headache start abruptly with extreme intensity?</li>
                          <li>Do you have fever, stiff neck, or numbness?</li>
                          <li>How much water have you consumed today?</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Parameters Display */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-6">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Duration</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">1 Day</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Severity</div>
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">Moderate (4/10)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Red Flags</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">None Detected</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Urgency</div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">MODERATE</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/symptom-checker"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-teal-600 hover:from-primary-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" /> Start AI Health Guidance
                  </Link>
                </div>
              </div>

              {/* RIGHT: Guidance & Doctor Matching */}
              <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-teal-500" />
                      Evidence-Grounded Recommendations
                    </h4>
                    <span className="text-[10px] text-slate-400">Clinical Protocol</span>
                  </div>

                  <div className="space-y-3 pt-3">
                    {/* Possible Causes Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1">
                      <div className="text-[11px] font-bold text-[#1e3a8a] dark:text-blue-300 uppercase tracking-wider">
                        Possible Causes
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        Tension-type Headache • Dehydration • Digital Eye Strain from prolonged screen reading
                      </p>
                    </div>

                    {/* Self-Care Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Self-Care & Comfort
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        Rest in a quiet, dark room. Drink 500ml of water immediately. Take screen breaks every 20 minutes.
                      </p>
                    </div>

                    {/* Recommended Specialty & Doctor Matching */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-0.5">
                        <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                          Recommended Specialty
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                          General Medicine
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          MCE Campus Health Center
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60 space-y-0.5">
                        <div className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase">
                          Doctor Matching
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                          Physicians Available
                        </div>
                        <Link to="/doctors" className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                          View matched practitioners →
                        </Link>
                      </div>
                    </div>

                    {/* Trusted Sources */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Trusted Reference Grid:</span>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-primary-600 dark:text-primary-400">
                        <a href="https://medlineplus.gov/" target="_blank" rel="noopener noreferrer" className="hover:underline">MedlinePlus</a>
                        <span>•</span>
                        <a href="https://www.who.int/" target="_blank" rel="noopener noreferrer" className="hover:underline">WHO Guidelines</a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    <strong>Medical Disclaimer:</strong> AI guidance is educational and does not replace a medical diagnosis. In life-threatening emergencies, call 9110885805 immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            5. CAMPUS DOCTORS SECTION (REQUIRED)
        ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
                <Stethoscope className="w-3.5 h-3.5" /> Clinical Faculty & Practitioners
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                Meet Your Campus Doctors
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Connect with healthcare professionals through CampusCare.
              </p>
            </div>

            <Link
              to="/doctors"
              className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View All Doctors →
            </Link>
          </div>

          {/* Doctor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDoctors.map(doctor => {
              const isVerified = Boolean(doctor.verified_public_profile || doctor.campuscare_enabled);
              const initials = doctor.initials || doctor.name.split(' ').filter(w => !w.includes('.')).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'DR';

              return (
                <motion.div
                  key={doctor.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Photo & Status */}
                    <div className="flex items-start gap-3.5">
                      <div className="relative flex-shrink-0">
                        {doctor.image_url ? (
                          <img
                            src={doctor.image_url}
                            alt={doctor.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1e3a8a] to-teal-500 text-white flex items-center justify-center font-extrabold text-base border border-slate-200 dark:border-slate-700">
                            {initials}
                          </div>
                        )}
                        {isVerified && (
                          <span
                            className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-teal-500 text-white border-2 border-white dark:border-slate-900"
                            title="Verified Public Profile"
                          >
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-primary-600 transition-colors">
                          {doctor.name}
                        </h3>
                        <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 truncate mt-0.5">
                          {doctor.specialization}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {doctor.qualification || 'MBBS, MD'}
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Database Verification Status */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        isVerified
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        {isVerified ? 'Verified Profile' : 'Pending Verification'}
                      </span>
                      {doctor.experienceYears && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                          {doctor.experienceYears} Yrs Exp
                        </span>
                      )}
                    </div>

                    {/* Fee & Availability */}
                    <div className="py-2.5 border-y border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Consultation Fee:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {doctor.consultationFee ? `₹${doctor.consultationFee}` : 'Campus Subsidized'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Availability:</span>
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                          {doctor.availability_time || doctor.availableDays?.slice(0, 2).join(', ') || 'Mon - Fri'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-4 grid grid-cols-2 gap-2">
                    <Link
                      to={`/doctors/${doctor.id}`}
                      className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" /> View Profile
                    </Link>

                    <Link
                      to={`/appointments/book?doctor=${doctor.id}`}
                      className="py-2 px-2.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Book
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ==================================================
            6. "FROM SYMPTOMS TO CARE" JOURNEY
        ================================================== */}
        <section className="bg-gradient-to-b from-slate-900 via-[#0b192c] to-slate-900 text-white py-16 sm:py-20 relative overflow-hidden border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Integrated Triage & Clinical Journey
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                From Symptoms to Care
              </h2>
              <p className="text-sm text-slate-400">
                An intelligent, continuous care pathway connecting self-assessment to medical follow-up.
              </p>
            </div>

            {/* 7-Step Horizontal Timeline on Desktop / Vertical on Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
              {[
                { step: '01', title: 'Describe Symptoms', desc: 'Input plain-text symptoms or quick clinical chips.' },
                { step: '02', title: 'AI Health Guidance', desc: 'Automated triage evaluates severity and safe first steps.' },
                { step: '03', title: 'Recommended Specialty', desc: 'Matches condition with General Medicine, Counseling, etc.' },
                { step: '04', title: 'Choose Doctor', desc: 'Select from available verified campus physicians.' },
                { step: '05', title: 'Book Appointment', desc: 'Reserve real-time slots for in-person or video consultations.' },
                { step: '06', title: 'Video Consultation', desc: 'Encrypted WebRTC consultation room with zero latency.' },
                { step: '07', title: 'Medical Records', desc: 'Signed e-prescriptions synced to medical vault with dose reminders.' }
              ].map((item, idx) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-teal-400/50 transition-all flex flex-col justify-between space-y-2 group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-teal-400 font-mono">
                        {item.step}
                      </span>
                      {idx < 6 && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 hidden md:block group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-white mt-1.5 leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{item.desc}</p>
                  </div>
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden mt-2">
                    <div className="w-1/4 h-full bg-gradient-to-r from-teal-400 to-[#1e3a8a] group-hover:w-full transition-all duration-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            7. HEALTHCARE DASHBOARD PREVIEW ("Your Health Command Center")
        ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
              <Sliders className="w-3.5 h-3.5" /> Patient Live Console
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Your Health Command Center
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Live preview of your personal telemetry, active prescriptions, and appointments.
            </p>
          </div>

          {/* Large Dark Premium Dashboard Mockup */}
          <div className="rounded-3xl bg-[#0b192c] border border-slate-800 p-6 sm:p-8 text-white shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-600/30 border border-primary-500/40 text-primary-400 flex items-center justify-center font-bold">
                  {user?.fullName ? user.fullName.charAt(0) : 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    {user?.fullName || 'Active Campus Resident'}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {isAuthenticated ? 'Authenticated Session' : 'Guest Portal View'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Malnad College of Engineering Health Center</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={role ? `/${role}/dashboard` : '/login'}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow transition-colors"
                >
                  Launch Full Dashboard →
                </Link>
              </div>
            </div>

            {/* Realistic Dashboard Cards with Clean Empty States */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Upcoming Appointment */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary-400" /> Upcoming Appointment
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary-950 text-primary-300 border border-primary-800">
                    {upcomingAppointment ? 'Confirmed' : 'Live State'}
                  </span>
                </div>
                {upcomingAppointment ? (
                  <div className="space-y-1.5 text-xs pt-1">
                    <div className="font-bold text-white text-sm">{upcomingAppointment.doctorName}</div>
                    <div className="text-slate-400">{upcomingAppointment.doctorSpecialization}</div>
                    <div className="text-teal-400 font-mono text-[11px] pt-1">
                      {upcomingAppointment.appointmentDate} • {upcomingAppointment.timeSlot}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-1.5">
                    <p className="text-xs text-slate-400">No upcoming appointments</p>
                    <Link to="/appointments/book" className="text-xs font-bold text-primary-400 hover:underline inline-block">
                      Book a consultation slot →
                    </Link>
                  </div>
                )}
              </div>

              {/* AI Health Guidance */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> AI Health Guidance
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Active Triage
                  </span>
                </div>
                <div className="space-y-1.5 text-xs pt-1">
                  <div className="font-bold text-white text-sm">Recent Symptom Assessment</div>
                  <div className="text-slate-400">Automated triage engine ready to evaluate vitals and red flags.</div>
                  <Link to="/symptom-checker" className="text-xs font-bold text-amber-400 hover:underline block pt-1">
                    Run New Symptom Check →
                  </Link>
                </div>
              </div>

              {/* Medical Records */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-400" /> Medical Records
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Encrypted
                  </span>
                </div>
                {latestRecord ? (
                  <div className="space-y-1 text-xs pt-1">
                    <div className="font-bold text-white text-sm truncate">{latestRecord.title}</div>
                    <div className="text-slate-400">{latestRecord.doctorOrLabName}</div>
                    <div className="text-indigo-400 text-[11px] pt-1">{latestRecord.recordDate}</div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-1.5">
                    <p className="text-xs text-slate-400">No recent records</p>
                    <Link to="/medical-records" className="text-xs font-bold text-indigo-400 hover:underline inline-block">
                      Open Records Vault →
                    </Link>
                  </div>
                )}
              </div>

              {/* Prescription */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" /> Prescription
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Rx Active
                  </span>
                </div>
                {latestPrescription ? (
                  <div className="space-y-1 text-xs pt-1">
                    <div className="font-bold text-white text-sm">Code: {latestPrescription.prescriptionCode}</div>
                    <div className="text-slate-400">{latestPrescription.doctorName}</div>
                    <div className="text-emerald-400 text-[11px] pt-1">{latestPrescription.diagnosis}</div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-1.5">
                    <p className="text-xs text-slate-400">No active prescriptions</p>
                    <Link to="/prescriptions" className="text-xs font-bold text-emerald-400 hover:underline inline-block">
                      View Prescriptions →
                    </Link>
                  </div>
                )}
              </div>

              {/* Emergency SOS Ready */}
              <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-900/60 space-y-3 md:col-span-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" /> Emergency
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    SOS Ready
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <div className="font-bold text-white text-sm">MCE First Aid Desk: 9110885805</div>
                    <div className="text-xs text-slate-300 mt-0.5">Campus Geofence Active (MCE Salagame Road)</div>
                  </div>
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    Trigger SOS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            8. VIDEO CONSULTATION ("Consult Without Leaving Campus")
        ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950 text-teal-300 text-xs font-bold border border-teal-800">
                <Video className="w-3.5 h-3.5" /> Peer-to-Peer Telemedicine
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Consult Without Leaving Campus
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Connect directly with verified campus practitioners over encrypted WebRTC video rooms without leaving your hostel room or department.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <Video className="w-4 h-4 text-teal-400" />
                  <div className="font-bold text-white">HD Video</div>
                  <div className="text-[11px] text-slate-400">Low-latency stream</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <Mic className="w-4 h-4 text-teal-400" />
                  <div className="font-bold text-white">Audio Controls</div>
                  <div className="text-[11px] text-slate-400">Crystal clear VoIP</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <MonitorUp className="w-4 h-4 text-teal-400" />
                  <div className="font-bold text-white">Screen Sharing</div>
                  <div className="text-[11px] text-slate-400">Share report files</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <Lock className="w-4 h-4 text-teal-400" />
                  <div className="font-bold text-white">Secure Room</div>
                  <div className="text-[11px] text-slate-400">Encrypted P2P</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <VideoOff className="w-4 h-4 text-teal-400" />
                  <div className="font-bold text-white">Camera Toggle</div>
                  <div className="text-[11px] text-slate-400">Privacy controls</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <MicOff className="w-4 h-4 text-teal-400" />
                  <div className="font-bold text-white">Mute Controls</div>
                  <div className="text-[11px] text-slate-400">One-touch mute</div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/consultation/apt-101"
                  className="px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold text-xs shadow-lg inline-flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Video className="w-4 h-4" /> Explore Video Consultation
                </Link>
              </div>
            </div>

            {/* Consultation Visual Mockup (Doctor & Patient) */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl bg-slate-950 border border-slate-800 p-5 shadow-2xl space-y-4">
                <div className="aspect-video rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800"
                    alt="Doctor Video Consultation"
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Doctor Feed
                  </div>

                  {/* Patient PiP */}
                  <div className="absolute bottom-3 right-3 w-32 h-24 rounded-xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-lg flex items-center justify-center">
                    <div className="text-center p-2">
                      <div className="w-7 h-7 rounded-full bg-primary-600 text-white font-bold text-xs mx-auto flex items-center justify-center">
                        U
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold block mt-1">You (Patient)</span>
                    </div>
                  </div>
                </div>

                {/* Consultation Control Bar */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <span className="p-2.5 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700 cursor-pointer">
                    <Mic className="w-4 h-4" />
                  </span>
                  <span className="p-2.5 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700 cursor-pointer">
                    <Video className="w-4 h-4" />
                  </span>
                  <span className="p-2.5 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700 cursor-pointer">
                    <MonitorUp className="w-4 h-4" />
                  </span>
                  <span className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer">
                    End Call
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            9. EMERGENCY SUPPORT SECTION
        ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-rose-950 via-[#060d17] to-[#0b192c] border border-rose-600/40 p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                  <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Realtime Incident Protocol
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Campus Emergency Support
                </h2>

                <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                  When immediate campus assistance is needed. Instant incident alert dispatch, campus responder tracking, and direct telephone line to MCE First Aid.
                </p>

                {/* Status parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">GPS Location</div>
                    <div className="font-bold text-white mt-0.5">13.0033° N, 76.1004° E</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Emergency SOS</div>
                    <div className="font-bold text-rose-400 mt-0.5">1-Touch Alert</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">First Aid Desk</div>
                    <div className="font-bold text-white mt-0.5">MCE Center</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Incident Tracking</div>
                    <div className="font-bold text-emerald-400 mt-0.5">Live Dispatch</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-3.5">
                <button
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-xl shadow-rose-900/50 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                >
                  <ShieldAlert className="w-5 h-5 animate-pulse" /> Activate Emergency SOS
                </button>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                  <div className="text-xs font-semibold text-slate-300">
                    Contact: MCE First Aid
                  </div>
                  <a
                    href="tel:9110885805"
                    className="inline-flex items-center justify-center gap-2 text-xl font-black text-rose-400 hover:text-rose-300 transition-colors font-mono"
                  >
                    <Phone className="w-5 h-5" /> 9110885805
                  </a>
                  <a
                    href="tel:9110885805"
                    className="mt-2 w-full py-2 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-white text-xs font-bold border border-rose-500/40 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call MCE First Aid
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            10. TRUSTED HEALTH INFORMATION ("Evidence-Grounded Health Guidance")
        ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
              <FileCheck className="w-3.5 h-3.5" /> Clinical Grounding
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Evidence-Grounded Health Guidance
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              CampusCare AI uses trusted medical information sources where available to provide educational health guidance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* MedlinePlus Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    U.S. National Library of Medicine
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    Clinical Evidence
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">MedlinePlus</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Authoritative clinical information on diseases, symptoms, wellness, and prescription drugs curated by medical professionals.
                </p>
              </div>
              <a
                href="https://medlineplus.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 text-primary-700 dark:text-primary-300 text-xs font-bold transition-colors"
              >
                MedlinePlus <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* WHO Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    United Nations Specialized Agency
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    Global Standards
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">World Health Organization (WHO)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Global clinical guidelines, international health standards, pandemic surveillance, and evidence-grounded health protocols.
                </p>
              </div>
              <a
                href="https://www.who.int/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-bold transition-colors"
              >
                WHO <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* Hassan Locality & Campus Map */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
              OpenStreetMap Hassan Grid
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              Hassan Locality & Campus Health Map
            </h3>
          </div>
          <CampusMap />
        </section>

        {/* ==================================================
            11. SECURITY & PRIVACY ("Your Health Data. Protected.")
        ================================================== */}
        <section className="bg-slate-50 dark:bg-slate-900/60 py-16 sm:py-20 border-y border-slate-200/80 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Architecture & Data Protection
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Your Health Data. Protected.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Built on auditable authentication barriers, strict role checks, and database security.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Secure Authentication',
                  desc: 'Token-based sessions with hashed passwords safeguarding student and faculty identity.',
                  icon: KeyRound
                },
                {
                  title: 'Role-Based Access',
                  desc: 'Strict role barriers isolating Student, Doctor, Faculty, and Admin interfaces.',
                  icon: UserCheck
                },
                {
                  title: 'Protected Medical Records',
                  desc: 'Encrypted e-vault accessible only to the authenticated patient and attending clinician.',
                  icon: Lock
                },
                {
                  title: 'Private Consultations',
                  desc: 'Zero server-side recording on peer-to-peer WebRTC video consultation sessions.',
                  icon: Video
                },
                {
                  title: 'Realtime Notifications',
                  desc: 'Immediate dispatch and appointment status updates over encrypted socket channels.',
                  icon: Bell
                },
                {
                  title: 'Database Security',
                  desc: 'Supabase PostgreSQL Row-Level Security ensuring strict isolation of clinical records.',
                  icon: Database
                }
              ].map(sec => {
                const Icon = sec.icon;
                return (
                  <div
                    key={sec.title}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{sec.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {sec.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================================================
            12. FINAL PREMIUM CTA ("Take Control of Your Campus Healthcare")
        ================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#1e3a8a] via-primary-700 to-teal-700 p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden text-center space-y-6">
            <div className="max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Take Control of Your Campus Healthcare
              </h2>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                From symptom guidance to doctor consultation, CampusCare brings your healthcare journey together.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link
                to="/symptom-checker"
                className="px-6 py-3.5 rounded-2xl bg-white text-[#1e3a8a] hover:bg-slate-100 font-extrabold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> Start AI Health Guidance
              </Link>

              <Link
                to="/appointments/book"
                className="px-6 py-3.5 rounded-2xl bg-blue-900/60 hover:bg-blue-900/90 text-white border border-white/20 font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Book a Consultation
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Medical AI Assistant Bot */}
      <FloatingMedicalAssistant />
    </div>
  );
};
