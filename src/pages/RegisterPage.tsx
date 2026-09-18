import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, UserPlus, GraduationCap, Stethoscope, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [usn, setUsn] = useState('');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState(5);
  const [empId, setEmpId] = useState('');
  const [license, setLicense] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerUser({
      fullName,
      email,
      phone,
      role,
      usn: role === 'student' ? usn : undefined,
      branch: role === 'student' ? branch : undefined,
      semester: role === 'student' ? semester : undefined,
      employeeId: role === 'faculty' ? empId : undefined,
      licenseNumber: role === 'doctor' ? license : undefined,
      specialization: role === 'doctor' ? specialization : undefined
    });
    alert('Account created successfully! Redirecting to your dashboard.');
    if (role === 'doctor') navigate('/doctor/dashboard');
    else if (role === 'faculty') navigate('/faculty/dashboard');
    else navigate('/student/dashboard');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-tealAccent-500 text-white flex items-center justify-center mx-auto shadow-md">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Join CampusCare MCE Hassan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Register your institution account for digital healthcare access
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Your Role:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'student', label: 'Student', icon: GraduationCap },
                { id: 'faculty', label: 'Faculty/Staff', icon: BookOpen },
                { id: 'doctor', label: 'Doctor', icon: Stethoscope }
              ].map(item => {
                const Icon = item.icon;
                const isSel = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id as UserRole)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                      isSel
                        ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Institution Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@mcehassan.ac.in"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>

              {role === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    University USN *
                  </label>
                  <input
                    type="text"
                    required
                    value={usn}
                    onChange={e => setUsn(e.target.value)}
                    placeholder="4MC22CS089"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium font-mono"
                  />
                </div>
              )}

              {role === 'faculty' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={empId}
                    onChange={e => setEmpId(e.target.value)}
                    placeholder="MCE-FAC-045"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                </div>
              )}

              {role === 'doctor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Medical License No. (KMC) *
                  </label>
                  <input
                    type="text"
                    required
                    value={license}
                    onChange={e => setLicense(e.target.value)}
                    placeholder="KMC/2015/88912"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              <UserPlus className="w-4 h-4" /> Create CampusCare Account
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
