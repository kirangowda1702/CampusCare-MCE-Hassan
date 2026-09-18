import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Video,
  FileText,
  Pill,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Building2,
  Users,
  Settings,
  Bell,
  Clock,
  History,
  Activity,
  HeartPulse,
  LogOut,
  FolderLock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  // Role-specific navigation menus
  const getNavSections = (userRole: UserRole | null) => {
    switch (userRole) {
      case 'doctor':
        return [
          {
            title: 'Clinical Console',
            items: [
              { name: 'Doctor Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
              { name: 'Appointment Queue', path: '/appointments', icon: Calendar },
              { name: 'Active Consultations', path: '/consultation/apt-101', icon: Video },
              { name: 'Prescription Desk', path: '/prescriptions', icon: Pill },
              { name: 'Patient Records', path: '/medical-records', icon: FolderLock },
            ]
          },
          {
            title: 'Campus Practice',
            items: [
              { name: 'Emergency Alerts', path: '/emergency', icon: ShieldAlert },
              { name: 'Campus Facilities', path: '/hospitals', icon: Building2 },
              { name: 'Notifications', path: '/notifications', icon: Bell },
              { name: 'Settings & Availability', path: '/settings', icon: Settings },
            ]
          }
        ];

      case 'admin':
        return [
          {
            title: 'Health Administration',
            items: [
              { name: 'Admin Overview', path: '/admin/dashboard', icon: LayoutDashboard },
              { name: 'All Appointments', path: '/appointments', icon: Calendar },
              { name: 'Doctor Management', path: '/doctors', icon: Stethoscope },
              { name: 'Campus Health Centers', path: '/hospitals', icon: Building2 },
              { name: 'Emergency Command', path: '/emergency', icon: ShieldAlert },
            ]
          },
          {
            title: 'Institutional Control',
            items: [
              { name: 'Services Directory', path: '/services', icon: Activity },
              { name: 'System Notifications', path: '/notifications', icon: Bell },
              { name: 'Security & Access', path: '/settings', icon: Settings },
            ]
          }
        ];

      case 'faculty':
      case 'staff':
        return [
          {
            title: 'Staff Health Hub',
            items: [
              { name: 'Faculty Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
              { name: 'Book Consultation', path: '/appointments/book', icon: Calendar },
              { name: 'My Appointments', path: '/appointments', icon: Clock },
              { name: 'AI Health Guide', path: '/symptom-checker', icon: Sparkles },
            ]
          },
          {
            title: 'Health Management',
            items: [
              { name: 'Prescriptions', path: '/prescriptions', icon: Pill },
              { name: 'Medical E-Vault', path: '/medical-records', icon: FolderLock },
              { name: 'Medicine Reminders', path: '/medications', icon: History },
              { name: 'Campus Emergency', path: '/emergency', icon: ShieldAlert },
            ]
          }
        ];

      case 'student':
      default:
        return [
          {
            title: 'Student Health Portal',
            items: [
              { name: 'My Health Hub', path: '/student/dashboard', icon: LayoutDashboard },
              { name: 'Book Appointment', path: '/appointments/book', icon: Calendar },
              { name: 'My Appointments', path: '/appointments', icon: Clock },
              { name: 'AI Symptom Guide', path: '/symptom-checker', icon: Sparkles },
            ]
          },
          {
            title: 'Records & Medications',
            items: [
              { name: 'Digital Prescriptions', path: '/prescriptions', icon: Pill },
              { name: 'Medicine Reminders', path: '/medications', icon: Activity },
              { name: 'Medical Records', path: '/medical-records', icon: FolderLock },
              { name: 'Emergency & SOS', path: '/emergency', icon: ShieldAlert },
            ]
          },
          {
            title: 'Campus & Nearby',
            items: [
              { name: 'Doctor Directory', path: '/doctors', icon: Stethoscope },
              { name: 'Hospitals & Pharmacies', path: '/hospitals', icon: Building2 },
              { name: 'Healthcare Services', path: '/services', icon: HeartPulse },
            ]
          }
        ];
    }
  };

  const sections = getNavSections(role);

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] sticky top-16 sm:top-20 z-30 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* User Summary Widget */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'}
            alt="Profile"
            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user?.fullName || 'Rahul Sharma'}
            </h4>
            <p className="text-[11px] text-primary-600 dark:text-primary-400 capitalize font-medium">
              {role || 'Student'} • {user?.usn || user?.employeeId || 'MCE Member'}
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            <h5 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {section.title}
            </h5>
            <div className="space-y-1">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <NavLink
          to="/profile"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Settings className="w-4 h-4" />
          <span>Profile & Privacy</span>
        </NavLink>
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
