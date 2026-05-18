import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, nombre, descripcion, imagen, precio, categoria_id } = body;

    if (!id || !nombre || !precio) {
      return Response.json({ error: 'Faltan campos requeridos: id, nombre, precio' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Error de configuracion del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .update({
        nombre,
        descripcion: descripcion || null,
        imagen: imagen || null,
        precio: '$ ' + (parseFloat(precio) || 0).toLocaleString('es-AR') + '-',
        categoria_id: categoria_id ? parseInt(categoria_id) : null
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (errorProducto) {
      return Response.json({ error: 'Error al actualizar producto: ' + errorProducto.message }, { status: 400 });
    }

    return Response.json({ success: true, producto });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
