import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request, { params }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { slug } = params;

    const { data: org, error: orgError } = await supabase
      .from('organizaciones')
      .select('id, user_id, nombre, slug, descripcion, whatsapp, email, ciudad, provincia, logo_url, plan, commission_pct, activa, total_rifas, total_recaudado, alias_cobro, mp_alias, uala_alias, uala_connected, created_at')
      .eq('slug', slug)
      .eq('activa', true)
      .single();

    if (orgError || !org) {
      return Response.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { data: productosRaw } = await supabase
      .from('productos')
      .select('*, categorias!inner(id, nombre)')
      .eq('organization_id', org.id)
      .eq('finalizado', false)
      .order('created_at', { ascending: false });

    const productos = [];
    for (const p of (productosRaw || [])) {
      const { count: vendidos } = await supabase
        .from('boletos')
        .select('id', { count: 'exact', head: true })
        .eq('producto_id', p.id)
        .eq('estado', 'vendido');
      const { count: reservados } = await supabase
        .from('boletos')
        .select('id', { count: 'exact', head: true })
        .eq('producto_id', p.id)
        .eq('estado', 'reservado');
      const { count: total } = await supabase
        .from('boletos')
        .select('id', { count: 'exact', head: true })
        .eq('producto_id', p.id);
      productos.push({ ...p, vendidos: vendidos || 0, reservados: reservados || 0, boletos_count: total || 100 });
    }

    const { data: ganadores } = await supabase
      .from('productos')
      .select('id, nombre, title, imagen, ganador_num, ganador_nombre, ganador_foto, ganador_video, ganador_testimonio, ganador_ciudad, created_at')
      .eq('organization_id', org.id)
      .eq('finalizado', true)
      .order('created_at', { ascending: false })
      .limit(10);

    return Response.json({
      organizacion: org,
      productos: productos || [],
      ganadores: ganadores || [],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
