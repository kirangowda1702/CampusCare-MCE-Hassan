import { createClient } from '@supabase/supabase-js';

const env: any = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://campuscare-mce-hassan.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key';

export const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL && 
  env.VITE_SUPABASE_ANON_KEY &&
  env.VITE_SUPABASE_ANON_KEY !== 'demo-anon-key'
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
