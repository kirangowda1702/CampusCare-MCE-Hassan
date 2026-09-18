import React, { useState, useEffect } from 'react';
import { Pharmacy } from '../types';
import { healthcareDirectoryService } from '../services/healthcareDirectoryService';
import { HealthcareMap } from '../components/maps/HealthcareMap';
import {
  Pill,
  Phone,
  MapPin,
  Truck,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Navigation,
  ShieldCheck
} from 'lucide-react';

export const PharmaciesPage: React.FC = () => {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [open24Only, setOpen24Only] = useState(false);
  const [homeDeliveryOnly, setHomeDeliveryOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | undefined>(undefined);

  const fetchPharmacies = async () => {
    const data = await healthcareDirectoryService.getPharmacies();
    setPharmacies(data);
  };

  useEffect(() => {
    fetchPharmacies();
    const unsubscribe = healthcareDirectoryService.subscribeToDirectory(() => {
      fetchPharmacies();
    });
    return () => unsubscribe();
  }, []);

  const filteredPharmacies = pharmacies.filter(pharm => {
    const matchesSearch =
      pharm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pharm.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matches24 = !open24Only || (pharm.openHours && pharm.openHours.toLowerCase().includes('24 hours'));
    const matchesDelivery = !homeDeliveryOnly || pharm.homeDelivery;
    const matchesVerified = !verifiedOnly || pharm.verified;

    return matchesSearch && matches24 && matchesDelivery && matchesVerified;
  });

  const handleOpenDirections = (pharm: Pharmacy) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pharm.lat},${pharm.lng}&destination_place_id=${encodeURIComponent(pharm.name)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Pill className="w-6 h-6 text-primary-600" />
          Campus Dispensary & Hassan Pharmacies Directory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Verified directory of retail pharmacies, generic drug stores (Janaushadhi), and campus dispensaries in Hassan
        </p>
      </div>

      {/* Interactive Map */}
      <HealthcareMap
        filterType="pharmacies"
        initialSelectedId={selectedPharmacyId}
        onSelectFacility={fac => setSelectedPharmacyId(fac.id)}
      />

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search pharmacies by name or street..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs font-semibold">
          <button
            onClick={() => setOpen24Only(!open24Only)}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              open24Only
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> 24 Hours Open
          </button>

          <button
            onClick={() => setHomeDeliveryOnly(!homeDeliveryOnly)}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              homeDeliveryOnly
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Delivery Available
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

      {/* Pharmacy Cards Grid */}
      {filteredPharmacies.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-xs text-slate-500">
          No pharmacies match your active search and filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredPharmacies.map(pharm => (
            <div
              key={pharm.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/50 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  {pharm.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Pending Verification
                    </span>
                  )}

                  {pharm.homeDelivery && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                      <Truck className="w-3 h-3" /> Delivery
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 leading-snug">
                  {pharm.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                  {pharm.address}
                </p>
                {pharm.openHours && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{pharm.openHours}</span>
                  </div>
                )}
                {pharm.sourceUrl && (
                  <div className="mb-2">
                    <a
                      href={pharm.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Source
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-1.5">
                {pharm.phone && (
                  <a
                    href={`tel:${pharm.phone}`}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold text-center block"
                  >
                    Call ({pharm.phone})
                  </a>
                )}
                <button
                  onClick={() => handleOpenDirections(pharm)}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center flex items-center justify-center gap-1 shadow-sm transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" /> Directions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

