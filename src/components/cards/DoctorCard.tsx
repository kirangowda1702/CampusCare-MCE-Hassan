import React, { useState } from 'react';
import { Clock, MapPin, Building2, ShieldCheck, ExternalLink, ArrowRight, Video, Calendar, Eye } from 'lucide-react';
import { Doctor } from '../../types';
import { Link } from 'react-router-dom';

interface DoctorCardProps {
  doctor: Doctor;
  onBook?: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBook }) => {
  const [imgError, setImgError] = useState(false);

  const initials = doctor.initials || doctor.name.split(' ').filter(w => !w.includes('.')).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'DR';

  const isDirectoryOnly = doctor.provider_status === 'directory_only';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header with Portrait / Initials Avatar */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            {doctor.image_url && !imgError ? (
              <img
                src={doctor.image_url}
                alt={`Official portrait of ${doctor.name}`}
                onError={() => setImgError(true)}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-800"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-tealAccent-500 text-white flex items-center justify-center font-extrabold text-lg shadow-inner border border-slate-200 dark:border-slate-700">
                {initials}
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-teal-500 text-white border-2 border-white dark:border-slate-900"
              title="Verified Public Profile"
            >
              <ShieldCheck className="w-3 h-3" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-base truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {doctor.name}
              </h3>
            </div>
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
              {doctor.specialization}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {doctor.qualification || 'Not publicly listed'}
            </p>
          </div>
        </div>

        {/* Verified Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3" /> Verified Public Profile
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-medium">
            {doctor.provider_status === 'directory_only' ? 'Directory Listing' : doctor.provider_status}
          </span>
        </div>

        {/* Hospital & Location Details */}
        <div className="space-y-1.5 py-2.5 border-y border-slate-100 dark:border-slate-800 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate font-semibold">{doctor.hospital_name || 'Karna Hospital, Hassan'}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{doctor.city || 'Hassan'}, {doctor.state || 'Karnataka'}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span className="truncate text-[11px]">{doctor.availability_time || doctor.availableDays.join(', ')}</span>
          </div>
        </div>

        {/* Source Attribution Link */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
          <span>Source: Official Hospital Profile</span>
          {doctor.source_url && (
            <a
              href={doctor.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              Verify <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2">
        {isDirectoryOnly ? (
          <Link
            to={`/doctors/${doctor.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-primary-500" /> View Profile & Details
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to={`/appointments/book?doctor=${doctor.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow transition-all"
            >
              <Calendar className="w-3.5 h-3.5" /> Book Consultation
            </Link>

            {doctor.video_consultation_enabled && (
              <Link
                to={`/appointments/book?doctor=${doctor.id}&mode=video`}
                className="p-2.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/40 text-primary-600 hover:bg-primary-100 transition-colors"
                title="Online Video Consultation Available"
              >
                <Video className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
