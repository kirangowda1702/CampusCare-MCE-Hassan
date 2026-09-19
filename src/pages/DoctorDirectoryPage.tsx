import React, { useState, useEffect } from 'react';
import { Doctor, ProviderStatus } from '../types';
import { doctorService } from '../services/doctorService';
import { mockDoctors } from '../data/doctors';
import { DoctorCard } from '../components/cards/DoctorCard';
import { Stethoscope, Search, Info, Filter, Building2, Video, CheckCircle2, ShieldCheck } from 'lucide-react';

export const DoctorDirectoryPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [videoFilter, setVideoFilter] = useState<string>('all');

  useEffect(() => {
    doctorService.getDoctors().then(docs => {
      setDoctors(docs);
      setIsLoading(false);
    });
  }, []);

  const doctorList = doctors.length > 0 ? doctors : mockDoctors;

  const specialties = [
    'all',
    ...Array.from(new Set(doctorList.map(d => d.specialization).filter(Boolean)))
  ];

  const hospitals = [
    'all',
    ...Array.from(new Set(doctorList.map(d => d.hospital_name).filter(Boolean)))
  ];

  const filteredDoctors = doctorList.filter(doc => {
    // 1. Specialty Filter
    if (specialtyFilter !== 'all' && !doc.specialization.toLowerCase().includes(specialtyFilter.toLowerCase())) {
      return false;
    }

    // 2. Hospital Filter
    if (hospitalFilter !== 'all' && !(doc.hospital_name || '').toLowerCase().includes(hospitalFilter.toLowerCase())) {
      return false;
    }

    // 3. Provider Status Filter
    if (statusFilter !== 'all' && doc.provider_status !== statusFilter) {
      return false;
    }

    // 4. Video Consultation Filter
    if (videoFilter === 'video_enabled' && !doc.video_consultation_enabled) {
      return false;
    }
    if (videoFilter === 'in_person_only' && doc.video_consultation_enabled) {
      return false;
    }

    // 5. Search Bar (Name, Specialization, Hospital, Availability)
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = (doc.doctor_name || doc.name || '').toLowerCase().includes(q);
      const matchSpec = (doc.specialization || '').toLowerCase().includes(q);
      const matchHosp = (doc.hospital_name || '').toLowerCase().includes(q);
      const matchAvail = (doc.availability_time || doc.availableDays.join(' ') || '').toLowerCase().includes(q);

      if (!matchName && !matchSpec && !matchHosp && !matchAvail) return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-[11px] font-bold">
              Hassan, Karnataka Registry
            </span>
            <span className="text-xs text-slate-400">{doctorList.length} Verified Public Profiles</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Stethoscope className="w-6 h-6 text-primary-600" />
            Hassan Verified Doctor Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Publicly listed healthcare specialists from licensed medical institutions in Hassan
          </p>
        </div>
      </div>

      {/* Directory Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Directory Disclaimer:</strong> Doctor information is sourced from publicly available official healthcare-provider profiles. Inclusion in this directory does not imply affiliation with Malnad College of Engineering or CampusCare unless separately verified.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by doctor name (e.g. Arjun), specialization, hospital (e.g. Karna Hospital), or timing..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Specialization
            </label>
            <select
              value={specialtyFilter}
              onChange={e => setSpecialtyFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="all">All Specialties</option>
              <option value="Surgeon">General & Laparoscopic Surgery</option>
              <option value="Obstetrician">Obstetrics & Gynecology</option>
              <option value="Diabetologist">Internal Medicine & Diabetes</option>
              <option value="Orthopedic">Orthopedic Surgery</option>
              <option value="Pediatrician">Pediatrics & Neonatology</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Hospital
            </label>
            <select
              value={hospitalFilter}
              onChange={e => setHospitalFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="all">All Hospitals (Hassan)</option>
              <option value="Karna Hospital">Karna Hospital, Hassan</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Provider Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="directory_only">Directory Only (Public Profile)</option>
              <option value="onboarded">Onboarded Providers</option>
              <option value="active">Active CampusCare Doctors</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Consultation Mode
            </label>
            <select
              value={videoFilter}
              onChange={e => setVideoFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="all">All Modes</option>
              <option value="in_person_only">In-Person Consultation Only</option>
              <option value="video_enabled">Video Consultation Enabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading verified Hassan doctor directory...</div>
      ) : filteredDoctors.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No matching Hassan doctor profiles found.</p>
          <p className="text-xs text-slate-400">Try adjusting your search terms or filter selections.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSpecialtyFilter('all');
              setHospitalFilter('all');
              setStatusFilter('all');
              setVideoFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map(doctor => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </div>
  );
};
