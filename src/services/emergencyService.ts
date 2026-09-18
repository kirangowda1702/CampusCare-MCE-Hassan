import { supabase, isSupabaseConfigured } from './supabase';
import { EmergencyRequest, EmergencyCampusStatus } from '../types';

const STORAGE_KEY = 'campuscare_emergencies';

const defaultEmergencies: EmergencyRequest[] = [
  {
    id: 'emg-001',
    callerName: 'Hostel Block A Security',
    callerPhone: '+91 8172 240590',
    locationDetails: 'Kavery Boys Hostel, Ground Floor Lounge',
    emergencyType: 'Accident/Trauma',
    status: 'RESOLVED',
    timestamp: '2026-09-14T21:40:00Z',
    dispatchedUnit: 'MCE Campus Safety & First Aid Protocol',
    locationShared: false,
    firstAidContactedAt: '2026-09-14T21:42:00Z',
    responderAssignedAt: '2026-09-14T21:45:00Z',
    assistanceStartedAt: '2026-09-14T21:50:00Z',
    resolvedAt: '2026-09-14T22:15:00Z',
    responderName: 'First-Aid Duty Officer'
  }
];

let inMemoryEmergencies: EmergencyRequest[] = [...defaultEmergencies];

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

function mapDatabaseToModel(d: any): EmergencyRequest {
  return {
    id: d.id,
    userId: d.user_id,
    callerName: d.caller_name || 'Campus Member',
    callerPhone: d.caller_phone || '',
    locationDetails: d.location_details || 'MCE Hassan Campus',
    description: d.description,
    latitude: d.latitude ? Number(d.latitude) : null,
    longitude: d.longitude ? Number(d.longitude) : null,
    hasLocationPermission: Boolean(d.location_shared || d.has_location_permission),
    locationShared: Boolean(d.location_shared),
    emergencyType: d.emergency_type || 'Other',
    status: (d.status || 'REQUESTED').toUpperCase() as EmergencyCampusStatus,
    dispatchedUnit: d.dispatched_unit || 'MCE Campus Safety & First Aid Protocol',
    responderName: d.responder_name,
    firstAidContactedAt: d.first_aid_contacted_at,
    responderAssignedAt: d.responder_assigned_at,
    assistanceStartedAt: d.assistance_started_at,
    referredAt: d.referred_at,
    resolvedAt: d.resolved_at,
    timestamp: d.created_at || d.timestamp || new Date().toISOString(),
    createdAt: d.created_at,
    updatedAt: d.updated_at
  };
}

export const emergencyService = {
  async getEmergencies(): Promise<EmergencyRequest[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('emergency_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          inMemoryEmergencies = data.map(mapDatabaseToModel);
          return inMemoryEmergencies;
        }
      } catch (err) {
        console.warn('Supabase getEmergencies error:', err);
      }
    }

    const saved = getLocalItem(STORAGE_KEY);
    if (saved) {
      try {
        inMemoryEmergencies = JSON.parse(saved);
        return inMemoryEmergencies;
      } catch (e) {}
    }
    return inMemoryEmergencies;
  },

  async createEmergency(req: {
    callerName: string;
    callerPhone: string;
    locationDetails: string;
    description?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationShared?: boolean;
    hasLocationPermission?: boolean;
    emergencyType: EmergencyRequest['emergencyType'];
    userId?: string;
  }): Promise<EmergencyRequest> {
    const now = new Date().toISOString();
    const newReq: EmergencyRequest = {
      id: 'emg-' + Date.now(),
      userId: req.userId,
      callerName: req.callerName,
      callerPhone: req.callerPhone,
      locationDetails: req.locationDetails,
      description: req.description,
      latitude: req.latitude ?? null,
      longitude: req.longitude ?? null,
      hasLocationPermission: req.hasLocationPermission ?? Boolean(req.latitude),
      locationShared: req.locationShared ?? Boolean(req.latitude),
      emergencyType: req.emergencyType,
      status: 'REQUESTED',
      dispatchedUnit: 'MCE Campus Safety & First Aid Protocol',
      timestamp: now,
      createdAt: now,
      updatedAt: now
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('emergency_requests').insert([{
          id: newReq.id,
          user_id: newReq.userId,
          caller_name: newReq.callerName,
          caller_phone: newReq.callerPhone,
          location_details: newReq.locationDetails,
          description: newReq.description,
          latitude: newReq.latitude,
          longitude: newReq.longitude,
          location_shared: newReq.locationShared,
          has_location_permission: newReq.hasLocationPermission,
          emergency_type: newReq.emergencyType,
          status: 'REQUESTED',
          dispatched_unit: newReq.dispatchedUnit
        }]);
      } catch (err) {
        console.warn('Supabase createEmergency error:', err);
      }
    }

    inMemoryEmergencies = [newReq, ...inMemoryEmergencies];
    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryEmergencies));
    return newReq;
  },

  async updateEmergencyStatus(
    id: string,
    status: EmergencyCampusStatus,
    metadata?: {
      responderName?: string;
      referredHospitalId?: string;
      referralReason?: string;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates: any = {
      status,
      updated_at: now
    };

    if (status === 'ACKNOWLEDGED') {
      updates.first_aid_contacted_at = now;
    } else if (status === 'RESPONDER_ASSIGNED') {
      updates.responder_assigned_at = now;
      if (metadata?.responderName) updates.responder_name = metadata.responderName;
    } else if (status === 'ASSISTANCE_IN_PROGRESS') {
      updates.assistance_started_at = now;
    } else if (status === 'REFERRED') {
      updates.referred_at = now;
    } else if (status === 'RESOLVED' || status === 'resolved') {
      updates.resolved_at = now;
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('emergency_requests').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateEmergencyStatus error:', err);
      }
    }

    inMemoryEmergencies = inMemoryEmergencies.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status,
          responderName: metadata?.responderName || e.responderName,
          firstAidContactedAt: status === 'ACKNOWLEDGED' ? now : e.firstAidContactedAt,
          responderAssignedAt: status === 'RESPONDER_ASSIGNED' ? now : e.responderAssignedAt,
          assistanceStartedAt: status === 'ASSISTANCE_IN_PROGRESS' ? now : e.assistanceStartedAt,
          referredAt: status === 'REFERRED' ? now : e.referredAt,
          resolvedAt: status === 'RESOLVED' || status === 'resolved' ? now : e.resolvedAt,
          updatedAt: now
        };
      }
      return e;
    });

    setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryEmergencies));
  },

  subscribeToEmergencies(onUpdate: (payload: any) => void) {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel('realtime:emergency_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, onUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
