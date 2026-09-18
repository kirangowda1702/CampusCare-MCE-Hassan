import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  type?: 'card' | 'row' | 'profile';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, type = 'card' }) => {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800"
        >
          {type === 'card' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          )}
          {type === 'row' && (
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
