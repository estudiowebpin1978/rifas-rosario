import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !user || user.email !== 'estudiowebpin@gmail.com') {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
    }

    const { producto_id } = await req.json();
    if (!producto_id) return new Response(JSON.stringify({ error: 'producto_id required' }), { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: prod, error: prodErr } = await supabase
      .from('productos')
      .select('id, finalizado')
      .eq('id', producto_id)
      .single();
    if (prodErr || !prod) return new Response(JSON.stringify({ error: 'Producto no encontrado' }), { status: 404 });
    if (prod.finalizado) return new Response(JSON.stringify({ mensaje: 'ya finalizado' }), { status: 200 });

    const { count, error: cntErr } = await supabase
      .from('boletos')
      .select('id', { count: 'exact', head: true })
      .eq('producto_id', producto_id)
      .eq('estado', 'vendido');
    if (cntErr) return new Response(JSON.stringify({ error: 'Error al contar boletos' }), { status: 500 });
    if (count < 100) return new Response(JSON.stringify({ mensaje: 'todavía no está vendido' }), { status: 200 });

    let quinielaNum = null;
    try {
      const res = await fetch('https://quinielanacional1.com.ar/api/ultimo');
      const json = await res.json();
      quinielaNum = json.numero || json.num || json.resultado;
    } catch {
      return new Response(JSON.stringify({ error: 'No se pudo obtener quiniela' }), { status: 502 });
    }
    if (!quinielaNum) return new Response(JSON.stringify({ error: 'Quiniela sin número' }), { status: 502 });

    const { error: updErr } = await supabase
      .from('productos')
      .update({ finalizado: true, ganador_num: quinielaNum })
      .eq('id', producto_id);
    if (updErr) return new Response(JSON.stringify({ error: 'Error al actualizar producto' }), { status: 500 });

    return new Response(JSON.stringify({ mensaje: 'ganador asignado', ganador_num: quinielaNum }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
}
