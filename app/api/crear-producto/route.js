import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, images, price, raffle_price, numbers_total, categoria_id } = body;

    if (!title || !raffle_price) {
      return Response.json({ error: 'Faltan campos requeridos: title, raffle_price' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Error de configuracion del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const totalNumeros = parseInt(numbers_total) || 100;
    const imagesJson = Array.isArray(images) ? JSON.stringify(images.filter(Boolean)) : null;
    const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;

    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .insert([{
        title,
        description: description || null,
        image: firstImage || null,
        images: imagesJson,
        price: parseFloat(price) || 0,
        raffle_price: parseFloat(raffle_price) || 0,
        numbers_total: totalNumeros,
        categoria_id: categoria_id ? parseInt(categoria_id) : null,
        nombre: title,
        imagen: firstImage || null,
        precio: '$ ' + (parseFloat(raffle_price) || 0).toLocaleString('es-AR') + '-',
        telefono: '5493412500029'
      }])
      .select()
      .single();

    if (errorProducto) {
      return Response.json({ error: 'Error al crear producto: ' + errorProducto.message, details: errorProducto }, { status: 400 });
    }

    const boletosInsert = [];
    for (let i = 1; i <= totalNumeros; i++) {
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
