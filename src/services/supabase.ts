import { createClient } from '@supabase/supabase-js';

const env: any = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const rawUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim();
const rawKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();

// Verify whether valid, non-placeholder Supabase credentials are configured
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('your-project-id') &&
  !rawUrl.includes('campuscare-mce-hassan.supabase.co') &&
  rawKey !== 'demo-anon-key' &&
  !rawKey.includes('demo_anon_key') &&
  (() => {
    try {
      const u = new URL(rawUrl);
      return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.length > 3;
    } catch {
      return false;
    }
  })()
);

// If Supabase is not configured, use a placeholder URL that does not get called
const activeUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const activeKey = isSupabaseConfigured ? rawKey : 'placeholder-anon-key';

export const supabase = createClient(activeUrl, activeKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
  }
});
