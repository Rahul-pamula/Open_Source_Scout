import { createClient } from '@supabase/supabase-js';

const getStoredUrl = () => localStorage.getItem('OSS_SUPABASE_URL') || import.meta.env.VITE_SUPABASE_URL;
const getStoredKey = () => localStorage.getItem('OSS_SUPABASE_ANON_KEY') || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = () => {
  return !!(getStoredUrl() && getStoredKey());
};

export const setSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('OSS_SUPABASE_URL', url);
  localStorage.setItem('OSS_SUPABASE_ANON_KEY', key);
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('OSS_SUPABASE_URL');
  localStorage.removeItem('OSS_SUPABASE_ANON_KEY');
};

const supabaseUrl = getStoredUrl();
const supabaseAnonKey = getStoredKey();

// If we don't have the config yet, we can't create the client. 
// We will create a "dummy" client that throws if used before init, or just return null.
// But to avoid rewriting the whole app, we'll export it and assume it's only used inside protected routes.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as ReturnType<typeof createClient>); // Type coercion to avoid TS errors in the rest of the app, it will throw at runtime if used on Landing page.
