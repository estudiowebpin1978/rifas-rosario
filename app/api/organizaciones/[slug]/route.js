import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request, { params }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { slug } = params;

    const { data: org, error: orgError } = await supabase
      .from('organizaciones')
      .select('*')
      .eq('slug', slug)
      .eq('activa', true)
      .single();

    if (orgError || !org) {
      return Response.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { data: productos } = await supabase
      .from('productos')
      .select('*, categorias!inner(id, nombre)')
      .eq('organization_id', org.id)
      .eq('finalizado', false)
      .order('created_at', { ascending: false });

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
