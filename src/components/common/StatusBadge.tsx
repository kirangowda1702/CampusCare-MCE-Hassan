import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase().replace('_', ' ');

  let bgClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (['confirmed', 'completed', 'taken', 'resolved', 'active'].includes(normalized)) {
    bgClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (['pending', 'in progress', 'upcoming', 'dispatched', 'rescheduled'].includes(normalized)) {
    bgClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  } else if (['cancelled', 'rejected', 'missed', 'emergency', 'high'].includes(normalized)) {
    bgClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  } else if (['video', 'low', 'moderate'].includes(normalized)) {
    bgClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border capitalize tracking-wide font-medium ${padding} ${bgClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 animate-pulse" />
      {normalized}
    </span>
  );
};
