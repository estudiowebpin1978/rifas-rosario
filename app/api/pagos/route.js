import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function POST(request) {
  try {
    await requireAuth(request);
  } catch (e) {
    return e;
  }

  try {
    const body = await request.json();
    const { boleto_id, producto_id, numero, nombre, whatsapp, monto, alias_usado, comprobante_url } = body;

    if (!numero || !producto_id) {
      return Response.json({ error: 'numero y producto_id requeridos' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: producto } = await supabase
      .from('productos')
      .select('raffle_price')
      .eq('id', producto_id)
      .single();

    const serverMonto = producto?.raffle_price || parseFloat(monto) || 0;

    const { data, error } = await supabase.from('pagos').insert({
      boleto_id: boleto_id || null,
      producto_id,
      numero,
      nombre: nombre || '',
      whatsapp: whatsapp || '',
      monto: serverMonto,
      alias_usado: alias_usado || '',
      comprobante_url: comprobante_url || '',
      estado: 'pendiente'
    }).select().single();

    if (error) {
      return Response.json({ error: 'Error al registrar pago' }, { status: 400 });
    }

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return e;
  }

  try {
    const { searchParams } = new URL(request.url);
    const producto_id = searchParams.get('producto_id');
    const estado = searchParams.get('estado');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = supabase.from('pagos').select('*').order('created_at', { ascending: false });

    if (producto_id) query = query.eq('producto_id', parseInt(producto_id));
    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: 'Error al obtener pagos' }, { status: 400 });
    }

    return Response.json({ success: true, data: data || [] });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return e;
  }

  try {
    const body = await request.json();
    const { id, boleto_id, estado } = body;

    if (!estado) {
      return Response.json({ error: 'estado requerido' }, { status: 400 });
    }

    if (!['pendiente', 'confirmado', 'cancelado'].includes(estado)) {
      return Response.json({ error: 'Estado invalido' }, { status: 400 });
    }

    if (!id && !boleto_id) {
      return Response.json({ error: 'id o boleto_id requerido' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = supabase.from('pagos').update({ estado, updated_at: new Date().toISOString() });
    if (id) query = query.eq('id', id);
    else query = query.eq('boleto_id', boleto_id);

    const { data, error } = await query.select().single();

    if (error) {
      return Response.json({ error: 'Error al actualizar pago' }, { status: 400 });
    }

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
