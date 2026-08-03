import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return e;
  }

  try {
    const body = await request.json();
    const { producto_id } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (producto_id) {
      const { data: producto } = await supabase
        .from('productos')
        .select('id, numbers_total, title, nombre')
        .eq('id', producto_id)
        .single();

      if (!producto) {
        return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
      }

      const { data: existentes } = await supabase
        .from('boletos')
        .select('id')
        .eq('producto_id', producto_id)
        .limit(1);

      if (existentes && existentes.length > 0) {
        return Response.json({ success: true, message: 'El producto ya tiene boletos', count: 0 });
      }

      const totalNums = Math.min(producto.numbers_total || 100, 1000);
      const toInsert = [];
      for (let i = 1; i <= totalNums; i++) {
        toInsert.push({ numero: i, producto_id: producto.id, estado: 'disponible' });
      }

      const { error: insertError } = await supabase.from('boletos').insert(toInsert);

      if (insertError) {
        return Response.json({ error: 'Error al generar boletos' }, { status: 400 });
      }

      return Response.json({ success: true, message: `Se generaron ${totalNums} boletos`, count: totalNums });
    }

    return Response.json({ error: 'producto_id requerido' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
