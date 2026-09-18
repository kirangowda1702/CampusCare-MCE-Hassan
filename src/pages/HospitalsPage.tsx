import React, { useState, useEffect } from 'react';
import { Hospital } from '../types';
import { healthcareDirectoryService } from '../services/healthcareDirectoryService';
import { HealthcareMap } from '../components/maps/HealthcareMap';
import {
  Building2,
  Phone,
  MapPin,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  Ambulance
} from 'lucide-react';

export const HospitalsPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHospitals = async () => {
    setIsLoading(true);
    const data = await healthcareDirectoryService.getHospitals();
    setHospitals(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHospitals();
    const unsubscribe = healthcareDirectoryService.subscribeToDirectory(() => {
      fetchHospitals();
    });
    return () => unsubscribe();
  }, []);

  const filteredHospitals = hospitals.filter(hosp => {
    const matchesSearch =
      hosp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hosp.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hosp.services && hosp.services.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'campus' && hosp.isCampusFacility) ||
      (selectedCategory === 'government' && hosp.category.toLowerCase().includes('government')) ||
      (selectedCategory === 'private' && hosp.category.toLowerCase().includes('private'));

    const matchesEmergency = !emergencyOnly || hosp.emergencyAvailable;
    const matchesVerified = !verifiedOnly || hosp.verified;

    return matchesSearch && matchesCategory && matchesEmergency && matchesVerified;
  });

  const handleOpenDirections = (hosp: Hospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hosp.lat},${hosp.lng}&destination_place_id=${encodeURIComponent(hosp.name)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-primary-600" />
          Hassan Healthcare Facilities & Hospitals Directory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Verified directory and GPS navigation for MCE campus health centre and major hospitals in Hassan, Karnataka
        </p>
      </div>

      {/* Interactive Map */}
      <HealthcareMap
        filterType="hospitals"
        initialSelectedId={selectedHospitalId}
        onSelectFacility={fac => setSelectedHospitalId(fac.id)}
      />

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search hospitals by name, specialty, or area..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs font-semibold">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Sectors</option>
            <option value="campus">Campus Health Center</option>
            <option value="government">Government Hospitals</option>
            <option value="private">Private Multispeciality</option>
          </select>

          <button
            onClick={() => setEmergencyOnly(!emergencyOnly)}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              emergencyOnly
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Ambulance className="w-3.5 h-3.5" /> 24x7 Emergency
          </button>

          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              verifiedOnly
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Only
          </button>
        </div>
      </div>

      {/* Hospital Cards List */}
      {filteredHospitals.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-xs text-slate-500">
          No verified healthcare facilities match the active filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHospitals.map(hosp => (
            <div
              key={hosp.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-primary-500/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    hosp.isCampusFacility
                      ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800'
                      : 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 border-primary-200 dark:border-primary-800'
                  }`}>
                    {hosp.category}
                  </span>

                  {hosp.verified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Verification Pending
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1.5 leading-snug">
                  {hosp.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                  {hosp.address}
                </p>

                {hosp.openHours && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{hosp.openHours}</span>
                  </div>
                )}

                {(hosp.services || hosp.facilities) && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(hosp.services || hosp.facilities || []).slice(0, 3).map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {hosp.sourceUrl && (
                  <div className="mb-3">
                    <a
                      href={hosp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Source ({hosp.dataSource || 'Directory'})
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                {hosp.phone && (
                  <a
                    href={`tel:${hosp.phone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
                <button
                  onClick={() => handleOpenDirections(hosp)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5 text-primary-500" /> Directions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

