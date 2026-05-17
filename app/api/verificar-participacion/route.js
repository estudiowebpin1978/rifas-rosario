import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const whatsapp = searchParams.get('whatsapp');
    const producto_id = searchParams.get('producto_id');

    if (!whatsapp || !producto_id) {
      return Response.json({ error: 'Se requiere whatsapp y producto_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: boletos, error } = await supabase
      .from('boletos')
      .select('*')
      .eq('producto_id', parseInt(producto_id))
      .eq('whatsapp', whatsapp)
      .eq('estado', 'vendido');

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      participa: boletos && boletos.length > 0,
      numeros: boletos || []
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
