import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [telehealthConsent, setTelehealthConsent] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Settings & Preferences</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage system theme, teleconsultation privacy, and reminder notifications
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Theme & Appearance</h3>
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div>
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Dark / Light Mode</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Current Theme: {theme.toUpperCase()}</div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-semibold text-xs flex items-center gap-1.5"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Notification Preferences</h3>
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
              <span>Appointment Confirmation Alerts</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer">
              <span>Medicine Reminders (Pill Schedule)</span>
              <input
                type="checkbox"
                checked={smsReminders}
                onChange={e => setSmsReminders(e.target.checked)}
                className="w-4 h-4 accent-primary-600 rounded"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Telehealth Privacy & Security</h3>
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 cursor-pointer text-xs">
            <div>
              <span className="font-semibold block text-slate-800 dark:text-slate-200">Electronic Health Record (EHR) Consent</span>
              <span className="text-[11px] text-slate-500">Allow campus doctors to access previous consultation notes and lab reports.</span>
            </div>
            <input
              type="checkbox"
              checked={telehealthConsent}
              onChange={e => setTelehealthConsent(e.target.checked)}
              className="w-4 h-4 accent-primary-600 rounded"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
