import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  AlertCircle,
  Info,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Hospital, Pharmacy, DiagnosticCentre } from '../../types';
import { healthcareDirectoryService } from '../../services/healthcareDirectoryService';

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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [activeCategory, setActiveCategory] = useState<'all' | 'campus' | 'hospitals' | 'pharmacies' | 'diagnostics'>(filterType);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCentre[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Location not shared');
  const [locationDenied, setLocationDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [tileError, setTileError] = useState(false);

  // Load verified facilities from Supabase / Directory Service
  const loadData = async (loc?: { lat: number; lng: number } | null) => {
    try {
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
    } catch (err) {
      console.warn('Error loading healthcare directory:', err);
    }
  };

  useEffect(() => {
    loadData(userLocation);
  }, []);

  // Request Browser Geolocation
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      setLocationStatus('Unable to determine your location.');
      return;
    }

    setIsLocating(true);
    setLocationDenied(false);
    setLocationStatus('Requesting location permission...');

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

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, { animate: true });

          const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `
              <div style="position: relative; width: 24px; height: 24px;">
                <div style="position: absolute; width: 24px; height: 24px; background: rgba(37, 99, 235, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([coords.lat, coords.lng]);
          } else {
            userMarkerRef.current = L.marker([coords.lat, coords.lng], {
              icon: userIcon,
              title: 'Your Location'
            }).addTo(mapInstanceRef.current);
            userMarkerRef.current.bindPopup('<strong>Your Current Location</strong>');
          }
        }
      },
      err => {
        setIsLocating(false);
        setLocationDenied(true);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('Location permission denied. Please allow location in browser settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationStatus('Unable to determine your location.');
        } else if (err.code === err.TIMEOUT) {
          setLocationStatus('Location request timed out.');
        } else {
          setLocationStatus('Unable to determine your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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

  // Initialize Leaflet Map Instance with OpenStreetMap Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter: [number, number] = userLocation 
        ? [userLocation.lat, userLocation.lng] 
        : [13.0076, 76.0965]; // Hassan, Karnataka

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: true,
        attributionControl: true
      });

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Ensure proper sizing calculations once container is rendered
      const resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);

      // Handle window resize
      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', handleResize);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markersLayerRef.current = null;
          userMarkerRef.current = null;
        }
      };
    }
  }, []);

  // Invalidate size whenever category or facilities change
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeCategory, filteredFacilities.length]);

  // Update Markers when facilities or filter change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredFacilities.forEach(facility => {
      const markerColor = facility.isCampusFacility
        ? '#0d9488' // Teal (Campus)
        : facility.facilityType === 'hospital'
        ? '#e11d48' // Rose (Hospital)
        : facility.facilityType === 'pharmacy'
        ? '#059669' // Emerald (Pharmacy)
        : '#7c3aed'; // Purple (Diagnostics)

      const iconSvg = facility.isCampusFacility
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
        : facility.facilityType === 'hospital'
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`
        : facility.facilityType === 'pharmacy'
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;

      const customIcon = L.divIcon({
        className: 'custom-healthcare-marker',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            cursor: pointer;
          ">
            <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
              ${iconSvg}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28]
      });

      const marker = L.marker([facility.lat, facility.lng], {
        icon: customIcon,
        title: facility.name
      });

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px; max-width: 240px; color: #0f172a;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${markerColor}; margin-bottom: 2px;">
            ${facility.isCampusFacility ? 'Campus First Aid Centre' : ('category' in facility ? (facility as any).category : facility.facilityType)}
          </div>
          <strong style="font-size: 13px; line-height: 1.3; display: block; margin-bottom: 4px; color: #0f172a;">${facility.name}</strong>
          <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.3;">${facility.address}</p>
          ${facility.phone ? `<p style="font-size: 11px; color: #0284c7; font-weight: 600; margin: 0 0 6px 0;">📞 <a href="tel:${facility.phone}" style="color: #0284c7; text-decoration: none;">${facility.phone}</a></p>` : ''}
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
            <span style="font-size: 10px; background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Verified Directory</span>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; background: #0284c7; color: #ffffff; padding: 3px 8px; border-radius: 6px; text-decoration: none; font-weight: 600;">Get Directions &rarr;</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedFacility(facility);
        if (onSelectFacility) onSelectFacility(facility);
      });

      if (markersLayerRef.current) {
        markersLayerRef.current.addLayer(marker);
      }
    });
  }, [filteredFacilities]);

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
          {userLocation ? 'GPS Live Connected' : 'Use My Location'}
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
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Click &quot;Use My Location&quot; to calculate distance from current GPS position</span>
        )}
      </div>

      {/* Tile Error Alert if Internet Drops */}
      {tileError && (
        <div className="p-3 bg-amber-950 text-amber-200 text-xs flex items-center gap-2 border-b border-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Map tiles could not be loaded. Please check your internet connection.</span>
        </div>
      )}

      {/* Main Map & Facility Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 relative bg-slate-100 dark:bg-slate-800 min-h-[420px]" style={{ height }}>
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0 relative"
            style={{ width: '100%', height: '100%', minHeight: height || '420px' }}
          />
          {filteredFacilities.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/80 text-slate-500 text-xs p-6 backdrop-blur-[2px]">
              No verified healthcare facilities available for the selected category.
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
                }`}>{currentSelection.isCampusFacility ? 'Campus First Aid Centre' : currentSelection.category || currentSelection.facilityType}</span>

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
                  <Navigation className="w-3.5 h-3.5 text-primary-500" /> Distance:
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {userLocation && currentSelection.liveDistance !== undefined
                    ? `${currentSelection.liveDistance} km away`
                    : currentSelection.distanceKm
                    ? `~${currentSelection.distanceKm} km (from MCE)`
                    : 'Click Use My Location'}
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
                <Navigation className="w-3.5 h-3.5 text-primary-500" /> Get Directions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};