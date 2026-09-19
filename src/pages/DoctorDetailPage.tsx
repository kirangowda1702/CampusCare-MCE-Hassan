import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  Video,
  Info,
  Phone,
  Lock
} from 'lucide-react';
import { Doctor } from '../types';
import { doctorService } from '../services/doctorService';

export const DoctorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (id) {
      doctorService.getDoctorById(id).then(doc => {
        if (doc) setDoctor(doc);
        setIsLoading(false);
      });
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-xs text-slate-400">
        Loading verified practitioner record...
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Doctor Profile Not Found</h2>
        <p className="text-xs text-slate-500">The requested healthcare provider directory record does not exist.</p>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
      </div>
    );
  }

  const initials = doctor.initials || doctor.name.split(' ').filter(w => !w.includes('.')).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'DR';

  const isDirectoryOnly = doctor.provider_status === 'directory_only';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Doctor Directory
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Official Profile Image / Fallback Avatar */}
          <div className="relative flex-shrink-0">
            {doctor.image_url && !imgError ? (
              <img
                src={doctor.image_url}
                alt={`Official portrait of ${doctor.name}`}
                onError={() => setImgError(true)}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-md bg-slate-100 dark:bg-slate-800"
              />
            ) : (
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-primary-600 to-tealAccent-500 text-white flex items-center justify-center text-3xl sm:text-4xl font-extrabold shadow-md border border-slate-200 dark:border-slate-700">
                {initials}
              </div>
            )}
            <span
              className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-teal-500 text-white border-2 border-white dark:border-slate-900 shadow"
              title="Verified Public Record"
            >
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {doctor.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                {doctor.verified_public_profile ? 'Verified Doctor Profile' : 'Provider Verification Pending'}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono font-semibold">
                {doctor.campuscare_enabled ? 'CampusCare Consultation Approved' : 'Directory-Only Reference'}
              </span>
              {doctor.video_consultation_enabled && doctor.consent_status === 'verified' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                  <Video className="w-3.5 h-3.5" /> Video Consultation Available
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">
                  In-Person Consultation
                </span>
              )}
            </div>

            <p className="text-sm sm:text-base font-semibold text-primary-600 dark:text-primary-400">
              {doctor.specialization}
            </p>

            {/* Grid of Key Professional Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Doctor ID:</span>
                <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">{doctor.doctorId || doctor.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Qualification:</span>
                <span>{doctor.qualification || 'Not publicly listed'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{doctor.hospital_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{doctor.address || `${doctor.city}, ${doctor.state}`}</span>
              </div>
              {doctor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{doctor.phone}</span>
                </div>
              )}
              {doctor.email && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Email:</span>
                  <span>{doctor.email}</span>
                </div>
              )}
              {doctor.experienceYears && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Experience:</span>
                  <span>{doctor.experienceYears} Years</span>
                </div>
              )}
              {doctor.consultationFee && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Consultation Fee:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">₹{doctor.consultationFee}</span>
                </div>
              )}
              {doctor.medicalRegistrationNumber && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Reg. Number:</span>
                  <span className="font-mono">{doctor.medicalRegistrationNumber} ({doctor.registrationAuthority || 'State Council'})</span>
                </div>
              )}
              {doctor.rating && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Patient Rating:</span>
                  <span className="font-bold text-amber-500">★ {doctor.rating}</span>
                  <span className="text-slate-400">({doctor.reviewsCount || doctor.reviews || 0} reviews)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Availability & Timings Grid */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-3">
          <div className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary-600" /> Published Consultation Timings
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {doctor.availability_time || 'Consult hospital desk for active OPD schedule'}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px]">
            <span>Mode: In-Person Consultation at {doctor.hospital_name}</span>
            <span>•</span>
            <span>Video Consultation: {doctor.video_consultation_enabled ? 'Available' : 'In-Person Only'}</span>
            {doctor.lastVerified && (
              <>
                <span>•</span>
                <span>Last Verified: <strong className="text-slate-700 dark:text-slate-300">{doctor.lastVerified}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Source Attribution Box */}
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 dark:text-blue-200">
              Source: {doctor.dataSource || doctor.data_source || 'Official Hospital Profile'}
            </span>
            {doctor.source_url && (
              <a
                href={doctor.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-bold hover:underline"
              >
                View Source Profile <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Professional information verified against official medical council registry and clinic listings.
          </p>
        </div>

        {/* Booking / Action Section */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          {isDirectoryOnly ? (
            <div className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  This doctor is currently listed as a <strong>Directory Record</strong>. CampusCare online appointments and video consultations will be activated upon formal provider onboarding.
                </span>
              </div>
              <a
                href="tel:+918172268888"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold whitespace-nowrap shadow hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> Call Hospital Desk
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Link
                to={`/appointments/book?doctor=${doctor.id}`}
                className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all"
              >
                <Calendar className="w-4 h-4" /> Book In-Person Consultation
              </Link>
              {doctor.video_consultation_enabled && (
                <Link
                  to={`/appointments/book?doctor=${doctor.id}&mode=video`}
                  className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all"
                >
                  <Video className="w-4 h-4" /> Book Video Consultation
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Directory Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Directory Disclaimer:</strong> Doctor information is sourced from publicly available official healthcare-provider profiles. Inclusion in this directory does not imply affiliation with Malnad College of Engineering or CampusCare unless separately verified.
        </p>
      </div>
    </div>
  );
};
