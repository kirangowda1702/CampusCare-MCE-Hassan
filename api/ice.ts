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

  const standardStunServers = [
    {
      urls: [
        defaultStun,
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
        'stun:global.stun.twilio.com:3478'
      ]
    }
  ];

  // Helper to validate and normalize dynamic/static TURN server items
  const isValidTurnServer = (server: any): boolean => {
    if (!server || typeof server !== 'object') return false;
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const hasTurnUrl = urls.some((u: any) => typeof u === 'string' && (u.startsWith('turn:') || u.startsWith('turns:')));
    const hasCredentials = typeof server.username === 'string' && server.username.length > 0 &&
                           typeof server.credential === 'string' && server.credential.length > 0;
    return hasTurnUrl && hasCredentials;
  };

  // 1. Provider A: Xirsys Dynamic Ephemeral TURN API
  const xirsysIdent = (process.env.XIRSYS_IDENT || '').trim();
  const xirsysSecret = (process.env.XIRSYS_SECRET || '').trim();
  const xirsysChannel = (process.env.XIRSYS_CHANNEL || 'channel5cb534b4').trim();

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
        const rawServers = payload?.v?.iceServers || payload?.data?.v?.iceServers;
        if (Array.isArray(rawServers) && rawServers.length > 0) {
          const validTurn = rawServers.filter(isValidTurnServer);
          if (validTurn.length > 0) {
            return res.status(200).json({
              iceServers: [...standardStunServers, ...validTurn],
              turnConfigured: true,
              provider: 'xirsys'
            });
          }
        }
      }
      console.warn('[api/ice] Xirsys Dynamic TURN API responded with non-200 status');
    } catch (err: any) {
      console.warn('[api/ice] Error requesting Xirsys Dynamic TURN credentials');
    }
  }

  // 2. Provider B: Metered.ca Dynamic Ephemeral TURN API
  const meteredDomain = (process.env.METERED_DOMAIN || '').trim();
  const meteredApiKey = (process.env.METERED_API_KEY || '').trim();

  if (meteredDomain && meteredApiKey) {
    try {
      let cleanDomain = meteredDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!cleanDomain.includes('.')) {
        cleanDomain = `${cleanDomain}.metered.live`;
      }
      const meteredUrl = `https://${cleanDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredApiKey)}`;

      const meteredRes = await fetch(meteredUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
      });

      if (meteredRes.ok) {
        const meteredServers: any = await meteredRes.json();
        if (Array.isArray(meteredServers) && meteredServers.length > 0) {
          const validTurn = meteredServers.filter(isValidTurnServer);
          if (validTurn.length > 0) {
            return res.status(200).json({
              iceServers: [...standardStunServers, ...validTurn],
              turnConfigured: true,
              provider: 'metered'
            });
          }
        }
      }
      console.warn('[api/ice] Metered.ca Dynamic TURN API responded with non-200 status');
    } catch (err: any) {
      console.warn('[api/ice] Error requesting Metered.ca Dynamic TURN credentials');
    }
  }

  // 3. Provider C: Static Server-Side CoTURN / Cloud TURN Instance
  const staticTurnServer = (process.env.TURN_SERVER || process.env.TURN_URL || '').trim();
  const staticTurnUser = (process.env.TURN_USERNAME || '').trim();
  const staticTurnCred = (process.env.TURN_CREDENTIAL || process.env.TURN_SECRET || '').trim();

  if (staticTurnServer && staticTurnCred) {
    const urls = staticTurnServer.includes(',')
      ? staticTurnServer.split(',').map(u => u.trim())
      : staticTurnServer;

    const staticServer = {
      urls,
      username: staticTurnUser,
      credential: staticTurnCred
    };

    if (isValidTurnServer(staticServer)) {
      return res.status(200).json({
        iceServers: [...standardStunServers, staticServer],
        turnConfigured: true,
        provider: 'static'
      });
    }
  }

  // 4. Safe Fallback: No valid TURN credentials configured in server environment
  return res.status(200).json({
    iceServers: standardStunServers,
    turnConfigured: false,
    warning: 'No server-side TURN relay credentials configured. Symmetric NAT traversal requires XIRSYS_IDENT + XIRSYS_SECRET, METERED_DOMAIN + METERED_API_KEY, or TURN_SERVER + TURN_CREDENTIAL in Vercel environment variables.'
  });
}
