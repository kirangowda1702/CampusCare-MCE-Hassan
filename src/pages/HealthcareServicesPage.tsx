import React from 'react';
import { Link } from 'react-router-dom';
import { mockServices } from '../data/services';
import { HeartPulse, ArrowRight, CheckCircle2, Stethoscope, Sparkles } from 'lucide-react';

export const HealthcareServicesPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <HeartPulse className="w-6 h-6 text-primary-600" />
          Campus Healthcare Specialties & Services
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Explore clinical healthcare specialties configured on the CampusCare telemedicine platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockServices.map(service => (
          <div
            key={service.id}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2.5 py-0.5 rounded-full">
                  {service.category}
                </span>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400">Telehealth Service</span>
              </div>

              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{service.name}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                {service.description}
              </p>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Common Symptoms Treated:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {service.commonSymptoms.map((sym, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{service.availableDoctorsCount} Doctors Available</span>
              <Link
                to={`/appointments/book?service=${service.id}`}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow flex items-center gap-1"
              >
                Book Slot <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
