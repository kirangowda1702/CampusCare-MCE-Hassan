import React from 'react';
import { ShieldAlert, Phone, Ambulance, MapPin, ExternalLink } from 'lucide-react';

interface EmergencyCardProps {
  title: string;
  phone: string;
  description: string;
  category: string;
  isPrimary?: boolean;
}

export const EmergencyCard: React.FC<EmergencyCardProps> = ({
  title,
  phone,
  description,
  category,
  isPrimary = false
}) => {
  return (
    <div
      className={`rounded-2xl p-5 transition-all border ${
        isPrimary
          ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg border-rose-400'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isPrimary ? 'bg-white/20 text-white' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
            }`}
          >
            <Ambulance className="w-5 h-5" />
          </div>
          <div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isPrimary ? 'bg-white/20 text-white' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
              }`}
            >
              {category}
            </span>
            <h4
              className={`font-bold text-base mt-1 ${
                isPrimary ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              {title}
            </h4>
          </div>
        </div>
      </div>

      <p
        className={`text-xs mb-4 ${
          isPrimary ? 'text-rose-100' : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        {description}
      </p>

      <div className="pt-2">
        <a
          href={`tel:${phone.replace(/\s+/g, '')}`}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold shadow transition-all ${
            isPrimary
              ? 'bg-white text-rose-700 hover:bg-rose-50'
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}
        >
          <Phone className="w-4 h-4" /> Call Now ({phone})
        </a>
      </div>
    </div>
  );
};
