import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ER-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) return Response.json({ error: 'user_id requerido' }, { status: 400 });

    const { data: afiliado, error } = await supabase
      .from('afiliados')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error) return Response.json({ error: 'Afiliado no encontrado' }, { status: 404 });

    const { count: referidosCount } = await supabase
      .from('referidos')
      .select('*', { count: 'exact', head: true })
      .eq('afiliado_id', afiliado.id);

    return Response.json({ afiliado, referidos_count: referidosCount || 0 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) return Response.json({ error: 'user_id requerido' }, { status: 400 });

    const { data: existing } = await supabase
      .from('afiliados')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (existing) return Response.json({ error: 'Ya sos afiliado', codigo: existing.codigo }, { status: 400 });

    let codigo = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: slugExists } = await supabase
        .from('afiliados')
        .select('id')
        .eq('codigo', codigo)
        .single();
      if (!slugExists) break;
      codigo = generateCode();
      attempts++;
    }

    const { data: afiliado, error } = await supabase
      .from('afiliados')
      .insert([{ user_id, codigo, comision_pct: 10 }])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 400 });

    return Response.json({ success: true, afiliado });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
