import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  HeartPulse,
  Sun,
  Moon,
  Bell,
  User,
  ShieldAlert,
  Menu,
  X,
  ChevronDown,
  Stethoscope,
  LogOut,
  Calendar,
  Sparkles,
  Layers,
  MapPin,
  Pill,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useEmergency } from '../../context/EmergencyContext';
import { mockNotifications } from '../../data/notifications';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { user, role, logout, loginAsRole, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setIsEmergencyModalOpen } = useEmergency();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const unreadCount = mockNotifications.filter(n => !n.isRead).length;

  const getDashboardPath = () => {
    if (!role) return '/login';
    switch (role) {
      case 'student': return '/student/dashboard';
      case 'doctor': return '/doctor/dashboard';
      case 'faculty': return '/faculty/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/student/dashboard';
    }
  };

  const navLinks = [
    { name: 'Services', path: '/services', icon: Layers },
    { name: 'Doctors', path: '/doctors', icon: Stethoscope },
    { name: 'AI Health Guidance', path: '/symptom-checker', icon: Sparkles },
    { name: 'Book Appointment', path: '/appointments/book', icon: Calendar },
    { name: 'Hospitals & Pharmacies', path: '/hospitals', icon: MapPin },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & MCE Hassan Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-tealAccent-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
                    Campus<span className="text-primary-600 dark:text-primary-400">Care</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                    MCE
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:inline-block">
                  Malnad College of Engineering, Hassan
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Emergency SOS CTA */}
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 animate-pulse hover:animate-none transition-all"
              title="Campus Emergency Response"
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden xs:inline">Campus Emergency</span>
            </button>

            {/* Dark / Light Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-scale-in">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                    <Link
                      to="/notifications"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {mockNotifications.slice(0, 4).map(n => (
                      <Link
                        key={n.id}
                        to={n.link || '/notifications'}
                        onClick={() => setIsNotifOpen(false)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 block transition-colors text-xs"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                          {n.message}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 1-Click Role Switcher & Demo Accounts Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all border border-slate-200/60 dark:border-slate-700"
              >
                <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] uppercase font-bold">
                  {role ? role.charAt(0) : 'G'}
                </div>
                <span className="capitalize hidden md:inline">{role ? role : 'Guest'}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Active Profile:</p>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold truncate">
                      {user ? user.fullName : 'Guest'}
                    </p>
                    <p className="text-[11px] text-slate-400 capitalize">{role || 'Not Logged In'}</p>
                  </div>

                  <div className="py-1">
                    <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Switch Role (1-Click Demo)
                    </p>
                    {(['student', 'doctor', 'faculty', 'admin'] as UserRole[]).map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          loginAsRole(r);
                          setIsRoleMenuOpen(false);
                          if (r === 'doctor') navigate('/doctor/dashboard');
                          else if (r === 'admin') navigate('/admin/dashboard');
                          else if (r === 'faculty') navigate('/faculty/dashboard');
                          else navigate('/student/dashboard');
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold capitalize flex items-center justify-between ${
                          role === r
                            ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{r} View</span>
                        {role === r && <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    {isAuthenticated ? (
                      <>
                        <Link
                          to={getDashboardPath()}
                          onClick={() => setIsRoleMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <User className="w-3.5 h-3.5" /> Open My Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setIsRoleMenuOpen(false);
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setIsRoleMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                      >
                        <User className="w-3.5 h-3.5" /> Sign In / Register
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Mobile Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-2">
          {navLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon className="w-4 h-4 text-primary-500" />
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              to={getDashboardPath()}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm shadow"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
