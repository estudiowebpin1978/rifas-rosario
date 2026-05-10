import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase.from('productos').select('*, categorias(nombre)').order('created_at', { ascending: false });
    
    if (categoria) {
      query = query.eq('categoria_id', parseInt(categoria));
    }
    
    const { data: productos, error } = await query;
    
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    
    return Response.json({ productos });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}