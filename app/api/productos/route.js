import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: productos, error: prodError } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: false });

    if (prodError) {
      return Response.json({ error: 'Error al obtener productos' }, { status: 400 });
    }

    const { data: categorias } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true });

    let boletos = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: pageData, error: pageError } = await supabase
        .from('boletos')
        .select('*')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (pageError || !pageData || pageData.length === 0) break;
      boletos = [...boletos, ...pageData];
      if (pageData.length < PAGE_SIZE) break;
      page++;
    }

    const productosConCategoria = productos.map(p => ({
      ...p,
      categorias: categorias?.find(c => c.id === p.categoria_id) || null,
      title: p.title || p.nombre,
      description: p.description || p.descripcion,
      image: p.image || p.imagen,
      price: p.price || 0,
      raffle_price: p.raffle_price || parseInt(String(p.precio || '0').replace(/[^0-9]/g,'')) || 0,
      numbers_total: p.numbers_total || 100,
    }));

    const orgIds = [...new Set(productos.filter(p => p.organization_id).map(p => p.organization_id))];
    let orgsMap = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizaciones')
        .select('id, nombre, slug, whatsapp, alias_cobro, mp_alias, uala_alias, commission_pct')
        .in('id', orgIds);
      if (orgs) {
        orgsMap = Object.fromEntries(orgs.map(o => [o.id, o]));
      }
    }

    const productosFinales = productosConCategoria.map(p => ({
      ...p,
      organizacion: p.organization_id ? orgsMap[p.organization_id] || null : null,
    }));

    return Response.json({
      productos: productosFinales || [],
      categorias: categorias || [],
      boletos: boletos.map(b => ({
        id: b.id,
        numero: b.numero,
        estado: b.estado,
        producto_id: b.producto_id,
      }))
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return e;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'ID requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('boletos').delete().eq('producto_id', parseInt(id));
    const { error } = await supabase.from('productos').delete().eq('id', parseInt(id));

    if (error) {
      return Response.json({ error: 'Error al eliminar producto' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
