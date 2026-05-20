import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, email } = body;

    if (!password) {
      return Response.json({ success: false, error: 'Contraseña requerida' }, { status: 400 });
    }

    // Primary check: ADMIN_PASSWORD env var
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword) {
      return Response.json({ success: true });
    }

    // Fallback: check via supabase auth with admin email
    if (email) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error) {
            // Valid admin credentials via supabase
            return Response.json({ success: true });
          }
        }
      } catch (e) {
        // Fallback failed, continue to error
      }
    }

    return Response.json({ success: false, error: 'Contraseña incorrecta' }, { status: 401 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
