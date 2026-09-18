import React from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h1 className="text-6xl font-extrabold text-slate-900 dark:text-white">404</h1>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Page Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested healthcare page or medical record route does not exist or has been moved.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow"
          >
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};
