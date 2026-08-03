import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const producto_id = searchParams.get('producto_id');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('chat_messages')
      .select('*');

    if (producto_id) {
      query = query.eq('producto_id', parseInt(producto_id));
    }

    const { data: messages, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return Response.json({ error: 'Error al obtener mensajes' }, { status: 400 });
    }

    return Response.json({ messages: messages || [] });
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
    const body = await request.json();
    const { user_id, user_name, message, image_url, producto_id, whatsapp } = body;

    if (!message && !image_url) {
      return Response.json({ error: 'Se requiere un mensaje o imagen' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let is_winner = false;
    if (producto_id && whatsapp) {
      const { data: userWins } = await supabase
        .from('boletos')
        .select('id')
        .eq('producto_id', parseInt(producto_id))
        .eq('whatsapp', whatsapp)
        .eq('estado', 'vendido');
      is_winner = userWins && userWins.length > 0;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: user_id || null,
        user_name: user_name || 'Anónimo',
        message: message?.slice(0, 1000) || null,
        image_url: image_url || null,
        producto_id: producto_id ? parseInt(producto_id) : null,
        is_winner: is_winner
      }])
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Error al enviar mensaje' }, { status: 400 });
    }

    return Response.json({ success: true, message: data });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
