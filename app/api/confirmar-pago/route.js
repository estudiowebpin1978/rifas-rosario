import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { boleto_id, action } = body;

    if (!boleto_id || !action) {
      return Response.json({ error: 'boleto_id y action requeridos' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let updateData = {};
    
    if (action === 'confirmar') {
      updateData = { estado: 'vendido' };
    } else if (action === 'cancelar') {
      updateData = { estado: 'disponible', nombre: null, whatsapp: null };
    } else {
      return Response.json({ error: 'Action invalida. Usar: confirmar o cancelar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('boletos')
      .update(updateData)
      .eq('id', boleto_id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message, details: error }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}