import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
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

      const { data: existentes, error: checkError } = await supabase
        .from('boletos')
        .select('id, producto_id')
        .eq('producto_id', producto_id)
        .limit(3);

      if (existentes && existentes.length > 0) {
        return Response.json({
          success: true,
          message: `El producto ya tiene ${existentes.length} boletos (IDs: ${existentes.map(e => e.id).join(',')}, prod_ids: ${existentes.map(e => e.producto_id).join(',')})`,
          count: 0,
          debug: { existentes, checkError: checkError?.message }
        });
      }

      const totalNums = producto.numbers_total || 100;
      const toInsert = [];
      for (let i = 1; i <= totalNums; i++) {
        toInsert.push({ numero: i, producto_id: producto.id, estado: 'disponible' });
      }

      const { error: insertError } = await supabase.from('boletos').insert(toInsert);

      if (insertError) {
        return Response.json({ error: 'Error al generar boletos: ' + insertError.message }, { status: 400 });
      }

      return Response.json({ success: true, message: `Se generaron ${totalNums} boletos para producto ${producto.id} "${producto.title || producto.nombre}"`, count: totalNums });
    }

    const { data: productos } = await supabase
      .from('productos')
      .select('id, numbers_total, title, nombre')
      .order('id', { ascending: false });

    const { data: todosBoletos } = await supabase
      .from('boletos')
      .select('producto_id')
      .limit(1000000);

    let generados = 0;
    const resultados = [];

    for (const p of productos) {
      const existeBoleto = todosBoletos?.some(b => b.producto_id == p.id);
      if (!existeBoleto) {
        const totalNums = p.numbers_total || 100;
        const toInsert = [];
        for (let i = 1; i <= totalNums; i++) {
          toInsert.push({ numero: i, producto_id: p.id, estado: 'disponible' });
        }
        const { error: insertError } = await supabase.from('boletos').insert(toInsert);
        if (!insertError) {
          generados += totalNums;
          resultados.push({ id: p.id, nombre: p.title || p.nombre, boletos: totalNums });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Se generaron boletos para ${resultados.length} productos (${generados} boletos)`,
      productos: resultados
    });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
