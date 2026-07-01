import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, imagen, images, precio, categoria_id, numbers_total, organization_id } = body;

    if (!nombre || !precio) {
      return Response.json({ error: 'Faltan campos requeridos: nombre, precio' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Error de configuracion del servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (organization_id) {
      const { data: org } = await supabase
        .from('organizaciones')
        .select('id, plan')
        .eq('id', organization_id)
        .single();

      if (!org) {
        return Response.json({ error: 'Organización no encontrada' }, { status: 404 });
      }

      const { data: plan } = await supabase
        .from('planes')
        .select('max_rifas')
        .eq('slug', org.plan || 'free')
        .single();

      const { count } = await supabase
        .from('productos')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id);

      if (plan && count >= (plan.max_rifas || 3)) {
        return Response.json({ error: `Tu plan ${org.plan} permite máximo ${plan.max_rifas} rifas. Mejorá tu plan para crear más.` }, { status: 403 });
      }
    }

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
        raffle_price: precioNum,
        numbers_total: totalNumeros,
        organization_id: organization_id || null,
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

    if (organization_id) {
      const { count } = await supabase
        .from('productos')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id);

      await supabase
        .from('organizaciones')
        .update({ total_rifas: count || 1 })
        .eq('id', organization_id);
    }

    return Response.json({ success: true, producto });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
