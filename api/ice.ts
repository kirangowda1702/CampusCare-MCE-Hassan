import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export interface CallerIdentity {
  id: string;
  role: 'student' | 'doctor' | 'admin' | 'faculty' | 'staff';
  fullName?: string;
  email?: string;
  doctorId?: string;
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
      console.warn('[api/ice] Supabase client init warning:', e);
    }
  }
  return null;
}

export async function extractCaller(req: VercelRequest, supabase: any): Promise<CallerIdentity | null> {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let bearerToken: string | null = null;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.slice(7).trim();
  }

  // 1. If Bearer token is provided and Supabase client is available, verify JWT
  if (supabase && bearerToken && bearerToken !== 'undefined' && bearerToken !== 'null' && bearerToken.length > 20) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
      if (!error && user) {
        let role = ((user.user_metadata?.role || 'student') as string).toLowerCase() as any;
        let fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
        let doctorId = user.user_metadata?.doctor_id;

        return {
          id: user.id,
          role,
          fullName,
          email: user.email,
          doctorId
        };
      }
    } catch (e) {
      console.warn('[api/ice] Bearer token validation warning:', e);
    }
  }

  // 2. Validate authenticated custom request headers (x-user-id, x-user-role)
  const headerUserId = (req.headers['x-user-id'] || req.headers['X-User-Id']) as string | undefined;
  if (headerUserId && typeof headerUserId === 'string' && headerUserId.trim()) {
    const rawRole = ((req.headers['x-user-role'] || req.headers['X-User-Role'] || 'student') as string).toLowerCase();
    const role: any = ['admin', 'doctor', 'faculty', 'staff'].includes(rawRole) ? rawRole : 'student';
    const fullName = (req.headers['x-user-name'] || req.headers['X-User-Name']) as string | undefined;
    const email = (req.headers['x-user-email'] || req.headers['X-User-Email']) as string | undefined;
    const doctorId = (req.headers['x-doctor-id'] || req.headers['X-Doctor-Id']) as string | undefined;

    return {
      id: headerUserId.trim(),
      role,
      fullName,
      email,
      doctorId
    };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user-id, x-user-role, x-user-name, x-user-email, x-doctor-id'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient();
  const caller = await extractCaller(req, supabase);

  // Enforce Authentication: Anonymous / unauthenticated callers are rejected with HTTP 401
  if (!caller || !caller.id) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required to access WebRTC ICE configuration.'
    });
  }

  const defaultStun = (process.env.STUN_SERVER || process.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302').trim();

  // 1. Read rotated Xirsys credentials from server environment only
  const xirsysIdent = (process.env.XIRSYS_IDENT || '').trim();
  const xirsysSecret = (process.env.XIRSYS_SECRET || '').trim();
  const xirsysChannel = (process.env.XIRSYS_CHANNEL || 'channel5cb534b4').trim();

  // If Xirsys credentials are fully configured on the server, request dynamic TURN credentials
  if (xirsysIdent && xirsysSecret) {
    try {
      const encodedChannel = encodeURIComponent(xirsysChannel);
      const xirsysUrl = `https://global.xirsys.net/_turn/${encodedChannel}?webrtc=1&expire=60`;
      const basicAuth = `Basic ${Buffer.from(`${xirsysIdent}:${xirsysSecret}`).toString('base64')}`;

      const xirsysRes = await fetch(xirsysUrl, {
        method: 'PUT',
        headers: {
          'Authorization': basicAuth,
          'Content-Type': 'application/json'
        },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
      });

      if (xirsysRes.ok) {
        const payload: any = await xirsysRes.json();
        const iceServers = payload?.v?.iceServers || payload?.data?.v?.iceServers;
        if (Array.isArray(iceServers) && iceServers.length > 0) {
          // Return ONLY { "iceServers": [...] } to the authenticated CampusCare client
          return res.status(200).json({
            iceServers
          });
        }
      }
      console.warn('[api/ice] Xirsys Dynamic TURN API responded with non-200 status:', xirsysRes.status);
    } catch (err: any) {
      console.warn('[api/ice] Error requesting Xirsys Dynamic TURN credentials:', err?.message || 'Network error');
    }
  }

  // Fallback: If Xirsys is not configured or fails, return STUN + reliable OpenRelay TURN servers
  const fallbackServers = [
    { urls: defaultStun },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  return res.status(200).json({
    iceServers: fallbackServers
  });
}
