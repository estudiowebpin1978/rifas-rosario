import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: productos, error: prodError } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: false });
    
    const { data: categorias, error: catError } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true });
    
    const { data: boletos } = await supabase
      .from('boletos')
      .select('*');
    
    const productosConCategoria = productos.map(p => ({
      ...p,
      categorias: categorias.find(c => c.id === p.categoria_id) || null
    }));
    
    return Response.json({ 
      productos: productosConCategoria || [], 
      categorias: categorias || [],
      boletos: boletos || []
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json({ error: 'ID requerido' }, { status: 400 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase.from('boletos').delete().eq('producto_id', parseInt(id));
    const { error } = await supabase.from('productos').delete().eq('id', parseInt(id));
    
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}