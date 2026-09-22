import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Info,
  CheckCircle2,
  Calendar,
  PhoneCall,
  Activity,
  Bot,
  Loader2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Pill,
  HeartPulse,
  UserCheck,
  Search,
  ArrowRight,
  RotateCcw,
  Stethoscope,
  ShieldAlert
} from 'lucide-react';
import { mockSymptomsList } from '../../data/symptoms';
import { SymptomGuidanceRequest, SymptomGuidanceResponse, MedicineInfo, Doctor } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { useEmergency } from '../../context/EmergencyContext';
import { aiService } from '../../services/aiService';
import { doctorService } from '../../services/doctorService';

export const SymptomTriage: React.FC = () => {
  const navigate = useNavigate();
  const { setIsEmergencyModalOpen } = useEmergency();

  // Mode: Symptom Guidance vs Medicine Lookup
  const [activeTab, setActiveTab] = useState<'symptoms' | 'medicine'>('symptoms');

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [freeTextSymptom, setFreeTextSymptom] = useState<string>('');
  const [severity, setSeverity] = useState<number>(4);
  const [durationDays, setDurationDays] = useState<number>(2);
  const [ageGroup, setAgeGroup] = useState<string>('college_student');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [currentMedications, setCurrentMedications] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [pregnancyStatus, setPregnancyStatus] = useState<string>('not_applicable');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Results State
  const [triageResult, setTriageResult] = useState<SymptomGuidanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  // Doctors matching state
  const [verifiedDoctors, setVerifiedDoctors] = useState<Doctor[]>([]);

  // Medicine lookup state
  const [medicineQuery, setMedicineQuery] = useState<string>('');
  const [medicineResults, setMedicineResults] = useState<MedicineInfo[] | null>(null);
  const [isMedicineLoading, setIsMedicineLoading] = useState(false);
  const [medicineError, setMedicineError] = useState<string | null>(null);

  // Load verified doctors for directory mapping
  useEffect(() => {
    doctorService.getDoctors().then(docs => setVerifiedDoctors(docs)).catch(() => {});
  }, []);

  const filteredSymptoms = mockSymptomsList.filter(
    s =>
      s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter(item => item !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  const toggleCondition = (cond: string) => {
    if (selectedConditions.includes(cond)) {
      setSelectedConditions(selectedConditions.filter(c => c !== cond));
    } else {
      setSelectedConditions([...selectedConditions, cond]);
    }
  };

  const handleProceedToFollowUp = () => {
    if (selectedSymptoms.length === 0 && !freeTextSymptom.trim()) {
      setErrorMessage('Please select at least one symptom or describe what you are experiencing.');
      return;
    }
    setErrorMessage(null);
    setIsUnavailable(false);
    setStep(2);
  };

  const handleRunGuidance = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsUnavailable(false);
    try {
      const requestPayload: SymptomGuidanceRequest = {
        symptoms: selectedSymptoms,
        freeText: freeTextSymptom.trim(),
        severity,
        durationDays,
        ageGroup,
        medicalConditions: selectedConditions,
        currentMedications: currentMedications.trim(),
        allergies: allergies.trim(),
        pregnancyStatus
      };

      const result = await aiService.analyzeSymptoms(requestPayload);
      setTriageResult(result);
    } catch (err: any) {
      console.warn('Guidance evaluation error:', err);
      const msg = err.message || 'AI Health Guidance is currently unavailable.';
      setErrorMessage(msg);
      if (msg.includes('unavailable') || msg.includes('fail')) {
        setIsUnavailable(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedSymptoms([]);
    setFreeTextSymptom('');
    setTriageResult(null);
    setStep(1);
    setSeverity(4);
    setDurationDays(2);
    setSelectedConditions([]);
    setCurrentMedications('');
    setAllergies('');
    setErrorMessage(null);
    setIsUnavailable(false);
  };

  const handleMedicineSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!medicineQuery.trim()) return;

    setIsMedicineLoading(true);
    setMedicineError(null);
    try {
      const info = await aiService.queryMedicine(medicineQuery.trim());
      setMedicineResults(info);
    } catch (err: any) {
      console.warn('Medicine lookup error:', err);
      setMedicineError(err.message || 'Unable to retrieve medicine information.');
      setMedicineResults(null);
    } finally {
      setIsMedicineLoading(false);
    }
  };

  // Find matching doctors based on recommended specialty
  const matchedDoctors = triageResult
    ? verifiedDoctors.filter(d => {
        const spec = (d.specialization || '').toLowerCase();
        const rec = (triageResult.recommended_specialty || '').toLowerCase();
        return spec.includes(rec) || rec.includes(spec) || spec.includes('general');
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Medical Safety Notice */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-xs">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">Medical Safety & Evidence-Grounded Notice:</p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional. Never delay seeking professional clinical evaluation.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs self-start">
          <Bot className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div>
            <span className="font-bold block text-slate-800 dark:text-slate-200">Clinical AI Engine:</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Google Gemini + MedlinePlus & WHO Sources
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Symptom Checker vs Medicine Info */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => { setActiveTab('symptoms'); setErrorMessage(null); setIsUnavailable(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'symptoms'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          AI Health Guidance
        </button>

        <button
          onClick={() => { setActiveTab('medicine'); setErrorMessage(null); setIsUnavailable(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'medicine'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Pill className="w-4 h-4" />
          Medicine Information
        </button>
      </div>

      {/* UNAVAILABLE / FAILURE MODE BANNER */}
      {isUnavailable && (
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>AI Health Guidance is currently unavailable.</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            The AI service could not be reached. For your health and safety, please book an appointment with a verified doctor or contact campus emergency services directly.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/appointments/book"
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" /> Book Doctor
            </Link>
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4" /> Campus Emergency
            </button>
          </div>
        </div>
      )}

      {/* ERROR ALERT (Non-unavailable) */}
      {errorMessage && !isUnavailable && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: SYMPTOM GUIDANCE */}
      {activeTab === 'symptoms' && (
        <>
          {!triageResult ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
              {/* STEP 1: Describe / Select Symptoms */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                          <Activity className="w-5 h-5 text-primary-600" />
                          Step 1: Enter or Select Symptoms
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Describe your symptoms or select common ones below.
                        </p>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filter symptoms..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="py-1.5 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs w-56"
                        />
                      </div>
                    </div>

                    {/* Free text input */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Describe what you are feeling in your own words:
                      </label>
                      <textarea
                        rows={2}
                        value={freeTextSymptom}
                        onChange={e => setFreeTextSymptom(e.target.value)}
                        placeholder="e.g., headache, fever and cough, itchy skin, back pain..."
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Symptoms Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {filteredSymptoms.map(s => {
                        const isSelected = selectedSymptoms.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSymptom(s.id)}
                            className={`p-3 rounded-xl border text-left text-xs transition-all ${
                              isSelected
                                ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-900 dark:text-primary-200 font-semibold shadow-sm ring-1 ring-primary-500'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">{s.category}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />}
                            </div>
                            <div className="font-bold">{s.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {selectedSymptoms.length} selected &bull; {freeTextSymptom.trim() ? 'Text description provided' : 'No description'}
                    </span>
                    <button
                      onClick={handleProceedToFollowUp}
                      className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
                    >
                      Next: Clinical Follow-up <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Clinical Follow-Up Questions */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-tealAccent-500" />
                      Step 2: Relevant Clinical Follow-Up
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Contextual information helps refine triage urgency and safety precautions accurately.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Severity Slider */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-white">
                        Symptom Severity (Scale 1-10): <span className="text-primary-600 font-mono text-sm">{severity}</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={severity}
                        onChange={e => setSeverity(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>1 (Mild)</span>
                        <span>5 (Moderate)</span>
                        <span>10 (Severe)</span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-white">
                        Duration of Symptoms:
                      </label>
                      <select
                        value={durationDays}
                        onChange={e => setDurationDays(parseInt(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      >
                        <option value={1}>Less than 24 hours</option>
                        <option value={2}>1 to 2 days</option>
                        <option value={4}>3 to 5 days</option>
                        <option value={7}>1 week or more</option>
                      </select>
                    </div>

                    {/* Demographics */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-white">
                        Age Group / Role:
                      </label>
                      <select
                        value={ageGroup}
                        onChange={e => setAgeGroup(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      >
                        <option value="college_student">Undergraduate / PG Student (Age 18-24)</option>
                        <option value="faculty">Faculty / Staff Member (Age 25-50)</option>
                        <option value="senior_staff">Senior Faculty / Retired Staff (Age 50+)</option>
                      </select>
                    </div>
                  </div>

                  {/* Existing Medical Conditions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-white mb-2">
                      Relevant Medical Conditions (if any):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Asthma / Respiratory', 'Diabetes', 'Hypertension', 'Heart Condition', 'Migraine', 'None'].map(c => {
                        const isSelected = selectedConditions.includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleCondition(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isSelected
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Medicines & Allergies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-white mb-1">
                        Current Medications (Optional):
                      </label>
                      <input
                        type="text"
                        value={currentMedications}
                        onChange={e => setCurrentMedications(e.target.value)}
                        placeholder="e.g., Inhaler, Metformin, None..."
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-white mb-1">
                        Known Drug Allergies (Optional):
                      </label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={e => setAllergies(e.target.value)}
                        placeholder="e.g., Penicillin, Sulfa, None..."
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    >
                      &larr; Back to Symptoms
                    </button>

                    <button
                      onClick={handleRunGuidance}
                      disabled={isLoading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-tealAccent-600 hover:from-primary-700 hover:to-tealAccent-700 text-white font-bold text-xs shadow-lg shadow-primary-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Evaluating Evidence-Grounded Guidance...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Get Health Guidance
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 4: STRUCTURED OUTPUT VIEW */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
              {/* Top Banner with Urgency & Reset */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                        triageResult.urgency === 'EMERGENCY'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : triageResult.urgency === 'URGENT'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                          : triageResult.urgency === 'MODERATE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      {triageResult.urgency === 'EMERGENCY' ? <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> : <Activity className="w-3.5 h-3.5" />}
                      Urgency: {triageResult.urgency}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {triageResult.isRealAI ? '⚡ Evidence-Grounded Gemini AI' : '🛡️ Safety Triage Protocol'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                    {triageResult.symptom_summary}
                  </h3>
                </div>

                <button
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Start New Check
                </button>
              </div>

              {/* EMERGENCY CALLOUT BANNER */}
              {triageResult.urgency === 'EMERGENCY' && (
                <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-900 dark:text-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
                    <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>These symptoms may require urgent medical attention.</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                    Life-threatening symptoms or acute red flags have been detected. Please contact MCE First Aid immediately.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="tel:9110885805"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call MCE First Aid (9110885805)
                    </a>
                    <button
                      onClick={() => setIsEmergencyModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Campus First Aid
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION: Possible Causes to Discuss with a Clinician */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary-500" />
                  Possible Causes to Discuss with a Healthcare Professional
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {triageResult.possible_conditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{cond.name}</span>
                        <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                          {cond.likelihood} Likelihood
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{cond.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: What To Do Now */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2">
                <h4 className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" /> What To Do Now:
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold leading-relaxed">
                  {triageResult.recommended_action}
                </p>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Recommended Medical Specialty: <strong className="text-slate-900 dark:text-white">{triageResult.recommended_specialty}</strong>
                </div>
              </div>

              {/* SECTION: Common OTC Options */}
              {triageResult.common_otc_options && triageResult.common_otc_options.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                  <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-emerald-600" /> Common OTC Options (General Supportive Information):
                  </h4>
                  <ul className="space-y-1 text-xs text-emerald-800 dark:text-emerald-300">
                    {triageResult.common_otc_options.map((opt, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold">&bull;</span>
                        <span>{opt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECTION: Precautions */}
              {triageResult.medicine_precautions && triageResult.medicine_precautions.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                  <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" /> Precautions & Important Warnings:
                  </h4>
                  <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
                    {triageResult.medicine_precautions.map((prec, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold">&bull;</span>
                        <span>{prec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECTION: Red Flags */}
              {triageResult.red_flags && triageResult.red_flags.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-2">
                  <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Red-Flag Symptoms:
                  </h4>
                  <ul className="space-y-1 text-xs text-rose-800 dark:text-rose-300">
                    {triageResult.red_flags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold">&bull;</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECTION: Recommended Specialist & Doctor Directory Mapping */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-primary-600" /> Verified CampusCare Specialists ({triageResult.recommended_specialty})
                  </h4>
                  <Link
                    to="/directory/doctors"
                    className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                  >
                    View All Doctors &rarr;
                  </Link>
                </div>

                {matchedDoctors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchedDoctors.slice(0, 2).map(doc => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300 text-xs">
                            {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                              {doc.name}
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {doc.specialization} &bull; {doc.hospital_name}
                            </div>
                          </div>
                        </div>

                        <Link
                          to={`/appointments/book?doctorId=${doc.id}&specialty=${encodeURIComponent(doc.specialization)}`}
                          className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm flex-shrink-0"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Book Consultation
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                    Specialist currently unavailable in CampusCare directory. Please visit HIMS Hassan / District Hospital OPD or consult the on-duty campus medical officer.
                  </div>
                )}
              </div>

              {/* SECTION: Trusted Sources */}
              {triageResult.sources && triageResult.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Trusted Medical Sources
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {triageResult.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                      >
                        <span>{src.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Disclaimer Display */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 leading-relaxed">
                <strong>Disclaimer:</strong> {triageResult.disclaimer}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <Link
                  to="/appointments/book"
                  className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Book Consultation
                </Link>

                <button
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                >
                  <HeartPulse className="w-4 h-4 text-rose-500" /> Campus Emergency / First Aid
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: MEDICINE INFORMATION LOOKUP */}
      {activeTab === 'medicine' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-600" />
              Evidence-Based Medicine Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Look up general use, warnings, precautions, side effects, and exact authoritative source pages (MedlinePlus / WHO).
            </p>
          </div>

          <form onSubmit={handleMedicineSearch} className="flex gap-2">
            <input
              type="text"
              value={medicineQuery}
              onChange={e => setMedicineQuery(e.target.value)}
              placeholder="Search medicine (e.g., Paracetamol, Ibuprofen, Cetirizine, ORS)..."
              className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isMedicineLoading || !medicineQuery.trim()}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isMedicineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search Medicine
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Common medications:</span>
            {['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Oral Rehydration Salts (ORS)'].map(med => (
              <button
                key={med}
                type="button"
                onClick={() => {
                  setMedicineQuery(med);
                  aiService.queryMedicine(med).then(res => setMedicineResults(res)).catch(() => {});
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700"
              >
                {med}
              </button>
            ))}
          </div>

          {/* Medicine Search Error */}
          {medicineError && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{medicineError}</span>
            </div>
          )}

          {/* Medicine Results */}
          {medicineResults && medicineResults.length > 0 && (
            <div className="space-y-4 pt-2">
              {medicineResults.map((med, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      {med.name}
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      Authoritative Drug Information
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">General Use:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.general_use}</p>
                    </div>

                    {med.warnings && (
                      <div>
                        <strong className="block text-rose-700 dark:text-rose-400 mb-0.5">Warnings:</strong>
                        <p className="text-slate-600 dark:text-slate-400">{med.warnings}</p>
                      </div>
                    )}

                    <div>
                      <strong className="block text-amber-700 dark:text-amber-400 mb-0.5">Precautions:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.cautions}</p>
                    </div>

                    <div>
                      <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">Common Side Effects:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.side_effects}</p>
                    </div>

                    <div className="md:col-span-2">
                      <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">Interaction Information:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.interaction_warnings}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Source: {med.source}</span>
                    {med.source_url && (
                      <a
                        href={med.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                      >
                        <span>View Source Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                <strong>Safety Notice:</strong> Medication choice depends on your symptoms, medical history, allergies, current medicines, age and other clinical factors. Please consult a qualified healthcare professional.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
