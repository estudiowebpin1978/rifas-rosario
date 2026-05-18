import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, imagen, images, price, precio, categoria_id, numbers_total } = body;

    if (!nombre || !precio) {
      return Response.json({ error: 'Faltan campos requeridos: nombre, precio' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Error de configuracion del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const totalNumeros = parseInt(numbers_total) || 100;
    const imagesJson = Array.isArray(images) ? JSON.stringify(images.filter(Boolean)) : null;
    const precioNum = parseFloat(precio) || 0;
    const precioFormatted = '$ ' + precioNum.toLocaleString('es-AR') + '-';

    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .insert([{
        nombre,
        descripcion: descripcion || null,
        imagen: imagen || null,
        precio: precioFormatted,
        categoria_id: categoria_id ? parseInt(categoria_id) : null,
        telefono: '5493412500029',
        finalizado: false,
        images: imagesJson,
        title: nombre,
        image: imagen || null,
        price: parseFloat(price) || 0,
        raffle_price: precioNum,
        numbers_total: totalNumeros
      }])
      .select('id')
      .single();

    if (errorProducto) {
      return Response.json({ error: 'Error al crear producto: ' + errorProducto.message }, { status: 400 });
    }

    const boletosInsert = [];
    for (let i = 1; i <= totalNumeros; i++) {
      boletosInsert.push({ numero: i, producto_id: producto?.id, estado: 'disponible' });
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
