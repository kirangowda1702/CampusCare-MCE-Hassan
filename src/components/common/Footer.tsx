import React from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, ShieldAlert, Phone, MapPin, Mail, ExternalLink, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-800">
          {/* Institution Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-tealAccent-500 text-white flex items-center justify-center shadow-md">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-white text-lg tracking-tight">
                  Campus<span className="text-primary-400">Care</span>
                </span>
                <span className="block text-[11px] text-slate-400">
                  MCE Hassan Telemedicine & Health Network
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An advanced digital healthcare platform engineered for Malnad College of Engineering (MCE), Hassan. Connecting students, faculty, and campus doctors with instant medical consultations, e-records, and emergency triage.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldAlert className="w-4 h-4" /> Campus Emergency Response (Prototype Alert)
              </div>
              <div className="text-slate-300 font-mono font-semibold">Campus First Aid Desk • Dial 112 / 108 for Critical Care</div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Healthcare Services</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/services" className="hover:text-white transition-colors">General Medicine</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Student Counseling</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Dermatology Care</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Sports Orthopedics</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Dental & Eye Care</Link></li>
            </ul>
          </div>

          {/* Clinical Features */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Platform Portals</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/symptom-checker" className="hover:text-white transition-colors">AI Symptom Guide</Link></li>
              <li><Link to="/appointments/book" className="hover:text-white transition-colors">Book Consultation</Link></li>
              <li><Link to="/medical-records" className="hover:text-white transition-colors">Medical E-Vault</Link></li>
              <li><Link to="/medications" className="hover:text-white transition-colors">Medicine Reminders</Link></li>
              <li><Link to="/hospitals" className="hover:text-white transition-colors">Hassan Hospital Map</Link></li>
            </ul>
          </div>

          {/* Campus Location */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Campus Center</h4>
            <div className="space-y-2 text-slate-400">
              <p className="flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                MCE Health Centre, Salagame Road, Hassan, Karnataka - 573202
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                campuscare-project@mcehassan.ac.in
              </p>
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-tealAccent-400 flex-shrink-0" />
                Hassan Healthcare Reference Grid
              </p>
            </div>
          </div>
        </div>

        {/* Medical Safety Disclaimer & Copyright */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p className="text-center md:text-left max-w-2xl">
            <span className="font-bold text-slate-400">Academic Project Disclaimer: </span>
            CampusCare is an engineering academic capstone prototype developed for Malnad College of Engineering (MCE Hassan). It is not an officially deployed municipal healthcare service. For life-threatening emergencies, dial national emergency <span className="text-rose-400 font-bold">112 / 108</span> or visit accredited hospital trauma centers immediately.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>© 2026 MCE Hassan (Academic Prototype)</span>
            <Link to="/settings" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
