import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { HeartPulse, Mail, Lock, LogIn, GraduationCap, Stethoscope, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromPath = (location.state as any)?.from?.pathname;

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your institution email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithEmail(email.trim(), password, selectedRole);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
      } else {
        if (fromPath) {
          navigate(fromPath, { replace: true });
        } else {
          const userRole = res.user?.role || selectedRole;
          if (userRole === 'doctor') navigate('/doctor/dashboard', { replace: true });
          else if (userRole === 'admin') navigate('/admin/dashboard', { replace: true });
          else if (userRole === 'faculty') navigate('/faculty/dashboard', { replace: true });
          else navigate('/student/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Unable to complete sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillCredentials = (fillEmail: string, role: UserRole) => {
    setEmail(fillEmail);
    setSelectedRole(role);
    setPassword('CampusCare@2026');
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-tealAccent-500 text-white flex items-center justify-center mx-auto shadow-md">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Sign In to CampusCare</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Malnad College of Engineering Telemedicine Portal
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-primary-50/80 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-900 space-y-2.5">
          <div className="text-xs font-bold text-primary-900 dark:text-primary-200 flex items-center justify-between">
            <span>⚡ Institutional Sample Accounts:</span>
            <span className="text-[10px] bg-primary-200 dark:bg-primary-900 text-primary-800 dark:text-primary-300 px-2 py-0.5 rounded font-mono">
              Supabase Auth
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFillCredentials('rahul.sharma@mcehassan.ac.in', 'student')}
              className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-sm transition-all text-left"
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> Student (Rahul)
            </button>
            <button
              type="button"
              onClick={() => handleFillCredentials('dr.kiran.gowda@mcehassan.ac.in', 'doctor')}
              className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-sm transition-all text-left"
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> Dr. Kiran (DOC001)
            </button>
            <button
              type="button"
              onClick={() => handleFillCredentials('dr.madan.sk@mcehassan.ac.in', 'doctor')}
              className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-sm transition-all text-left"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" /> Dr. Madan (DOC002)
            </button>
            <button
              type="button"
              onClick={() => handleFillCredentials('admin@mcehassan.ac.in', 'admin')}
              className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-500 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-sm transition-all text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> Campus Admin
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <form onSubmit={handleCustomLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Your Role
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['student', 'doctor', 'faculty', 'admin'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                      selectedRole === r
                        ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Institution Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@mcehassan.ac.in"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-bold hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

