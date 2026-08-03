import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ADMIN_EMAIL = 'estudiowebpin@gmail.com';

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, email } = body;

    if (!password) {
      return Response.json({ success: false, error: 'Contraseña requerida' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword) {
      const received = Buffer.from(password, 'utf8');
      const expected = Buffer.from(adminPassword, 'utf8');
      if (received.length === expected.length && crypto.timingSafeEqual(received, expected)) {
        return Response.json({ success: true });
      }
    }

    if (email && email === ADMIN_EMAIL) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error) {
            return Response.json({ success: true });
          }
        }
      } catch {
        // Auth fallback failed
      }
    }

    return Response.json({ success: false, error: 'Contraseña incorrecta' }, { status: 401 });
  } catch {
    return Response.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
