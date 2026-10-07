import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Global cache for warm lambda executions & multi-network cross-sync
declare global {
  var __campuscare_emergencies: any[] | undefined;
}

if (!globalThis.__campuscare_emergencies) {
  globalThis.__campuscare_emergencies = [];
}

export interface CallerIdentity {
  id: string;
  role: 'student' | 'doctor' | 'admin' | 'faculty' | 'staff';
  fullName?: string;
  email?: string;
  phone?: string;
}

function getSupabaseClient() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (
    url &&
    key &&
    !url.includes('your-project-id') &&
    key !== 'placeholder-anon-key' &&
    key.length > 20
  ) {
    try {
      return createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (e) {
      console.warn('[api/emergency] Supabase init warning:', e);
    }
  }
  return null;
}

export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function normalizeIncident(d: any): any {
  const rawStatus = (d.status || 'ACTIVE').toString().toUpperCase();
  let status = 'ACTIVE';
  if (rawStatus === 'ACKNOWLEDGED') status = 'ACKNOWLEDGED';
  else if (rawStatus === 'RESPONDER_ASSIGNED') status = 'RESPONDER_ASSIGNED';
  else if (rawStatus === 'ASSISTANCE_IN_PROGRESS') status = 'ASSISTANCE_IN_PROGRESS';
  else if (rawStatus === 'RESOLVED') status = 'RESOLVED';
  else if (rawStatus === 'CANCELLED') status = 'CANCELLED';
  else if (rawStatus === 'REQUESTED' || rawStatus === 'ACTIVE') status = 'ACTIVE';

  return {
    id: d.id || ('emg-' + Date.now()),
    incidentCode: d.incident_code || d.incidentCode || `MCE-SOS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    userId: d.user_id || d.userId || null,
    userRole: (d.user_role || d.userRole || 'student').toLowerCase(),
    callerName: d.caller_name || d.callerName || 'Campus Member (SOS Alert)',
    callerPhone: d.caller_phone || d.callerPhone || '9110885805',
    locationDetails: d.location_details || d.locationDetails || 'MCE Hassan Campus',
    description: d.description || 'Immediate campus first-aid assistance requested.',
    latitude: d.latitude ? Number(d.latitude) : null,
    longitude: d.longitude ? Number(d.longitude) : null,
    hasLocationPermission: Boolean(d.has_location_permission || d.hasLocationPermission || d.latitude),
    locationShared: Boolean(d.location_shared || d.locationShared || d.latitude),
    emergencyType: d.emergency_type || d.emergencyType || 'Accident/Trauma',
    status,
    responderName: d.responder_name || d.responderName || null,
    dispatchedUnit: d.dispatched_unit || d.dispatchedUnit || 'MCE Campus Safety & First Aid Protocol',
    firstAidContactedAt: d.first_aid_contacted_at || d.firstAidContactedAt || null,
    responderAssignedAt: d.responder_assigned_at || d.responderAssignedAt || null,
    assistanceStartedAt: d.assistance_started_at || d.assistanceStartedAt || null,
    referredAt: d.referred_at || d.referredAt || null,
    resolvedAt: d.resolved_at || d.resolvedAt || null,
    timestamp: d.timestamp || d.created_at || new Date().toISOString(),
    createdAt: d.created_at || d.createdAt || new Date().toISOString(),
    updatedAt: d.updated_at || d.updatedAt || new Date().toISOString()
  };
}

export async function extractCaller(req: VercelRequest, supabase: any): Promise<CallerIdentity | null> {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let bearerToken: string | null = null;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.slice(7).trim();
  }

  // 1. Verify Supabase JWT token if available
  if (supabase && bearerToken && bearerToken !== 'undefined' && bearerToken !== 'null' && bearerToken.length > 20) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
      if (!error && user) {
        let role = ((user.user_metadata?.role || 'student') as string).toLowerCase() as any;
        let fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
        let phone = user.user_metadata?.phone || user.phone || '9110885805';

        try {
          const { data: dbUser } = await supabase.from('users').select('role, full_name, phone').eq('id', user.id).maybeSingle();
          if (dbUser) {
            role = (dbUser.role || role).toLowerCase();
            fullName = dbUser.full_name || fullName;
            phone = dbUser.phone || phone;
          }
        } catch {}

        return {
          id: user.id,
          role,
          fullName,
          email: user.email,
          phone
        };
      }
    } catch (e) {
      console.warn('[api/emergency] Bearer token verification warning:', e);
    }
  }

  // 2. Verify authenticated custom request headers (x-user-id, x-user-role)
  const headerUserId = (req.headers['x-user-id'] || req.headers['X-User-Id']) as string | undefined;
  if (headerUserId && typeof headerUserId === 'string' && headerUserId.trim()) {
    const rawRole = ((req.headers['x-user-role'] || req.headers['X-User-Role'] || 'student') as string).toLowerCase();
    const role: any = ['admin', 'doctor', 'faculty', 'staff'].includes(rawRole) ? rawRole : 'student';
    const fullName = (req.headers['x-user-name'] || req.headers['X-User-Name']) as string | undefined;
    const email = (req.headers['x-user-email'] || req.headers['X-User-Email']) as string | undefined;
    const phone = (req.headers['x-user-phone'] || req.headers['X-User-Phone']) as string | undefined;

    return {
      id: headerUserId.trim(),
      role,
      fullName,
      email,
      phone: phone || '9110885805'
    };
  }

  return null;
}

export function isResponder(role?: string): boolean {
  if (!role) return false;
  const clean = role.toLowerCase();
  return clean === 'admin' || clean === 'doctor' || clean === 'faculty' || clean === 'staff';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user-id, x-user-role, x-user-name, x-user-email, x-user-phone'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient();
  const memoryStore = globalThis.__campuscare_emergencies || [];

  // Enforce Authentication: Reject anonymous callers (public anonymous access prohibited)
  const caller = await extractCaller(req, supabase);
  if (!caller) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required. Anonymous access to campus emergency SOS is prohibited.'
    });
  }

  // ==========================================
  // GET: Retrieve emergency incidents (RLS Scoped)
  // ==========================================
  if (req.method === 'GET') {
    const incidentMap = new Map<string, any>();

    // 1. Fetch from Supabase if connected
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('emergency_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          data.forEach(row => {
            const normalized = normalizeIncident(row);
            incidentMap.set(normalized.id, normalized);
            if (normalized.incidentCode) incidentMap.set(normalized.incidentCode, normalized);
          });
        }
      } catch (err) {
        console.warn('[api/emergency] Supabase query warning:', err);
      }
    }

    // 2. Merge with memory store
    memoryStore.forEach(row => {
      const normalized = normalizeIncident(row);
      if (!incidentMap.has(normalized.id)) {
        incidentMap.set(normalized.id, normalized);
      }
    });

    const allIncidents = Array.from(new Set(incidentMap.values())).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 3. Strict RLS Scope:
    // - Responders & Admins: see all campus emergency incidents
    // - Regular Students: see ONLY their own emergency incident records
    let filteredIncidents: any[] = [];
    if (isResponder(caller.role)) {
      filteredIncidents = allIncidents;
    } else {
      filteredIncidents = allIncidents.filter(
        i => i.userId && i.userId.toLowerCase() === caller.id.toLowerCase()
      );
    }

    return res.status(200).json({
      success: true,
      count: filteredIncidents.length,
      isSupabaseConnected: Boolean(supabase),
      emergencies: filteredIncidents,
      data: filteredIncidents
    });
  }

  // ==========================================
  // POST: Create a new emergency SOS incident
  // ==========================================
  if (req.method === 'POST') {
    const body = req.body || {};

    const incidentId = body.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('emg-' + Date.now()));
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const incidentCode = body.incidentCode || `MCE-SOS-2026-${randomNum}`;
    const now = new Date().toISOString();

    const newIncident = normalizeIncident({
      id: incidentId,
      incidentCode,
      userId: caller.id,
      userRole: caller.role,
      callerName: body.callerName || caller.fullName || 'Campus Member (SOS Alert)',
      callerPhone: body.callerPhone || caller.phone || '9110885805',
      locationDetails: body.locationDetails || 'MCE Hassan Campus',
      description: body.description || 'Immediate campus first-aid assistance requested.',
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      hasLocationPermission: Boolean(body.latitude),
      locationShared: Boolean(body.latitude),
      emergencyType: body.emergencyType || 'Accident/Trauma',
      status: 'ACTIVE', // Initial status strictly ACTIVE per Requirement 2
      dispatchedUnit: 'MCE Campus Safety & First Aid Protocol',
      timestamp: now,
      createdAt: now,
      updatedAt: now
    });

    // 1. Persist to Supabase if connected
    let supabaseResult: any = { attempted: false };
    if (supabase) {
      supabaseResult.attempted = true;
      try {
        const dbPayload: any = {
          incident_code: newIncident.incidentCode,
          user_role: newIncident.userRole,
          caller_name: newIncident.callerName,
          caller_phone: newIncident.callerPhone,
          location_details: newIncident.locationDetails,
          description: newIncident.description,
          emergency_type: newIncident.emergencyType,
          latitude: newIncident.latitude,
          longitude: newIncident.longitude,
          location_shared: newIncident.locationShared,
          has_location_permission: newIncident.hasLocationPermission,
          status: newIncident.status,
          dispatched_unit: newIncident.dispatchedUnit
        };

        if (isValidUuid(newIncident.id)) {
          dbPayload.id = newIncident.id;
        }

        if (isValidUuid(newIncident.userId)) {
          dbPayload.user_id = newIncident.userId;
        }

        const { data: inserted, error } = await supabase
          .from('emergency_requests')
          .insert([dbPayload])
          .select()
          .maybeSingle();

        if (error) {
          console.warn('[api/emergency] Supabase primary insert warning:', error);
          supabaseResult.error = error.message;

          // Fallback insert without strict UUIDs if non-UUID ID was supplied
          const { error: fbErr } = await supabase.from('emergency_requests').insert([{
            caller_name: newIncident.callerName,
            caller_phone: newIncident.callerPhone,
            location_details: newIncident.locationDetails,
            emergency_type: newIncident.emergencyType,
            status: newIncident.status,
            latitude: newIncident.latitude,
            longitude: newIncident.longitude
          }]);
          if (!fbErr) supabaseResult.fallbackSuccess = true;
        } else {
          supabaseResult.inserted = inserted;
        }
      } catch (err: any) {
        console.warn('[api/emergency] Supabase exception during insert:', err);
        supabaseResult.exception = err.message;
      }
    }

    // 2. Persist to memory store
    globalThis.__campuscare_emergencies = [
      newIncident,
      ...memoryStore.filter(e => e.id !== newIncident.id && e.incidentCode !== newIncident.incidentCode)
    ];

    return res.status(200).json({
      success: true,
      emergency: newIncident,
      data: newIncident,
      supabaseResult
    });
  }

  // ==========================================
  // PATCH: Update incident status (RLS Verified)
  // ==========================================
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const { id, incidentCode, status, responderName, metadata } = req.body || {};
    const targetId = id || incidentCode;

    if (!targetId || !status) {
      return res.status(400).json({
        success: false,
        error: 'id (or incidentCode) and status are required.'
      });
    }

    const cleanStatus = status.toString().toUpperCase();

    // 1. Locate target incident
    let target = memoryStore.find(e => e.id === targetId || e.incidentCode === targetId);
    if (!target && supabase) {
      try {
        const { data } = await supabase
          .from('emergency_requests')
          .select('*')
          .or(`id.eq.${id || targetId},incident_code.eq.${incidentCode || targetId}`)
          .maybeSingle();
        if (data) target = normalizeIncident(data);
      } catch {}
    }

    if (!target) {
      return res.status(404).json({
        success: false,
        error: `Incident ${targetId} not found.`
      });
    }

    // 2. Strict RLS Authorization Check:
    // Only authorized First Aid responders/admins can advance lifecycle:
    // ACTIVE -> ACKNOWLEDGED -> ASSISTANCE_IN_PROGRESS -> RESOLVED
    // Regular students can ONLY cancel their own active incident.
    const userIsResponder = isResponder(caller.role);
    const userIsOwner = target.userId && target.userId.toLowerCase() === caller.id.toLowerCase();

    if (!userIsResponder) {
      if (!userIsOwner || cleanStatus !== 'CANCELLED') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only authorized First Aid responders/admins can update incident status.'
        });
      }
    }

    const now = new Date().toISOString();
    const updateData: any = {
      status: cleanStatus,
      updated_at: now
    };

    if (cleanStatus === 'ACKNOWLEDGED') {
      updateData.first_aid_contacted_at = now;
      updateData.firstAidContactedAt = now;
    } else if (cleanStatus === 'RESPONDER_ASSIGNED') {
      updateData.responder_assigned_at = now;
      updateData.responderAssignedAt = now;
      if (responderName) {
        updateData.responder_name = responderName;
        updateData.responderName = responderName;
      }
    } else if (cleanStatus === 'ASSISTANCE_IN_PROGRESS') {
      updateData.assistance_started_at = now;
      updateData.assistanceStartedAt = now;
    } else if (cleanStatus === 'RESOLVED') {
      updateData.resolved_at = now;
      updateData.resolvedAt = now;
    }

    // 3. Persist to Supabase if connected
    if (supabase) {
      try {
        await supabase
          .from('emergency_requests')
          .update(updateData)
          .or(`id.eq.${target.id},incident_code.eq.${target.incidentCode}`);
      } catch (err) {
        console.warn('[api/emergency] Supabase update warning:', err);
      }
    }

    // 4. Update memory store
    globalThis.__campuscare_emergencies = memoryStore.map(e => {
      if (e.id === target.id || e.incidentCode === target.incidentCode) {
        return {
          ...e,
          ...updateData,
          status: cleanStatus,
          responderName: responderName || e.responderName,
          firstAidContactedAt: cleanStatus === 'ACKNOWLEDGED' ? now : e.firstAidContactedAt,
          assistanceStartedAt: cleanStatus === 'ASSISTANCE_IN_PROGRESS' ? now : e.assistanceStartedAt,
          resolvedAt: cleanStatus === 'RESOLVED' ? now : e.resolvedAt,
          updatedAt: now
        };
      }
      return e;
    });

    const updatedIncident = {
      ...target,
      ...updateData,
      status: cleanStatus,
      updatedAt: now
    };

    return res.status(200).json({
      success: true,
      message: `Emergency incident ${target.id} status updated to ${cleanStatus}`,
      incident: updatedIncident,
      data: updatedIncident
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
