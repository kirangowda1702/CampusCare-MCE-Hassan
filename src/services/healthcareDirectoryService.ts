import { supabase, isSupabaseConfigured } from './supabase';
import { Hospital, Pharmacy, DiagnosticCentre } from '../types';
import { mockHospitals } from '../data/hospitals';
import { mockPharmacies } from '../data/pharmacies';
import { mockDiagnosticCentres } from '../data/diagnosticCentres';

const HOSPITALS_STORAGE_KEY = 'campuscare_hospitals';
const PHARMACIES_STORAGE_KEY = 'campuscare_pharmacies';
const DIAGNOSTICS_STORAGE_KEY = 'campuscare_diagnostics';

let inMemoryHospitals: Hospital[] = [...mockHospitals];
let inMemoryPharmacies: Pharmacy[] = [...mockPharmacies];
let inMemoryDiagnostics: DiagnosticCentre[] = [...mockDiagnosticCentres];

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

// Geodesic distance calculator (Haversine formula in km)
export function calculateGeodesicDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export const healthcareDirectoryService = {
  // ==================== HOSPITALS ====================
  async getHospitals(userLocation?: { lat: number; lng: number } | null): Promise<Hospital[]> {
    let list = inMemoryHospitals;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          list = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category || 'Specialty Hospital',
            address: d.address,
            city: d.city || 'Hassan',
            state: d.state || 'Karnataka',
            phone: d.phone,
            emergencyNumber: d.emergency_number || d.phone,
            website: d.website,
            ambulanceAvailable: d.ambulance_available ?? true,
            emergencyAvailable: d.emergency_available ?? true,
            openHours: d.open_hours || '24 Hours',
            facilities: d.facilities || [],
            services: d.services || [],
            lat: Number(d.latitude || d.lat || 13.0076),
            lng: Number(d.longitude || d.lng || 76.0965),
            latitude: Number(d.latitude || d.lat || 13.0076),
            longitude: Number(d.longitude || d.lng || 76.0965),
            verified: Boolean(d.verified),
            isCampusFacility: Boolean(d.is_campus_facility),
            sourceUrl: d.source_url,
            dataSource: d.data_source || 'Official Database'
          }));
          inMemoryHospitals = list;
        }
      } catch (err) {
        console.warn('Supabase fetch hospitals error:', err);
      }
    } else {
      const saved = getLocalItem(HOSPITALS_STORAGE_KEY);
      if (saved) {
        try {
          inMemoryHospitals = JSON.parse(saved);
          list = inMemoryHospitals;
        } catch (e) {}
      }
    }

    if (userLocation) {
      return list.map(h => ({
        ...h,
        liveDistance: calculateGeodesicDistance(userLocation.lat, userLocation.lng, h.lat, h.lng)
      }));
    }

    return list;
  },

  async updateHospitalVerification(id: string, verified: boolean): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('hospitals')
          .update({ verified, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update hospital error:', err);
      }
    }

    inMemoryHospitals = inMemoryHospitals.map(h =>
      h.id === id ? { ...h, verified, updatedAt: new Date().toISOString() } : h
    );
    setLocalItem(HOSPITALS_STORAGE_KEY, JSON.stringify(inMemoryHospitals));
  },

  async addHospital(hospital: Omit<Hospital, 'id'>): Promise<Hospital> {
    const newHospital: Hospital = {
      id: 'hosp-' + Date.now(),
      ...hospital,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('hospitals').insert([{
          id: newHospital.id,
          name: newHospital.name,
          category: newHospital.category,
          address: newHospital.address,
          city: newHospital.city || 'Hassan',
          state: newHospital.state || 'Karnataka',
          phone: newHospital.phone,
          emergency_number: newHospital.emergencyNumber,
          website: newHospital.website,
          ambulance_available: newHospital.ambulanceAvailable,
          emergency_available: newHospital.emergencyAvailable,
          open_hours: newHospital.openHours,
          facilities: newHospital.facilities,
          services: newHospital.services,
          latitude: newHospital.lat,
          longitude: newHospital.lng,
          verified: newHospital.verified,
          is_campus_facility: newHospital.isCampusFacility,
          source_url: newHospital.sourceUrl,
          data_source: newHospital.dataSource
        }]);
      } catch (err) {
        console.warn('Supabase add hospital error:', err);
      }
    }

    inMemoryHospitals = [newHospital, ...inMemoryHospitals];
    setLocalItem(HOSPITALS_STORAGE_KEY, JSON.stringify(inMemoryHospitals));
    return newHospital;
  },

  // ==================== PHARMACIES ====================
  async getPharmacies(userLocation?: { lat: number; lng: number } | null): Promise<Pharmacy[]> {
    let list = inMemoryPharmacies;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          list = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            address: d.address,
            city: d.city || 'Hassan',
            state: d.state || 'Karnataka',
            phone: d.phone,
            website: d.website,
            homeDelivery: d.home_delivery ?? true,
            openHours: d.open_hours || '8:00 AM - 10:00 PM',
            lat: Number(d.latitude || d.lat || 13.0079),
            lng: Number(d.longitude || d.lng || 76.0968),
            latitude: Number(d.latitude || d.lat || 13.0079),
            longitude: Number(d.longitude || d.lng || 76.0968),
            verified: Boolean(d.verified),
            isCampusFacility: Boolean(d.is_campus_facility),
            sourceUrl: d.source_url,
            dataSource: d.data_source || 'Official Database'
          }));
          inMemoryPharmacies = list;
        }
      } catch (err) {
        console.warn('Supabase fetch pharmacies error:', err);
      }
    } else {
      const saved = getLocalItem(PHARMACIES_STORAGE_KEY);
      if (saved) {
        try {
          inMemoryPharmacies = JSON.parse(saved);
          list = inMemoryPharmacies;
        } catch (e) {}
      }
    }

    if (userLocation) {
      return list.map(p => ({
        ...p,
        liveDistance: calculateGeodesicDistance(userLocation.lat, userLocation.lng, p.lat, p.lng)
      }));
    }

    return list;
  },

  async updatePharmacyVerification(id: string, verified: boolean): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('pharmacies')
          .update({ verified, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update pharmacy error:', err);
      }
    }

    inMemoryPharmacies = inMemoryPharmacies.map(p =>
      p.id === id ? { ...p, verified, updatedAt: new Date().toISOString() } : p
    );
    setLocalItem(PHARMACIES_STORAGE_KEY, JSON.stringify(inMemoryPharmacies));
  },

  async addPharmacy(pharmacy: Omit<Pharmacy, 'id'>): Promise<Pharmacy> {
    const newPharmacy: Pharmacy = {
      id: 'pharm-' + Date.now(),
      ...pharmacy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('pharmacies').insert([{
          id: newPharmacy.id,
          name: newPharmacy.name,
          address: newPharmacy.address,
          city: newPharmacy.city || 'Hassan',
          state: newPharmacy.state || 'Karnataka',
          phone: newPharmacy.phone,
          website: newPharmacy.website,
          home_delivery: newPharmacy.homeDelivery,
          open_hours: newPharmacy.openHours,
          latitude: newPharmacy.lat,
          longitude: newPharmacy.lng,
          verified: newPharmacy.verified,
          is_campus_facility: newPharmacy.isCampusFacility,
          source_url: newPharmacy.sourceUrl,
          data_source: newPharmacy.dataSource
        }]);
      } catch (err) {
        console.warn('Supabase add pharmacy error:', err);
      }
    }

    inMemoryPharmacies = [newPharmacy, ...inMemoryPharmacies];
    setLocalItem(PHARMACIES_STORAGE_KEY, JSON.stringify(inMemoryPharmacies));
    return newPharmacy;
  },

  // ==================== DIAGNOSTIC CENTRES ====================
  async getDiagnosticCentres(userLocation?: { lat: number; lng: number } | null): Promise<DiagnosticCentre[]> {
    let list = inMemoryDiagnostics;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('diagnostic_centres')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          list = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            address: d.address,
            city: d.city || 'Hassan',
            state: d.state || 'Karnataka',
            phone: d.phone,
            website: d.website,
            homeSampleCollection: d.home_sample_collection ?? true,
            openHours: d.open_hours || '7:00 AM - 9:00 PM',
            facilities: d.facilities || [],
            services: d.services || [],
            lat: Number(d.latitude || d.lat || 13.0048),
            lng: Number(d.longitude || d.lng || 76.1018),
            latitude: Number(d.latitude || d.lat || 13.0048),
            longitude: Number(d.longitude || d.lng || 76.1018),
            verified: Boolean(d.verified),
            sourceUrl: d.source_url,
            dataSource: d.data_source || 'Official Database'
          }));
          inMemoryDiagnostics = list;
        }
      } catch (err) {
        console.warn('Supabase fetch diagnostics error:', err);
      }
    } else {
      const saved = getLocalItem(DIAGNOSTICS_STORAGE_KEY);
      if (saved) {
        try {
          inMemoryDiagnostics = JSON.parse(saved);
          list = inMemoryDiagnostics;
        } catch (e) {}
      }
    }

    if (userLocation) {
      return list.map(dc => ({
        ...dc,
        liveDistance: calculateGeodesicDistance(userLocation.lat, userLocation.lng, dc.lat, dc.lng)
      }));
    }

    return list;
  },

  async updateDiagnosticVerification(id: string, verified: boolean): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('diagnostic_centres')
          .update({ verified, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update diagnostic error:', err);
      }
    }

    inMemoryDiagnostics = inMemoryDiagnostics.map(dc =>
      dc.id === id ? { ...dc, verified, updatedAt: new Date().toISOString() } : dc
    );
    setLocalItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(inMemoryDiagnostics));
  },

  async addDiagnosticCentre(dc: Omit<DiagnosticCentre, 'id'>): Promise<DiagnosticCentre> {
    const newDc: DiagnosticCentre = {
      id: 'diag-' + Date.now(),
      ...dc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('diagnostic_centres').insert([{
          id: newDc.id,
          name: newDc.name,
          address: newDc.address,
          city: newDc.city || 'Hassan',
          state: newDc.state || 'Karnataka',
          phone: newDc.phone,
          website: newDc.website,
          home_sample_collection: newDc.homeSampleCollection,
          open_hours: newDc.openHours,
          facilities: newDc.facilities,
          services: newDc.services,
          latitude: newDc.lat,
          longitude: newDc.lng,
          verified: newDc.verified,
          source_url: newDc.sourceUrl,
          data_source: newDc.dataSource
        }]);
      } catch (err) {
        console.warn('Supabase add diagnostic error:', err);
      }
    }

    inMemoryDiagnostics = [newDc, ...inMemoryDiagnostics];
    setLocalItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(inMemoryDiagnostics));
    return newDc;
  },

  // ==================== REALTIME SUBSCRIPTIONS ====================
  subscribeToDirectory(onUpdate: () => void) {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel('realtime:healthcare_directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diagnostic_centres' }, onUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
