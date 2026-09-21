import { createClient } from '@supabase/supabase-js';
import { loaderFetch } from './loaderStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Route Supabase requests through loaderFetch so every query/insert/upload
// toggles the global loader, regardless of import order.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: loaderFetch },
});
