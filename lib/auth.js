import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'estudiowebpin@gmail.com';

export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function getSessionUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(request) {
  const user = await getSessionUser(request);

  if (!user) {
    throw new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return user;
}

export async function requireAdmin(request) {
  const user = await requireAuth(request);

  if (user.email !== ADMIN_EMAIL) {
    throw new Response(JSON.stringify({ error: 'Acceso denegado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return user;
}

export function sanitizeError(err, message = 'Error interno del servidor') {
  console.error('API Error:', err?.message || err);
  return Response.json({ error: message }, { status: 500 });
}

export function safeResponse(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
