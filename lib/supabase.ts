
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

/**
 * Rebel Radio Supabase Client
 * Project ID: cxgcwtsrzktbmmkcmndg
 * Updated with confirmed publishable key for browser-side interaction.
 */
const supabaseUrl = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || 'https://cxgcwtsrzktbmmkcmndg.supabase.co';
const supabaseAnonKey = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_T24vegMuC2ep_aW4VQH98g_CUcgUI6L';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Rebel Radio: Supabase credentials missing. Signal sync disabled.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
