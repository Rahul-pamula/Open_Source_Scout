import { createClient } from '@supabase/supabase-js';

const normalizeSupabaseValue = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const readStorageItem = (key: string) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return normalizeSupabaseValue(window.localStorage.getItem(key));
};

const getStoredUrl = () => {
  return (
    readStorageItem('OSS_SUPABASE_URL') ||
    normalizeSupabaseValue(import.meta.env.VITE_SUPABASE_URL) ||
    null
  );
};

const getStoredKey = () => {
  return (
    readStorageItem('OSS_SUPABASE_ANON_KEY') ||
    normalizeSupabaseValue(import.meta.env.VITE_SUPABASE_ANON_KEY) ||
    null
  );
};

export const getSupabaseConfig = () => {
  const url = getStoredUrl();
  const key = getStoredKey();

  if (!url || !key) {
    return null;
  }

  return { url, key };
};

export const hasSupabaseConfig = () => !!getSupabaseConfig();

export const setSupabaseConfig = (url: string, key: string) => {
  const normalizedUrl = normalizeSupabaseValue(url);
  const normalizedKey = normalizeSupabaseValue(key);

  if (!normalizedUrl || !normalizedKey) {
    throw new Error('Supabase URL and anon key are required.');
  }

  localStorage.setItem('OSS_SUPABASE_URL', normalizedUrl);
  localStorage.setItem('OSS_SUPABASE_ANON_KEY', normalizedKey);
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('OSS_SUPABASE_URL');
  localStorage.removeItem('OSS_SUPABASE_ANON_KEY');
};

const getSupabaseClient = () => {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  return createClient(config.url, config.key);
};

export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseClient();

    if (!client) {
      throw new Error(
        'Open Source Scout is not connected to a Supabase project. Please configure the project URL and anon key in the Connect screen.',
      );
    }

    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
