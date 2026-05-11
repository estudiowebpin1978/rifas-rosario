import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const whatsapp = searchParams.get('whatsapp');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (whatsapp) {
      const { data } = await supabase
        .from('boletos')
        .select('numero, nombre, whatsapp, productos(nombre, imagen, precio, categoria_id)')
        .eq('whatsapp', whatsapp)
        .eq('estado', 'vendido');
      
      const wins = data?.filter(b => b.productos?.finalizado) || [];
      return Response.json({ wins });
    }
    
    return Response.json({ wins: [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { whatsapp, nombre, foto_url } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        whatsapp,
        nombre: nombre || 'Usuario',
        foto_url: foto_url || null,
        wins_count: 0
      }, { onConflict: 'whatsapp' })
      .select()
      .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true, profile: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}