import React from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, ShieldAlert, Phone, MapPin, Mail, ShieldCheck, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-14 pb-8">
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
                <span className="block text-[11px] text-slate-400 font-medium">
                  Malnad College of Engineering, Hassan
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An advanced digital healthcare command center engineered for Malnad College of Engineering (MCE), Hassan. Connecting students, faculty, and campus doctors with clinical guidance, verified practitioner appointments, e-records, and emergency first aid.
            </p>

            <div className="p-4 rounded-2xl bg-slate-800/90 border border-rose-500/30 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <ShieldAlert className="w-4 h-4 animate-pulse" /> MCE First Aid Support
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  Campus Dispatch
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="text-slate-300 font-mono font-bold text-sm">
                  9110885805
                </div>
                <a
                  href="tel:9110885805"
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" /> Call First Aid
                </a>
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Platform</h4>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li><Link to="/symptom-checker" className="hover:text-primary-400 transition-colors">AI Health</Link></li>
              <li><Link to="/doctors" className="hover:text-primary-400 transition-colors">Doctors</Link></li>
              <li><Link to="/appointments" className="hover:text-primary-400 transition-colors">Appointments</Link></li>
              <li><Link to="/consultation/apt-101" className="hover:text-primary-400 transition-colors">Video Consultation</Link></li>
              <li><Link to="/medical-records" className="hover:text-primary-400 transition-colors">Medical Records</Link></li>
            </ul>
          </div>

          {/* Healthcare Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Healthcare</h4>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li><Link to="/hospitals" className="hover:text-primary-400 transition-colors">Hospitals</Link></li>
              <li><Link to="/pharmacies" className="hover:text-primary-400 transition-colors">Pharmacies</Link></li>
              <li><Link to="/emergency" className="hover:text-rose-400 transition-colors flex items-center gap-1">Emergency <ShieldAlert className="w-3 h-3 text-rose-500" /></Link></li>
              <li><Link to="/services" className="hover:text-primary-400 transition-colors">Clinical Services</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Contact</h4>
            <div className="space-y-2.5 text-slate-400">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                <div className="font-bold text-white">MCE First Aid</div>
                <a href="tel:9110885805" className="text-rose-400 font-bold font-mono text-sm hover:underline block">
                  9110885805
                </a>
              </div>
              <p className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                MCE Health Centre, Salagame Road, Hassan - 573202
              </p>
              <p className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Mail className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                campuscare-project@mcehassan.ac.in
              </p>
            </div>
          </div>
        </div>

        {/* Medical Safety Disclaimer & Copyright */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p className="text-center md:text-left max-w-2xl leading-relaxed">
            <span className="font-bold text-slate-400">Academic Project Disclaimer: </span>
            CampusCare is an engineering academic capstone prototype developed for Malnad College of Engineering (MCE Hassan). AI guidance is educational and does not replace medical diagnosis. For campus emergencies, contact MCE First Aid at <span className="text-rose-400 font-bold">9110885805</span>.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>© 2026 MCE Hassan</span>
            <Link to="/settings" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
