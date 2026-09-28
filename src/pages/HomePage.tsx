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
  Database
} from 'lucide-react';
import { Doctor } from '../types';
import { doctorService } from '../services/doctorService';
import { statsService, PlatformMetrics } from '../services/statsService';
import { mockDoctors } from '../data/doctors';
import { CampusMap } from '../components/feedback/CampusMap';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { DemoLoginModal } from '../features/auth/DemoLoginModal';
import { FloatingMedicalAssistant } from '../components/common/FloatingMedicalAssistant';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setIsEmergencyModalOpen } = useEmergency();
  const { role, isAuthenticated } = useAuth();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [heroSymptom, setHeroSymptom] = useState('');
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

  return (
    <div className="space-y-20 sm:space-y-28 pb-16 overflow-hidden">
      {/* ==================================================
          ACADEMIC PROJECT & LIVE METRICS NOTICE
      ================================================== */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>CampusCare Telemedicine Platform:</strong> Engineering capstone prototype for Malnad College of Engineering (MCE Hassan). Clinical schedule demo active. For campus emergencies, contact MCE First Aid at <strong>9110885805</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900 text-amber-950 dark:text-amber-100 hidden md:inline-block">
              {metrics.dataSourceLabel}
            </span>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5"
            >
              Demo Switcher <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 2 — IMMERSIVE HERO
      ================================================== */}
      <section className="relative pt-6 sm:pt-12 pb-8 sm:pb-16">
        {/* Subtle Ambient Backdrops */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none -z-10 bg-gradient-to-b from-primary-500/5 via-teal-500/5 to-transparent blur-3xl rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* HERO LEFT */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              {/* Institutional Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e3a8a]/10 dark:bg-[#1e3a8a]/30 border border-[#1e3a8a]/20 text-[#1e3a8a] dark:text-blue-300 text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                MCE CampusCare • Digital Healthcare
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                Healthcare, Connected <br />
                <span className="bg-gradient-to-r from-[#1e3a8a] via-primary-600 to-teal-500 bg-clip-text text-transparent">
                  to Your Campus.
                </span>
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                AI-assisted health guidance, trusted campus doctors, secure medical records, virtual consultations and emergency support — all in one platform.
              </p>

              {/* Primary & Secondary Call to Actions */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/symptom-checker"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#1e3a8a] to-primary-600 hover:from-blue-900 hover:to-primary-700 text-white font-bold text-sm shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> Start AI Health Guidance
                </Link>

                <Link
                  to="/doctors"
                  className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <Stethoscope className="w-4 h-4 text-teal-500" /> Find a Doctor
                </Link>

                <button
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="px-5 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 animate-pulse" /> Emergency SOS
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>AI-Assisted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1e3a8a] dark:text-blue-400" />
                  <span>Campus Healthcare</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-teal-500" />
                  <span>Real-Time Consultation</span>
                </div>
              </div>
            </motion.div>

            {/* HERO RIGHT: Interactive "Campus Health Command Center" visual card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-2xl shadow-blue-900/10 space-y-5">
                {/* Header inside Command Center card */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1e3a8a] to-teal-500 text-white flex items-center justify-center shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        CampusCare AI
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Smart Health Guidance Assistant
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    Live Triage
                  </span>
                </div>

                {/* Symptom Query Prompt */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    How are you feeling today?
                  </label>
                  <form onSubmit={handleStartHeroAssessment} className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={heroSymptom}
                        onChange={e => setHeroSymptom(e.target.value)}
                        placeholder="Describe your symptoms (e.g. headache, fever, sore throat)..."
                        className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-primary-500 transition-all"
                      />
                    </div>

                    {/* Quick Symptom Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1">
                        Quick select:
                      </span>
                      {['Headache', 'Fever', 'Cough', 'Stomach Pain'].map(symptom => (
                        <button
                          key={symptom}
                          type="button"
                          onClick={() => handleQuickChipClick(symptom)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/60 hover:text-primary-600 dark:hover:text-primary-400 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          + {symptom}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" /> Start AI Assessment
                    </button>
                  </form>
                </div>

                {/* Doctor Availability Widget (Uses Real Database Count) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {metrics.availableDoctors > 0 ? metrics.availableDoctors : doctors.length} Doctors Available
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Active campus medical roster
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/doctors"
                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                    >
                      View Doctors →
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 3 — AI HEALTH GUIDANCE FEATURE (Full Width)
      ================================================== */}
      <section className="bg-gradient-to-b from-slate-100/70 via-slate-50/50 to-white dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950 py-16 sm:py-20 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Intelligent Clinical Safety Engine
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Health Guidance
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Understand your symptoms before deciding your next step.
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
                    Active Session
                  </span>
                </div>

                {/* Simulated Conversation Flow */}
                <div className="space-y-4 pt-5 text-xs">
                  {/* User Bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-primary-600 text-white p-3.5 rounded-2xl rounded-tr-xs shadow-sm font-medium">
                      "I have a headache since morning with some eye fatigue."
                    </div>
                  </div>

                  {/* AI Bubble */}
                  <div className="flex justify-start">
                    <div className="max-w-[90%] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3.5 rounded-2xl rounded-tl-xs space-y-2 border border-slate-200/60 dark:border-slate-700">
                      <p className="font-semibold text-primary-600 dark:text-primary-400">
                        CampusCare Medical AI:
                      </p>
                      <p className="leading-relaxed">
                        I can guide you safely through your symptoms. To screen for urgency:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                        <li>Are you experiencing sudden worst-headache-of-life onset?</li>
                        <li>Do you have fever, stiff neck, or visual changes?</li>
                        <li>How much screen time or hydration have you had today?</li>
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
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-teal-600 hover:from-primary-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> Open AI Health Guidance
                </Link>
              </div>
            </div>

            {/* RIGHT: Evidence-Grounded Guidance Cards */}
            <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-teal-500" />
                    Evidence-Grounded Guidance
                  </h4>
                  <span className="text-[10px] text-slate-400">Clinical Protocol Format</span>
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
                      Rest in a quiet, dimmed room. Drink 500ml water immediately. Apply a cool compress to forehead.
                    </p>
                  </div>

                  {/* Common OTC Information */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-1">
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Common OTC Information
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Paracetamol / Acetaminophen (per package directions). Always verify with campus clinician if symptoms persist.
                    </p>
                  </div>

                  {/* Recommended Specialty & Trusted Sources */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                      <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                        Recommended Specialty
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                        General Medicine • MCE Clinic
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60">
                      <div className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase">
                        Trusted Sources
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                        <span>MedlinePlus</span>
                        <span>•</span>
                        <span>WHO Guidelines</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  <strong>Disclaimer:</strong> AI guidance is educational and does not replace a medical diagnosis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 4 — CAMPUS DOCTORS
      ================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
              <Stethoscope className="w-3.5 h-3.5" /> Medical Panel & Faculty
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Meet Your Campus Doctors
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Connect with healthcare professionals available through CampusCare.
            </p>
          </div>

          <Link
            to="/doctors"
            className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View All Doctors →
          </Link>
        </div>

        {/* Doctor Cards Grid */}
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
                  {/* Doctor Avatar & Status */}
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
                          title="Verified Public Profile in Database"
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

                  {/* Verification Status Pill (Direct DB Value) */}
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

                  {/* Consultation Fee & Availability */}
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

                {/* Actions */}
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
          SECTION 5 — SMART HEALTHCARE JOURNEY
      ================================================== */}
      <section className="bg-slate-900 text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-c from-[#1e3a8a]/20 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Coordinated Care Protocol
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Smart Healthcare Journey
            </h2>
            <p className="text-sm text-slate-400">
              A continuous, frictionless pathway from symptom discovery to post-consultation recovery.
            </p>
          </div>

          {/* Desktop Horizontal Journey / Mobile Vertical Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative">
            {[
              {
                step: '01',
                title: 'Describe Symptoms',
                desc: 'Input symptoms or select quick clinical indicators in plain language.'
              },
              {
                step: '02',
                title: 'AI Health Guidance',
                desc: 'Receive immediate severity triage, red-flag screening, and self-care steps.'
              },
              {
                step: '03',
                title: 'Choose Doctor',
                desc: 'Select from verified campus physicians and specialty practitioners.'
              },
              {
                step: '04',
                title: 'Book Appointment',
                desc: 'Reserve a convenient slot for in-person or virtual consultation.'
              },
              {
                step: '05',
                title: 'Video Consultation',
                desc: 'Engage in private, encrypted peer-to-peer WebRTC video care.'
              },
              {
                step: '06',
                title: 'Prescription & Records',
                desc: 'Instant digital prescription stored safely in your health vault with pill reminders.'
              }
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="relative p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-teal-500/50 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-teal-400 font-mono">
                      {item.step}
                    </span>
                    {idx < 5 && (
                      <ChevronRight className="w-4 h-4 text-slate-500 hidden md:block group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white mt-2">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">{item.desc}</p>
                </div>
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-gradient-to-r from-teal-400 to-[#1e3a8a] group-hover:w-full transition-all duration-500" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 6 — HEALTHCARE COMMAND CENTER (Dashboard-Style)
      ================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
            <Activity className="w-3.5 h-3.5" /> Direct Clinical Portals
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Your Campus Health Command Center
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            One-touch access to all student, faculty, and clinical operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: 'AI Guidance',
              desc: 'Triage symptoms and screen red flags anytime.',
              path: '/symptom-checker',
              icon: Sparkles,
              color: 'text-amber-500',
              bgColor: 'bg-amber-50 dark:bg-amber-950/40',
              badge: 'Safe Triage'
            },
            {
              title: 'Doctor Consultation',
              desc: 'Browse verified campus doctors and book slots.',
              path: '/doctors',
              icon: Stethoscope,
              color: 'text-[#1e3a8a] dark:text-blue-400',
              bgColor: 'bg-blue-50 dark:bg-blue-950/40',
              badge: `${metrics.activeDoctors || doctors.length} Doctors`
            },
            {
              title: 'Appointments',
              desc: 'Review upcoming consultations and past visit history.',
              path: '/appointments',
              icon: Calendar,
              color: 'text-teal-600 dark:text-teal-400',
              bgColor: 'bg-teal-50 dark:bg-teal-950/40',
              badge: 'Real-time'
            },
            {
              title: 'Medical Records',
              desc: 'Encrypted patient records vault and lab reports.',
              path: '/medical-records',
              icon: FileText,
              color: 'text-indigo-600 dark:text-indigo-400',
              bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
              badge: 'Encrypted'
            },
            {
              title: 'Prescriptions',
              desc: 'Review digital prescriptions issued by campus doctors.',
              path: '/prescriptions',
              icon: FileCheck,
              color: 'text-emerald-600 dark:text-emerald-400',
              bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
              badge: 'Verified Rx'
            },
            {
              title: 'Medicine Reminders',
              desc: 'Scheduled dose notifications and intake tracker.',
              path: '/medications',
              icon: Pill,
              color: 'text-purple-600 dark:text-purple-400',
              bgColor: 'bg-purple-50 dark:bg-purple-950/40',
              badge: 'Active Alarms'
            },
            {
              title: 'Video Consultation',
              desc: 'Encrypted WebRTC consultation room with your doctor.',
              path: '/consultation/apt-101',
              icon: Video,
              color: 'text-cyan-600 dark:text-cyan-400',
              bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
              badge: 'WebRTC P2P'
            },
            {
              title: 'Emergency Support',
              desc: 'Immediate dispatch and campus first aid response.',
              path: '/emergency',
              icon: ShieldAlert,
              color: 'text-rose-600 dark:text-rose-400',
              bgColor: 'bg-rose-50 dark:bg-rose-950/40',
              badge: '9110885805'
            }
          ].map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.path}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 rounded-2xl ${card.bgColor} ${card.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    {card.desc}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-primary-600 dark:text-primary-400">
                  <span>Open Portal</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ==================================================
          SECTION 7 — EMERGENCY SUPPORT
      ================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-rose-950/90 via-slate-900 to-slate-950 border border-rose-600/30 p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle Emergency Flare */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Urgent Medical Response
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Campus Emergency Support
              </h2>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Get immediate assistance from the MCE First Aid workflow. Fast-track dispatch, GPS geofencing, and real-time first responder incident status tracking.
              </p>

              {/* Status features list */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">GPS Location</div>
                  <div className="font-bold text-white mt-0.5">13.0033° N, 76.1004° E</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Emergency SOS</div>
                  <div className="font-bold text-rose-400 mt-0.5">Instant Alert Button</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">First Aid Desk</div>
                  <div className="font-bold text-white mt-0.5">MCE Campus Center</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Incident Status</div>
                  <div className="font-bold text-emerald-400 mt-0.5">Realtime Tracking</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3.5">
              <button
                onClick={() => setIsEmergencyModalOpen(true)}
                className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
              >
                <ShieldAlert className="w-5 h-5 animate-pulse" /> Activate Emergency SOS
              </button>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-xs font-semibold text-slate-300">
                  Direct Campus First Aid Desk:
                </div>
                <a
                  href="tel:9110885805"
                  className="inline-flex items-center justify-center gap-2 text-xl font-black text-rose-400 hover:text-rose-300 transition-colors font-mono"
                >
                  <Phone className="w-5 h-5" /> 9110885805
                </a>
                <p className="text-[10px] text-slate-400">
                  Dedicated MCE First Aid Protocol
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 8 — HEALTHCARE SERVICES & HASSAN LOCALITY
      ================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
              <Layers className="w-3.5 h-3.5" /> Clinical Services
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Comprehensive Campus Healthcare Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Full spectrum clinical support, student wellness, and local healthcare mapping.
            </p>
          </div>

          <Link
            to="/services"
            className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Explore All Services →
          </Link>
        </div>

        {/* 9 Interactive Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              name: 'AI Health Guidance',
              desc: 'Automated triage screening symptoms and providing safe clinical first-step advice.',
              path: '/symptom-checker',
              icon: Sparkles
            },
            {
              name: 'Doctor Consultation',
              desc: 'Book one-on-one appointments with verified MCE doctors across clinical departments.',
              path: '/doctors',
              icon: Stethoscope
            },
            {
              name: 'Video Consultation',
              desc: 'Private WebRTC video calls with zero latency and peer-to-peer data protection.',
              path: '/consultation/apt-101',
              icon: Video
            },
            {
              name: 'Medical Records',
              desc: 'Secure digital repository for patient lab results, medical history, and clinical notes.',
              path: '/medical-records',
              icon: FileText
            },
            {
              name: 'Prescriptions',
              desc: 'Doctor-signed electronic prescriptions downloadable anytime as verified records.',
              path: '/prescriptions',
              icon: FileCheck
            },
            {
              name: 'Medicine Reminders',
              desc: 'Automated dosage scheduling preventing missed medication times during exam cycles.',
              path: '/medications',
              icon: Pill
            },
            {
              name: 'Hospitals',
              desc: 'Directory and live map coordinates of Hassan referral facilities and government centers.',
              path: '/hospitals',
              icon: Building2
            },
            {
              name: 'Pharmacies',
              desc: 'Nearby licensed pharmacies in Hassan with operating hours and campus proximity.',
              path: '/pharmacies',
              icon: MapPin
            },
            {
              name: 'Emergency Support',
              desc: 'Direct line to MCE First Aid Desk with one-click SOS alarm dispatch.',
              path: '/emergency',
              icon: ShieldAlert
            }
          ].map(svc => {
            const Icon = svc.icon;
            return (
              <Link
                key={svc.name}
                to={svc.path}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                    {svc.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5">
                    {svc.desc}
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400">
                  <span>Access Service</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Hassan Locality & Campus Map */}
        <div className="pt-6">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
              OpenStreetMap Geographic Grid
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              Hassan Campus & Locality Health Map
            </h3>
          </div>
          <CampusMap />
        </div>
      </section>

      {/* ==================================================
          SECTION 9 — TRUST & SECURITY
      ================================================== */}
      <section className="bg-slate-50 dark:bg-slate-900/60 py-16 sm:py-20 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Data Protection Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Your Health Data. Protected.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Built with privacy-first engineering, strict data isolation, and auditable authorization boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Secure Authentication',
                desc: 'Protected session tokens, password hashing, and role checks on all protected API routes.',
                icon: KeyRound
              },
              {
                title: 'Role-Based Access',
                desc: 'Strict role segregation for Students, Faculty, Doctors, and Administrators with isolated interfaces.',
                icon: UserCheck
              },
              {
                title: 'Protected Medical Records',
                desc: 'Confidential e-vault accessible only to the authenticated patient and their attending clinician.',
                icon: Lock
              },
              {
                title: 'Private Consultations',
                desc: 'Encrypted peer-to-peer WebRTC channels without server-side audio/video recording.',
                icon: Video
              },
              {
                title: 'Supabase RLS',
                desc: 'PostgreSQL Row-Level Security ensuring zero unauthorized cross-tenant data access.',
                icon: Database
              },
              {
                title: 'Secure Data Handling',
                desc: 'Environment-isolated serverless backend with secret credentials never exposed in the browser.',
                icon: ShieldCheck
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
          SECTION 10 — TRUSTED MEDICAL INFORMATION
      ================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
            <FileCheck className="w-3.5 h-3.5" /> Authoritative Clinical Literature
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Trusted Health Information
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            CampusCare AI guidance grounds symptom triage in globally recognized medical references.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* MedlinePlus Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  National Institutes of Health (NIH)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  Clinical Evidence
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">MedlinePlus</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Curated clinical knowledge base from the U.S. National Library of Medicine providing authoritative insights on symptoms, over-the-counter precautions, and diseases.
              </p>
            </div>
            <a
              href="https://medlineplus.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline pt-2"
            >
              Visit MedlinePlus Reference Grid <ExternalLink className="w-3.5 h-3.5" />
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
                Global health guidelines, disease prevention standards, pandemic alerts, and international health recommendations referenced in campus triage algorithms.
              </p>
            </div>
            <a
              href="https://www.who.int/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-2"
            >
              Visit World Health Organization <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 11 — FINAL CTA
      ================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#1e3a8a] via-primary-700 to-teal-700 p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Take the next step toward better campus healthcare.
            </h2>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
              Join students and faculty across Malnad College of Engineering in receiving safe health guidance, booking verified appointments, and protecting your health records.
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

      {/* Fast Examiner Demo Modal */}
      <DemoLoginModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />

      {/* Floating Medical AI Assistant Bot */}
      <FloatingMedicalAssistant />
    </div>
  );
};
