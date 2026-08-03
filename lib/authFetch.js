import { supabase } from './supabaseClient';

export async function authFetch(url, options = {}) {
  let token = null;

  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      // Session not available
    }
  }

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
