import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

// USA ESTO PARA VITE/VERCEL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Rebel Radio: Missing Supabase Credentials");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
