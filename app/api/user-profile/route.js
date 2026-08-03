import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const whatsapp = searchParams.get('whatsapp');

    if (!whatsapp) {
      return Response.json({ error: 'whatsapp requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data } = await supabase
      .from('boletos')
      .select('numero, nombre, whatsapp, productos(nombre, imagen, precio, categoria_id, finalizado)')
      .eq('whatsapp', whatsapp)
      .eq('estado', 'vendido');

    const wins = data?.filter(b => b.productos?.finalizado) || [];
    return Response.json({ wins });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
  } catch (e) {
    return e;
  }

  try {
    const { whatsapp, nombre, foto_url } = await request.json();

    if (!whatsapp) {
      return Response.json({ error: 'whatsapp requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        whatsapp,
        nombre: nombre?.slice(0, 100) || 'Usuario',
        foto_url: foto_url || null,
      }, { onConflict: 'whatsapp' })
      .select()
      .single();

    if (error) return Response.json({ error: 'Error al actualizar perfil' }, { status: 400 });
    return Response.json({ success: true, profile: data });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
