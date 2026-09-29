import React from 'react';
import { SymptomTriage } from '../features/symptoms/SymptomTriage';

export const SymptomCheckerPage: React.FC = () => {
  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-slate-50/60 dark:bg-slate-950/60">
      <SymptomTriage isCompact={false} />
    </div>
  );
};
