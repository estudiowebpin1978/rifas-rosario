import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { numero, producto_id, nombre, whatsapp } = body;

    if (!numero || !producto_id) {
      return Response.json({ error: 'numero y producto_id requeridos' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('boletos')
      .update({ 
        estado: 'reservado', 
        nombre: nombre || '', 
        whatsapp: whatsapp || '' 
      })
      .eq('numero', numero)
      .eq('producto_id', producto_id)
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