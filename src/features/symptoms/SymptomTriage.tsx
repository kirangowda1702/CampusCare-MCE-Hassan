import React, { useState } from 'react';
import {
  Sparkles,
  Info,
  CheckCircle2,
  Calendar,
  PhoneCall,
  Activity,
  Bot,
  Loader2
} from 'lucide-react';
import { mockSymptomsList } from '../../data/symptoms';
import { SymptomTriageResult } from '../../types';
import { Link } from 'react-router-dom';
import { useEmergency } from '../../context/EmergencyContext';
import { aiService, AITriageResponse } from '../../services/aiService';

export const SymptomTriage: React.FC = () => {
  const { setIsEmergencyModalOpen } = useEmergency();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number>(4);
  const [durationDays, setDurationDays] = useState<number>(2);
  const [ageGroup, setAgeGroup] = useState<string>('college_student');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [triageResult, setTriageResult] = useState<AITriageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const providerStatus = aiService.getProviderStatus();

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

  const handleRunTriage = async () => {
    if (selectedSymptoms.length === 0) {
      alert('Please select at least one symptom to evaluate.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await aiService.analyzeSymptoms(
        selectedSymptoms,
        severity,
        durationDays,
        ageGroup
      );
      setTriageResult(result);
    } catch (err) {
      console.warn('Triage error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedSymptoms([]);
    setTriageResult(null);
    setSeverity(4);
    setDurationDays(2);
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner & Provider Indicator */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-xs">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">Medical Safety & Educational Decision-Support Notice:</p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              This tool provides health guidance only and does not replace diagnosis or treatment by a qualified healthcare professional. For life-threatening emergencies, visit HIMS Hassan Trauma Center or dial 108.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs self-start">
          <Bot className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div>
            <span className="font-bold block text-slate-800 dark:text-slate-200">Triage Engine:</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {providerStatus.isConfigured ? '⚡ Google Gemini AI Active' : '📋 Clinical Decision Rule Engine (AI provider not configured)'}
            </span>
          </div>
        </div>
      </div>

      {!triageResult ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" />
                  1. Select Current Symptoms
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select all symptoms you are experiencing today ({selectedSymptoms.length} selected)
                </p>
              </div>
              <input
                type="text"
                placeholder="Search symptoms..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs w-56"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredSymptoms.map(s => {
                const isSelected = selectedSymptoms.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSymptom(s.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-900 dark:text-primary-200 font-semibold shadow-sm'
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-white mb-2">
                Symptom Severity (Scale 1-10): <span className="text-primary-600">{severity}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={severity}
                onChange={e => setSeverity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 (Mild)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-white mb-2">
                Duration of Symptoms:
              </label>
              <select
                value={durationDays}
                onChange={e => setDurationDays(parseInt(e.target.value))}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value={1}>Less than 24 hours</option>
                <option value={2}>1 to 2 days</option>
                <option value={4}>3 to 5 days</option>
                <option value={7}>1 week or more</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-white mb-2">
                User Demographics / Role:
              </label>
              <select
                value={ageGroup}
                onChange={e => setAgeGroup(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="college_student">Undergraduate / PG Student (Age 18-24)</option>
                <option value="faculty">Faculty / Staff Member (Age 25-50)</option>
                <option value="senior_staff">Senior Faculty / Retired Staff (Age 50+)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleRunTriage}
              disabled={selectedSymptoms.length === 0 || isLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-tealAccent-600 hover:from-primary-700 hover:to-tealAccent-700 text-white font-bold text-xs shadow-lg shadow-primary-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Evaluating Symptoms...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Run AI Triage Assessment
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    triageResult.riskLevel === 'emergency'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : triageResult.riskLevel === 'high'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                      : triageResult.riskLevel === 'moderate'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  Risk Level: {triageResult.riskLevel.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">
                  Generated via {triageResult.provider === 'gemini-1.5-flash' ? 'Google Gemini AI' : 'Clinical Decision Matrix'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                {triageResult.summary}
              </h3>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Check Other Symptoms
            </button>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Possible Condition Categories
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {triageResult.possibleConditions.map((cond, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{cond.name}</span>
                    <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded">
                      {cond.likelihood} Likelihood
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{cond.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2">
            <h4 className="font-bold text-xs text-blue-900 dark:text-blue-200">
              Recommended Campus Healthcare Action:
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold">
              {triageResult.recommendedAction}
            </p>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Department: <strong className="text-slate-800 dark:text-slate-200">{triageResult.recommendedDepartment}</strong>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Supportive Self-Care Guidelines
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {triageResult.adviceNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-tealAccent-500 flex-shrink-0 mt-0.5" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            {triageResult.isEmergency ? (
              <button
                onClick={() => setIsEmergencyModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" /> Trigger Campus Ambulance & Emergency Hotline
              </button>
            ) : (
              <Link
                to="/appointments/book"
                className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Book Appointment with {triageResult.recommendedDepartment}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
