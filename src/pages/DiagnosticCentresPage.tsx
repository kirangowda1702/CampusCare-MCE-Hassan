import React, { useState, useEffect } from 'react';
import { DiagnosticCentre } from '../types';
import { healthcareDirectoryService } from '../services/healthcareDirectoryService';
import { HealthcareMap } from '../components/maps/HealthcareMap';
import {
  Activity,
  Phone,
  MapPin,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  FlaskConical,
  Home
} from 'lucide-react';

export const DiagnosticCentresPage: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticCentre[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [homeSampleOnly, setHomeSampleOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const fetchDiagnostics = async () => {
    const data = await healthcareDirectoryService.getDiagnosticCentres();
    setDiagnostics(data);
  };

  useEffect(() => {
    fetchDiagnostics();
    const unsubscribe = healthcareDirectoryService.subscribeToDirectory(() => {
      fetchDiagnostics();
    });
    return () => unsubscribe();
  }, []);

  const filteredDiagnostics = diagnostics.filter(dc => {
    const matchesSearch =
      dc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dc.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dc.services && dc.services.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesSample = !homeSampleOnly || dc.homeSampleCollection;
    const matchesVerified = !verifiedOnly || dc.verified;

    return matchesSearch && matchesSample && matchesVerified;
  });

  const handleOpenDirections = (dc: DiagnosticCentre) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dc.lat},${dc.lng}&destination_place_id=${encodeURIComponent(dc.name)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-primary-600" />
          Hassan Diagnostic & Pathology Centres Directory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Verified clinical laboratories, blood testing facilities, and imaging scan centres in Hassan, Karnataka
        </p>
      </div>

      {/* Interactive Map */}
      <HealthcareMap
        filterType="diagnostics"
        initialSelectedId={selectedId}
        onSelectFacility={fac => setSelectedId(fac.id)}
      />

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search diagnostic centres by name, scan type, or blood test..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs font-semibold">
          <button
            onClick={() => setHomeSampleOnly(!homeSampleOnly)}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              homeSampleOnly
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> Home Sample Collection
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

      {/* Cards Grid */}
      {filteredDiagnostics.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-xs text-slate-500">
          No diagnostic centres match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDiagnostics.map(dc => (
            <div
              key={dc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-purple-500/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded">
                    Diagnostic Lab
                  </span>

                  {dc.verified ? (
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
                  {dc.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                  {dc.address}
                </p>

                {dc.openHours && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dc.openHours}</span>
                  </div>
                )}

                {(dc.services || dc.facilities) && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(dc.services || dc.facilities || []).slice(0, 3).map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] border border-purple-100 dark:border-purple-900/60"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {dc.sourceUrl && (
                  <div className="mb-3">
                    <a
                      href={dc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Official Source ({dc.dataSource || 'Directory'})
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                {dc.phone && (
                  <a
                    href={`tel:${dc.phone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Lab
                  </a>
                )}
                <button
                  onClick={() => handleOpenDirections(dc)}
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