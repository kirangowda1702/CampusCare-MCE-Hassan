import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await authService.resetPasswordForEmail(email);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setIsSubmitted(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-tealAccent-500 text-white flex items-center justify-center mx-auto shadow-md">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Reset Password</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your MCE institutional email to receive recovery instructions
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {isSubmitted ? (
            <div className="text-center space-y-3 p-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Password Reset Link Sent</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We sent a secure password reset link to <strong className="text-slate-700 dark:text-slate-300">{email}</strong>.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  MCE Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@mcehassan.ac.in"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
              >
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
