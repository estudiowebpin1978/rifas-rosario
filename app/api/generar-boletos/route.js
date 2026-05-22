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

      const { data: existentes } = await supabase
        .from('boletos')
        .select('id')
        .eq('producto_id', producto_id)
        .limit(1);

      if (existentes && existentes.length > 0) {
        return Response.json({ success: true, message: 'El producto ya tiene boletos', count: 0 });
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

      return Response.json({ success: true, message: `Se generaron ${totalNums} boletos`, count: totalNums });
    }

    const { data: productos } = await supabase
      .from('productos')
      .select('id, numbers_total, title, nombre')
      .order('id', { ascending: false });

    // Fetch all boletos with pagination
    let todosBoletos = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: pageData, error: pageError } = await supabase
        .from('boletos')
        .select('producto_id')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (pageError || !pageData || pageData.length === 0) break;
      todosBoletos = [...todosBoletos, ...pageData];
      if (pageData.length < PAGE_SIZE) break;
      page++;
    }

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
