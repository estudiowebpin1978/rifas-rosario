import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, precio, imagen, categoria_id, telefono } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .insert([{
        nombre,
        precio,
        imagen: imagen || null,
        categoria_id: categoria_id ? parseInt(categoria_id) : null,
        telefono: telefono || '5493416971479'
      }])
      .select()
      .single();

    if (errorProducto) {
      return Response.json({ error: errorProducto.message }, { status: 400 });
    }

    for (let i = 0; i < 100; i++) {
      await supabase.from('boletos').insert([{
        numero: i,
        producto_id: producto.id,
        estado: 'disponible'
      }]);
    }

    return Response.json({ success: true, producto });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}