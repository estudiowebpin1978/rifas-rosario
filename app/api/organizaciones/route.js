import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 60);
}

export async function GET(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error } = await supabase
      .from('organizaciones')
      .select('*')
      .eq('activa', true)
      .order('total_rifas', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return Response.json({ error: 'Error al obtener organizaciones' }, { status: 400 });

    const { count } = await supabase
      .from('organizaciones')
      .select('*', { count: 'exact', head: true })
      .eq('activa', true);

    return Response.json({ organizaciones: data || [], total: count || 0 });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    const { user_id, nombre, descripcion, whatsapp, email, ciudad, provincia, logo_url, referido_por } = body;

    if (!user_id || !nombre) {
      return Response.json({ error: 'Faltan campos requeridos: user_id, nombre' }, { status: 400 });
    }

    let slug = slugify(nombre);

    const { data: existingSlug } = await supabase
      .from('organizaciones')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      slug = slug + '-' + Date.now().toString(36);
    }

    const { data: org, error: orgError } = await supabase
      .from('organizaciones')
      .insert([{
        user_id,
        nombre,
        slug,
        descripcion: descripcion || null,
        whatsapp: whatsapp || null,
        email: email || null,
        ciudad: ciudad || null,
        provincia: provincia || null,
        logo_url: logo_url || null,
        referido_por: referido_por || null,
        plan: 'free',
        commission_pct: 8,
      }])
      .select()
      .single();

    if (orgError) return Response.json({ error: 'Error al crear organización' }, { status: 400 });

    const { data: plan } = await supabase
      .from('planes')
      .select('comision_pct')
      .eq('slug', 'free')
      .single();

    if (plan) {
      await supabase
        .from('organizaciones')
        .update({ commission_pct: plan.comision_pct })
        .eq('id', org.id);
    }

    if (referido_por) {
      const { data: afiliado } = await supabase
        .from('afiliados')
        .select('id')
        .eq('codigo', referido_por)
        .single();

      if (afiliado) {
        await supabase.from('referidos').insert([{
          afiliado_id: afiliado.id,
          organizacion_id: org.id,
          user_id,
          estado: 'convertido',
        }]);
      }
    }

    return Response.json({ success: true, organizacion: org });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
