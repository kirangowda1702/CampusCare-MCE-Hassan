import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  ExternalLink,
  Shield,
  Building2,
  Pill,
  Activity,
  LocateFixed,
  Compass,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Hospital, Pharmacy, DiagnosticCentre } from '../../types';
import { healthcareDirectoryService } from '../../services/healthcareDirectoryService';

declare global {
  interface Window {
    google?: any;
    initGoogleMapCallback?: () => void;
  }
}

interface HealthcareMapProps {
  filterType?: 'all' | 'campus' | 'hospitals' | 'pharmacies' | 'diagnostics';
  onSelectFacility?: (facility: any) => void;
  initialSelectedId?: string;
  height?: string;
}

export const HealthcareMap: React.FC<HealthcareMapProps> = ({
  filterType = 'all',
  onSelectFacility,
  initialSelectedId,
  height = '480px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const [activeCategory, setActiveCategory] = useState<'all' | 'campus' | 'hospitals' | 'pharmacies' | 'diagnostics'>(filterType);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCentre[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Location not shared');
  const [locationDenied, setLocationDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);

  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY
    : '';

  const loadData = async (loc?: { lat: number; lng: number } | null) => {
    const [hList, pList, dList] = await Promise.all([
      healthcareDirectoryService.getHospitals(loc),
      healthcareDirectoryService.getPharmacies(loc),
      healthcareDirectoryService.getDiagnosticCentres(loc)
    ]);
    setHospitals(hList);
    setPharmacies(pList);
    setDiagnostics(dList);

    if (initialSelectedId) {
      const found = [...hList, ...pList, ...dList].find(f => f.id === initialSelectedId);
      if (found) setSelectedFacility(found);
    } else if (!selectedFacility) {
      setSelectedFacility(hList[0] || null);
    }
  };

  useEffect(() => {
    loadData(userLocation);
  }, []);

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      setLocationStatus('Geolocation API is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationDenied(false);
    setLocationStatus('Requesting GPS permission from browser...');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
        setIsLocating(false);
        setLocationDenied(false);
        setLocationStatus(`GPS Active (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°)`);
        loadData(coords);

        if (mapInstanceRef.current && window.google) {
          const userLatLng = new window.google.maps.LatLng(coords.lat, coords.lng);
          mapInstanceRef.current.panTo(userLatLng);
          mapInstanceRef.current.setZoom(14);

          if (userMarkerRef.current) {
            userMarkerRef.current.setPosition(userLatLng);
          } else {
            userMarkerRef.current = new window.google.maps.Marker({
              position: userLatLng,
              map: mapInstanceRef.current,
              title: 'Your Location',
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#2563eb',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }
            });
          }
        }
      },
      err => {
        setIsLocating(false);
        setLocationDenied(true);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('Location access is disabled. Enable location permission to see your distance from healthcare facilities.');
        } else {
          setLocationStatus('Location signal unavailable: ' + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (!envKey || envKey === 'your_google_maps_api_key_here') {
      setGoogleMapsError('Google Maps API key not configured in .env (VITE_GOOGLE_MAPS_API_KEY). Interactive Hassan City Grid active.');
      return;
    }

    if (window.google && window.google.maps) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script-loader';
    if (document.getElementById(scriptId)) return;

    window.initGoogleMapCallback = () => {
      setIsGoogleMapsLoaded(true);
      setGoogleMapsError(null);
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${envKey}&callback=initGoogleMapCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setGoogleMapsError('Failed to load Google Maps JavaScript API. Please check your API key and network permissions.');
    };
    document.head.appendChild(script);

    return () => {
      delete window.initGoogleMapCallback;
    };
  }, [envKey]);

  const allFacilities = [
    ...hospitals.map(h => ({ ...h, facilityType: 'hospital' as const })),
    ...pharmacies.map(p => ({ ...p, facilityType: 'pharmacy' as const })),
    ...diagnostics.map(d => ({ ...d, facilityType: 'diagnostic' as const }))
  ];

  const filteredFacilities = allFacilities.filter(f => {
    if (activeCategory === 'campus') return f.isCampusFacility;
    if (activeCategory === 'hospitals') return f.facilityType === 'hospital';
    if (activeCategory === 'pharmacies') return f.facilityType === 'pharmacy';
    if (activeCategory === 'diagnostics') return f.facilityType === 'diagnostic';
    return true;
  });

  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapContainerRef.current || !window.google) return;

    const defaultCenter = userLocation || { lat: 13.0076, lng: 76.0965 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13
      });
    }

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    filteredFacilities.forEach(facility => {
      const markerColor = facility.isCampusFacility
        ? '#0d9488'
        : facility.facilityType === 'hospital'
        ? '#e11d48'
        : facility.facilityType === 'pharmacy'
        ? '#059669'
        : '#7c3aed';

      const marker = new window.google.maps.Marker({
        position: { lat: facility.lat, lng: facility.lng },
        map: mapInstanceRef.current,
        title: facility.name,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: markerColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family: sans-serif; padding: 4px; max-width: 220px;">` +
          `<strong style="font-size: 13px; color: #0f172a;">${facility.name}</strong>` +
          `<p style="font-size: 11px; color: #64748b; margin: 4px 0;">${facility.address}</p>` +
          `${facility.phone ? `<p style="font-size: 11px; color: #0284c7;">📞 ${facility.phone}</p>` : ''}` +
          `${facility.verified ? '<span style="font-size: 10px; background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Verified Directory</span>' : '<span style="font-size: 10px; background: #fef9c3; color: #854d0e; padding: 2px 6px; border-radius: 4px;">Verification Pending</span>'}` +
          `</div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedFacility(facility);
        if (onSelectFacility) onSelectFacility(facility);
      });

      markersRef.current.push(marker);
    });
  }, [isGoogleMapsLoaded, activeCategory, hospitals, pharmacies, diagnostics]);

  const handleOpenDirections = (facility: any) => {
    const originParam = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : '';
    const destParam = `&destination=${facility.lat},${facility.lng}`;
    const placeParam = `&destination_place_id=${encodeURIComponent(facility.name)}`;
    const url = `https://www.google.com/maps/dir/?api=1${originParam}${destParam}${placeParam}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const currentSelection = selectedFacility || filteredFacilities[0] || null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Category Tabs & GPS Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'all'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Hassan Facilities ({allFacilities.length})
          </button>
          <button
            onClick={() => setActiveCategory('campus')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'campus'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Campus Health Centre
          </button>
          <button
            onClick={() => setActiveCategory('hospitals')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'hospitals'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveCategory('pharmacies')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'pharmacies'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Pharmacies ({pharmacies.length})
          </button>
          <button
            onClick={() => setActiveCategory('diagnostics')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'diagnostics'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Diagnostics ({diagnostics.length})
          </button>
        </div>

        <button
          onClick={requestUserLocation}
          disabled={isLocating}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            userLocation
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-100'
          }`}
        >
          <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          {userLocation ? 'GPS Live Connected' : 'Use Browser GPS'}
        </button>
      </div>

      {/* Location Banner */}
      <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
        locationDenied
          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900/60'
          : userLocation
          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900/60'
          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-1.5">
          {locationDenied ? (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          ) : userLocation ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          ) : (
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span>{locationStatus}</span>
        </div>
        {!userLocation && !locationDenied && (
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Enable GPS to calculate geodesic distance</span>
        )}
      </div>

      {/* Map & Facility Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 relative bg-slate-950 min-h-[420px]" style={{ height }}>
          {isGoogleMapsLoaded && !googleMapsError ? (
            <div ref={mapContainerRef} className="w-full h-full" />
          ) : (
            <div className="w-full h-full p-6 relative flex flex-col justify-between overflow-hidden bg-slate-950 text-white">
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <div className="bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-primary-400" />
                  <span>Hassan Healthcare Geodesic Grid (13.0076° N, 76.0965° E)</span>
                </div>
                {googleMapsError && (
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800">
                    Google Maps API Key Not Configured
                  </span>
                )}
              </div>

              {/* Nodes */}
              <div className="relative z-10 my-6 flex flex-wrap gap-3 items-center justify-center">
                {filteredFacilities.map(fac => {
                  const isSelected = currentSelection?.id === fac.id;
                  const isCampus = fac.isCampusFacility;

                  return (
                    <button
                      key={fac.id}
                      onClick={() => {
                        setSelectedFacility(fac);
                        if (onSelectFacility) onSelectFacility(fac);
                      }}
                      className={`flex flex-col items-center transition-all ${
                        isSelected ? 'scale-110 z-20' : 'hover:scale-105 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg border-2 ${
                          isSelected
                            ? 'bg-primary-500 text-white border-white ring-4 ring-primary-500/30'
                            : isCampus
                            ? 'bg-teal-600 text-white border-teal-400'
                            : fac.facilityType === 'hospital'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : fac.facilityType === 'pharmacy'
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-purple-600 text-white border-purple-400'
                        }`}
                      >
                        {isCampus ? (
                          <Shield className="w-5 h-5" />
                        ) : fac.facilityType === 'hospital' ? (
                          <Building2 className="w-5 h-5" />
                        ) : fac.facilityType === 'pharmacy' ? (
                          <Pill className="w-5 h-5" />
                        ) : (
                          <Activity className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={`mt-1.5 px-2 py-0.5 rounded text-[11px] font-bold max-w-[130px] truncate shadow ${
                          isSelected
                            ? 'bg-white text-slate-900'
                            : 'bg-slate-900/90 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {fac.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span>Select any node to inspect verified Hassan healthcare facility records & launch Google Maps directions</span>
                <span className="text-emerald-400 font-mono text-[11px] font-semibold">Hassan, Karnataka</span>
              </div>
            </div>
          )}
        </div>

        {/* Facility Details Panel */}
        <div className="lg:col-span-4 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          {currentSelection ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  currentSelection.isCampusFacility
                    ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                    : currentSelection.facilityType === 'hospital'
                    ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : currentSelection.facilityType === 'pharmacy'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                }`}>{currentSelection.category || currentSelection.facilityType}</span>

                {currentSelection.verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Verified Directory
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    Verification Pending
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {currentSelection.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                  {currentSelection.address}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-primary-500" /> Distance from you:
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {userLocation && currentSelection.liveDistance !== undefined
                    ? `${currentSelection.liveDistance} km away`
                    : currentSelection.distanceKm
                    ? `~${currentSelection.distanceKm} km (from MCE)`
                    : 'Enable GPS for distance'}
                </span>
              </div>

              {currentSelection.openHours && (
                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentSelection.openHours}</span>
                </div>
              )}

              {(currentSelection.facilities || currentSelection.services) && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Services & Features
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(currentSelection.services || currentSelection.facilities || []).slice(0, 4).map((s: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentSelection.sourceUrl && (
                <div className="pt-1 text-[11px]">
                  <a
                    href={currentSelection.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View Official Source ({currentSelection.dataSource || 'Website'})
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              Select a facility from the map to view details.
            </div>
          )}

          {currentSelection && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 mt-4">
              {currentSelection.phone && (
                <a
                  href={`tel:${currentSelection.phone}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow transition-all"
                >
                  <Phone className="w-3.5 h-3.5" /> Call ({currentSelection.phone})
                </a>
              )}
              <button
                onClick={() => handleOpenDirections(currentSelection)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-primary-500" /> Open Directions in Google Maps
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};