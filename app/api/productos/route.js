import { createClient } from '@supabase/supabase-js';

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
      return Response.json({ error: prodError.message }, { status: 400 });
    }
    
    const { data: categorias, error: catError } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true });
    
    // Fetch boletos with pagination to avoid PostgREST 1000 default limit
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
    
    // Auto-generate boletos for products missing them
    if (boletos) {
      for (const p of productos) {
        const hasBoletos = boletos.some(b => b.producto_id == p.id);
        if (!hasBoletos) {
          const totalNums = p.numbers_total || 100;
          const toInsert = [];
          for (let i = 1; i <= totalNums; i++) {
            toInsert.push({ numero: i, producto_id: p.id, estado: 'disponible' });
          }
          const { error: bolError } = await supabase.from('boletos').insert(toInsert);
          if (!bolError) {
            boletos = [...boletos, ...toInsert];
          }
        }
      }
    }
    
    const productosConCategoria = productos.map(p => {
      const org = p.organization_id ? null : null; // Will be populated below
      return {
        ...p,
        categorias: categorias.find(c => c.id === p.categoria_id) || null,
        title: p.title || p.nombre,
        description: p.description || p.descripcion,
        image: p.image || p.imagen,
        price: p.price || 0,
        raffle_price: p.raffle_price || parseInt(String(p.precio || '0').replace(/[^0-9]/g,'')) || 0,
        numbers_total: p.numbers_total || 100,
      };
    });

    // Fetch organization data for products that have organization_id
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
      boletos: boletos || []
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
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
      return Response.json({ error: error.message }, { status: 400 });
    }
    
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
