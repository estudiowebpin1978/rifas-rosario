import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function PATCH(request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return e;
  }

  try {
    const body = await request.json();
    const { id, nombre, descripcion, imagen, images, price, precio, categoria_id } = body;

    if (!id || !nombre || !precio) {
      return Response.json({ error: 'Faltan campos requeridos: id, nombre, precio' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Error de configuracion del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const precioNum = parseFloat(precio) || 0;
    const imagesJson = Array.isArray(images) ? JSON.stringify(images.filter(Boolean)) : null;

    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .update({
        nombre,
        descripcion: descripcion || null,
        imagen: imagen || null,
        images: imagesJson,
        precio: '$ ' + precioNum.toLocaleString('es-AR') + '-',
        categoria_id: categoria_id ? parseInt(categoria_id) : null,
        title: nombre,
        image: imagen || null,
        price: parseFloat(price) || 0,
        raffle_price: precioNum
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (errorProducto) {
      return Response.json({ error: 'Error al actualizar producto' }, { status: 400 });
    }

    return Response.json({ success: true, producto });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
