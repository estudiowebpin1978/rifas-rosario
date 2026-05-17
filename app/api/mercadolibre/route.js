import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ML_API = 'https://api.mercadolibre.com';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || 'popular';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const res = await fetch(`${ML_API}/sites/MLA/search?q=${encodeURIComponent(q)}&sort=popular&limit=${limit}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      return Response.json({ error: 'Error al buscar en MercadoLibre' }, { status: 502 });
    }

    const data = await res.json();

    const products = (data.results || []).map(item => ({
      ml_id: item.id,
      nombre: item.title,
      precio: `$ ${Math.round(item.price).toLocaleString('es-AR')}-`,
      precio_raw: item.price,
      imagen: item.thumbnail?.replace('-I.jpg', '-O.jpg') || item.thumbnail,
      imagenes: item.pictures?.map(p => p.url) || [],
      permalink: item.permalink,
      categoria: item.category_id,
      dominio: item.domain_id,
      condicion: item.condition,
      vendidos: item.sold_quantity,
      ubicacion: item.address?.state_name || ''
    }));

    return Response.json({ products, total: data.paging?.total || 0 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, precio, imagen, categoria_id, ml_url } = body;

    if (!nombre || !precio || !categoria_id) {
      return Response.json({ error: 'Faltan campos: nombre, precio, categoria_id' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Error de configuracion del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .insert([{
        nombre,
        precio,
        imagen: imagen || null,
        categoria_id: parseInt(categoria_id),
        telefono: '5493416971479',
        descripcion: ml_url || null,
        metodo_sorteo: 'quiniela'
      }])
      .select()
      .single();

    if (errorProducto) {
      return Response.json({ error: 'Error al crear producto: ' + errorProducto.message }, { status: 400 });
    }

    const boletosInsert = [];
    for (let i = 1; i <= 100; i++) {
      boletosInsert.push({ numero: i, producto_id: producto.id, estado: 'disponible' });
    }

    const { error: boletosError } = await supabase.from('boletos').insert(boletosInsert);

    if (boletosError) {
      await supabase.from('productos').delete().eq('id', producto.id);
      return Response.json({ error: 'Error al crear numeros: ' + boletosError.message }, { status: 400 });
    }

    return Response.json({ success: true, producto });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
