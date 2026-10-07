import { supabase, isSupabaseConfigured } from './supabase';
import { EmergencyRequest, EmergencyCampusStatus } from '../types';

const STORAGE_KEY = 'campuscare_emergencies';

const defaultEmergencies: EmergencyRequest[] = [
  {
    id: 'emg-001',
    incidentCode: 'MCE-SOS-2026-1001',
    callerName: 'Hostel Block A Security',
    callerPhone: '9110885805',
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
  const rawStatus = (d.status || 'ACTIVE').toString().toUpperCase();
  let status: EmergencyCampusStatus = 'ACTIVE';
  if (rawStatus === 'ACKNOWLEDGED') status = 'ACKNOWLEDGED';
  else if (rawStatus === 'RESPONDER_ASSIGNED') status = 'RESPONDER_ASSIGNED';
  else if (rawStatus === 'ASSISTANCE_IN_PROGRESS') status = 'ASSISTANCE_IN_PROGRESS';
  else if (rawStatus === 'REFERRED') status = 'REFERRED';
  else if (rawStatus === 'RESOLVED' || rawStatus === 'resolved') status = 'RESOLVED';
  else if (rawStatus === 'CANCELLED' || rawStatus === 'cancelled') status = 'CANCELLED';
  else if (rawStatus === 'REQUESTED' || rawStatus === 'ACTIVE' || rawStatus === 'active') status = 'ACTIVE';

  return {
    id: d.id,
    incidentCode: d.incident_code || d.incidentCode || undefined,
    userId: d.user_id || d.userId,
    userRole: d.user_role || d.userRole || 'student',
    callerName: d.caller_name || d.callerName || 'Campus Member',
    callerPhone: d.caller_phone || d.callerPhone || '9110885805',
    locationDetails: d.location_details || d.locationDetails || 'MCE Hassan Campus',
    description: d.description,
    latitude: d.latitude ? Number(d.latitude) : null,
    longitude: d.longitude ? Number(d.longitude) : null,
    hasLocationPermission: Boolean(d.location_shared || d.has_location_permission || d.hasLocationPermission),
    locationShared: Boolean(d.location_shared || d.locationShared),
    emergencyType: d.emergency_type || d.emergencyType || 'Other',
    status,
    dispatchedUnit: d.dispatched_unit || d.dispatchedUnit || 'MCE Campus Safety & First Aid Protocol',
    responderName: d.responder_name || d.responderName,
    firstAidContactedAt: d.first_aid_contacted_at || d.firstAidContactedAt,
    responderAssignedAt: d.responder_assigned_at || d.responderAssignedAt,
    assistanceStartedAt: d.assistance_started_at || d.assistanceStartedAt,
    referredAt: d.referred_at || d.referredAt,
    resolvedAt: d.resolved_at || d.resolvedAt,
    timestamp: d.timestamp || d.created_at || new Date().toISOString(),
    createdAt: d.created_at || d.createdAt,
    updatedAt: d.updated_at || d.updatedAt
  };
}

export interface CallerAuthContext {
  id?: string;
  role?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  token?: string;
}

export const emergencyService = {
  async getEmergencies(caller?: CallerAuthContext): Promise<EmergencyRequest[]> {
    // 1. Try serverless API first
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (caller?.id) headers['x-user-id'] = caller.id;
      if (caller?.role) headers['x-user-role'] = caller.role;
      if (caller?.fullName) headers['x-user-name'] = caller.fullName;
      if (caller?.token) headers['Authorization'] = `Bearer ${caller.token}`;

      const res = await fetch('/api/emergency', {
        method: 'GET',
        headers
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const apiList = json.data.map(mapDatabaseToModel);
          inMemoryEmergencies = apiList;
          setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryEmergencies));
          return inMemoryEmergencies;
        }
      }
    } catch (apiErr) {
      // API fallback
    }

    // 2. Direct Supabase if configured
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('emergency_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (caller?.role?.toLowerCase() === 'student' && caller.id) {
          query = query.eq('user_id', caller.id);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          inMemoryEmergencies = data.map(mapDatabaseToModel);
          setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryEmergencies));
          return inMemoryEmergencies;
        }
      } catch (err) {
        console.warn('Supabase getEmergencies error:', err);
      }
    }

    // 3. Fallback to local storage
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
    userRole?: string;
    incidentCode?: string;
    token?: string;
  }): Promise<EmergencyRequest> {
    const now = new Date().toISOString();
    const incidentCode = req.incidentCode || `MCE-SOS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReq: EmergencyRequest = {
      id: 'emg-' + Date.now(),
      incidentCode,
      userId: req.userId,
      userRole: req.userRole || 'student',
      callerName: req.callerName,
      callerPhone: req.callerPhone || '9110885805',
      locationDetails: req.locationDetails,
      description: req.description,
      latitude: req.latitude ?? null,
      longitude: req.longitude ?? null,
      hasLocationPermission: req.hasLocationPermission ?? Boolean(req.latitude),
      locationShared: req.locationShared ?? Boolean(req.latitude),
      emergencyType: req.emergencyType,
      status: 'ACTIVE',
      dispatchedUnit: 'MCE Campus Safety & First Aid Protocol',
      timestamp: now,
      createdAt: now,
      updatedAt: now
    };

    // 1. Call serverless API
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (req.userId) headers['x-user-id'] = req.userId;
      if (req.userRole) headers['x-user-role'] = req.userRole;
      if (req.callerName) headers['x-user-name'] = req.callerName;
      if (req.callerPhone) headers['x-user-phone'] = req.callerPhone;
      if (req.token) headers['Authorization'] = `Bearer ${req.token}`;

      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          incidentCode: newReq.incidentCode,
          callerName: newReq.callerName,
          callerPhone: newReq.callerPhone,
          locationDetails: newReq.locationDetails,
          description: newReq.description,
          latitude: newReq.latitude,
          longitude: newReq.longitude,
          hasLocationPermission: newReq.hasLocationPermission,
          locationShared: newReq.locationShared,
          emergencyType: newReq.emergencyType
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const created = mapDatabaseToModel(json.data);
          inMemoryEmergencies = [created, ...inMemoryEmergencies.filter(e => e.id !== created.id)];
          setLocalItem(STORAGE_KEY, JSON.stringify(inMemoryEmergencies));
          return created;
        }
      }
    } catch (e) {
      // Fallback to Supabase direct insert
    }

    // 2. Direct Supabase insert
    if (isSupabaseConfigured) {
      try {
        await supabase.from('emergency_requests').insert([{
          id: newReq.id,
          incident_code: newReq.incidentCode,
          user_id: newReq.userId,
          user_role: newReq.userRole,
          caller_name: newReq.callerName,
          caller_phone: newReq.callerPhone,
          location_details: newReq.locationDetails,
          description: newReq.description,
          latitude: newReq.latitude,
          longitude: newReq.longitude,
          location_shared: newReq.locationShared,
          has_location_permission: newReq.hasLocationPermission,
          emergency_type: newReq.emergencyType,
          status: 'ACTIVE',
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
    },
    caller?: CallerAuthContext
  ): Promise<void> {
    const now = new Date().toISOString();

    // 1. Send update to API
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (caller?.id) headers['x-user-id'] = caller.id;
      if (caller?.role) headers['x-user-role'] = caller.role;
      if (caller?.fullName) headers['x-user-name'] = caller.fullName;
      if (caller?.token) headers['Authorization'] = `Bearer ${caller.token}`;

      await fetch('/api/emergency', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id,
          status,
          responderName: metadata?.responderName,
          referralReason: metadata?.referralReason
        })
      });
    } catch (e) {
      // Fallback
    }

    // 2. Direct Supabase update
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
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('realtime:emergency_requests')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, onUpdate)
          .subscribe();
      } catch (e) {
        console.warn('Supabase channel subscribe warning:', e);
      }
    }

    // Polling fallback to guarantee cross-network real-time updates across devices
    const pollInterval = setInterval(() => {
      onUpdate({ eventType: 'POLL_SYNC' });
    }, 3500);

    return () => {
      clearInterval(pollInterval);
      if (channel && isSupabaseConfigured) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }
};
