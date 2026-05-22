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
    
    if (prodError) {
      return Response.json({ error: prodError.message }, { status: 400 });
    }
    
    const { data: categorias, error: catError } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true });
    
    let { data: boletos } = await supabase
      .from('boletos')
      .select('*')
      .range(0, 1000000);
    
    // Auto-generate boletos for products missing them
    if (boletos) {
      for (const p of productos) {
        const hasBoletos = boletos.some(b => b.producto_id == p.id);
        if (!hasBoletos) {
          const totalNums = p.numbers_total || 100;
          const toInsert = [];
          for (let i = 1; i <= totalNums; i++) {
            toInsert.push({ numero: i, producto_id: p.id, estado: 'disponible' });
          }
          const { error: bolError } = await supabase.from('boletos').insert(toInsert);
          if (!bolError) {
            boletos = [...boletos, ...toInsert];
          }
        }
      }
    }
    
    const productosConCategoria = productos.map(p => ({
      ...p,
      categorias: categorias.find(c => c.id === p.categoria_id) || null,
      title: p.title || p.nombre,
      description: p.description || p.descripcion,
      image: p.image || p.imagen,
      price: p.price || 0,
      raffle_price: p.raffle_price || parseInt(String(p.precio || '0').replace(/[^0-9]/g,'')) || 0,
      numbers_total: p.numbers_total || 100,
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
