import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return Response.json({ success: false, error: 'Contraseña requerida' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return Response.json({ success: false, error: 'Error de configuración del servidor' }, { status: 500 });
    }

    if (password !== adminPassword) {
      return Response.json({ success: false, error: 'Contraseña incorrecta' }, { status: 401 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
