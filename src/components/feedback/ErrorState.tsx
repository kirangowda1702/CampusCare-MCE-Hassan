import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this healthcare service.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-1">{title}</h3>
      <p className="text-sm text-rose-700 dark:text-rose-300 max-w-md mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      )}
    </div>
  );
};
