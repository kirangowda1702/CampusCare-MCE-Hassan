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
  Stethoscope
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

  // Doctors matching state
  const [verifiedDoctors, setVerifiedDoctors] = useState<Doctor[]>([]);

  // Medicine lookup state
  const [medicineQuery, setMedicineQuery] = useState<string>('');
  const [medicineResults, setMedicineResults] = useState<MedicineInfo[] | null>(null);
  const [isMedicineLoading, setIsMedicineLoading] = useState(false);

  const providerStatus = aiService.getProviderStatus();

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
    setStep(2);
  };

  const handleRunGuidance = async () => {
    setIsLoading(true);
    setErrorMessage(null);
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
      setErrorMessage(err.message || 'Unable to complete evaluation. Please try again.');
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
  };

  const handleMedicineSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!medicineQuery.trim()) return;

    setIsMedicineLoading(true);
    try {
      const info = await aiService.queryMedicine(medicineQuery.trim());
      setMedicineResults(info);
    } catch (err) {
      console.warn('Medicine lookup error:', err);
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
            <p className="font-bold">Medical Safety & Educational Decision-Support Notice:</p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional. Never delay seeking professional medical evaluation.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs self-start">
          <Bot className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div>
            <span className="font-bold block text-slate-800 dark:text-slate-200">Clinical AI Engine:</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Google Gemini 1.5 Flash + MedlinePlus / WHO
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Symptom Checker vs Medicine Info */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => { setActiveTab('symptoms'); setErrorMessage(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'symptoms'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Symptom Guidance & Triage
        </button>

        <button
          onClick={() => { setActiveTab('medicine'); setErrorMessage(null); }}
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

      {/* ERROR ALERT */}
      {errorMessage && (
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
                          Select the common symptoms you are experiencing or describe them below.
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
                        placeholder="e.g., Throbbing headache on the right side with mild nausea since yesterday evening..."
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
                      {selectedSymptoms.length} symptom(s) selected
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
                      Answering these contextual questions helps evaluate severity and red flags accurately.
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
                          <Loader2 className="w-4 h-4 animate-spin" /> Evaluating Evidence-Based Guidance...
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
                      Urgency Level: {triageResult.urgency}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {triageResult.isRealAI ? '⚡ Evaluated with Google Gemini 1.5 Flash' : '📋 Clinical Decision Support Protocol'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                    {triageResult.summary}
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
                    <span>This may require urgent medical attention.</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                    Life-threatening symptoms or high-risk red flags have been detected. Please contact national emergency services or proceed immediately to HIMS Hassan Trauma Centre.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="tel:112"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call 112 (National Emergency)
                    </a>
                    <a
                      href="tel:108"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call 108 (Ambulance)
                    </a>
                    <button
                      onClick={() => setIsEmergencyModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Campus Emergency / First Aid
                    </button>
                  </div>
                </div>
              )}

              {/* Possible Causes to Discuss with a Clinician */}
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

              {/* What To Do Now & Recommended Action */}
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

              {/* Red-Flag Symptoms Warnings */}
              {triageResult.red_flags && triageResult.red_flags.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
                  <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Red-Flag Warning Signs:
                  </h4>
                  <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
                    {triageResult.red_flags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold">&bull;</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Supportive Self-Care Guidelines */}
              {triageResult.self_care && triageResult.self_care.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Supportive Self-Care Guidelines
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {triageResult.self_care.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-tealAccent-500 flex-shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Doctor Directory Recommendation Section */}
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
                          <Calendar className="w-3.5 h-3.5" /> Book
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                    Specialist currently unavailable in CampusCare directory. Please visit HIMS Hassan OPD or consult the on-duty campus medical officer.
                  </div>
                )}
              </div>

              {/* Authoritative Sources */}
              {triageResult.sources && triageResult.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Authoritative Medical Information Sources
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
                        <span>{src.title} ({src.organization})</span>
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
                  <Calendar className="w-4 h-4" /> Book Doctor Consultation
                </Link>

                <button
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                >
                  <HeartPulse className="w-4 h-4 text-rose-500" /> Campus Emergency SOS
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
              Authoritative Medicine Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Look up general use, contraindications, cautions, and verified drug facts from MedlinePlus / WHO.
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

          {/* Preset Medicine Suggestions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Quick suggestions:</span>
            {['Paracetamol', 'Ibuprofen', 'Cetirizine', 'Oral Rehydration Salts (ORS)'].map(med => (
              <button
                key={med}
                type="button"
                onClick={() => {
                  setMedicineQuery(med);
                  aiService.queryMedicine(med).then(res => setMedicineResults(res));
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700"
              >
                {med}
              </button>
            ))}
          </div>

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
                      Verified Drug Information
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">General Use:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.general_use}</p>
                    </div>

                    <div>
                      <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">Cautions:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.cautions}</p>
                    </div>

                    <div>
                      <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">Common Side Effects:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.side_effects}</p>
                    </div>

                    <div>
                      <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">Interaction Warnings:</strong>
                      <p className="text-slate-600 dark:text-slate-400">{med.interaction_warnings}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Source: {med.source}</span>
                  </div>
                </div>
              ))}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                <strong>Safety Notice:</strong> Medication choice depends on your symptoms, medical history, allergies, current medicines, age and other factors. Please consult a qualified healthcare professional.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
