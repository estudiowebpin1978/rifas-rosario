import { createClient } from '@supabase/supabase-js';

export async function POST() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return Response.json({ success: true, message: 'Endpoint ready. Tables were created via SQL Editor.' });
}