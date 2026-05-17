import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ML_API = 'https://api.mercadolibre.com';
const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const accessToken = process.env.ML_ACCESS_TOKEN;
  if (accessToken) return accessToken;

  if (ML_CLIENT_ID && ML_CLIENT_SECRET) {
    try {
      const res = await fetch(`${ML_API}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: ML_CLIENT_ID,
          client_secret: ML_CLIENT_SECRET
        })
      });
      if (res.ok) {
        const data = await res.json();
        cachedToken = data.access_token;
        tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
        return cachedToken;
      }
    } catch (e) {}
  }
  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || 'popular';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const token = await getAccessToken();
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ML_API}/sites/MLA/search?q=${encodeURIComponent(q)}&sort=popular&limit=${limit}`, { headers });

    if (res.status === 403) {
      return Response.json({
        error: 'MercadoLibre requiere autenticación. Configurá ML_CLIENT_ID y ML_CLIENT_SECRET en las variables de entorno de Vercel, o ML_ACCESS_TOKEN con un token válido.'
      }, { status: 403 });
    }

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
    const { title, raffle_price, price, image, description, categoria_id } = body;

    if (!title || !raffle_price) {
      return Response.json({ error: 'Faltan campos: title, raffle_price' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Error de configuracion del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .insert([{
        title,
        raffle_price: parseFloat(raffle_price) || 0,
        price: parseFloat(price) || 0,
        image: image || null,
        description: description || null,
        numbers_total: 100,
        categoria_id: categoria_id ? parseInt(categoria_id) : null,
        nombre: title,
        precio: '$ ' + (parseFloat(raffle_price) || 0).toLocaleString('es-AR') + '-',
        imagen: image || null,
        descripcion: description || null,
        telefono: '5493416971479',
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
