import React from 'react';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { GraduationCap, Stethoscope, ShieldCheck, BookOpen, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DemoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoLoginModal: React.FC<DemoLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginAsRole } = useAuth();
  const navigate = useNavigate();

  const handleSelectRole = (role: UserRole) => {
    onClose();
    navigate('/login', { state: { preferredRole: role } });
  };

  const roles = [
    {
      role: 'student' as UserRole,
      title: 'Student Account',
      name: 'Rahul Sharma (4MC21CS089)',
      desc: 'Book appointments, use AI symptom checker, manage prescriptions, and track medicine reminders.',
      icon: GraduationCap,
      color: 'bg-blue-500'
    },
    {
      role: 'doctor' as UserRole,
      title: 'Doctor Account',
      name: 'Dr. Kiran Gowda (DOC001 - General Medicine)',
      desc: 'Review patient appointments, start video consultations, write clinical notes, and generate prescriptions.',
      icon: Stethoscope,
      color: 'bg-emerald-500'
    },
    {
      role: 'faculty' as UserRole,
      title: 'Faculty / Staff Account',
      name: 'Prof. Suresh Kumar H.N. (CSE)',
      desc: 'Access college staff health center, consult specialists, and maintain digital medical records.',
      icon: BookOpen,
      color: 'bg-purple-500'
    },
    {
      role: 'admin' as UserRole,
      title: 'Campus Health Admin',
      name: 'Dr. B.S. Anand (Chief Director)',
      desc: 'Campus health metrics, doctor onboarding, appointment analytics, and emergency command center.',
      icon: ShieldCheck,
      color: 'bg-amber-500'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select 1-Click Demo Account" maxWidth="2xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          For fast demonstration and grading, select any role to instantly log in with pre-populated medical data:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {roles.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.role}
                onClick={() => handleSelectRole(item.role)}
                className="text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 bg-white dark:bg-slate-900 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className={`w-10 h-10 rounded-xl ${item.color} text-white flex items-center justify-center flex-shrink-0 shadow`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400">
                  <span>Log in as {item.role}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
