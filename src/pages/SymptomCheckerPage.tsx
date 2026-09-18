import React from 'react';
import { SymptomTriage } from '../features/symptoms/SymptomTriage';
import { Sparkles } from 'lucide-react';

export const SymptomCheckerPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-tealAccent-500" />
          AI-Assisted Symptom Guidance & Triage
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Interactive educational evaluation module for MCE Hassan students and faculty
        </p>
      </div>

      <SymptomTriage />
    </div>
  );
};
