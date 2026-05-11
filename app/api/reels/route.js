import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false });
    return Response.json({ reels: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { titulo, video_url, thumbnail_url, tipo } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('reels')
      .insert([{ titulo, video_url, thumbnail_url, tipo: tipo || 'promo' }])
      .select()
      .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true, reel: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}