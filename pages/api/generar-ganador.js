'use server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req) {
  const { producto_id } = await req.json();
  if (!producto_id) return new Response(JSON.stringify({ error: 'producto_id required' }), { status: 400 });

  // 1️⃣  Verify product exists and is not already finalized
  const { data: prod, error: prodErr } = await supabase
    .from('productos')
    .select('id, finalizado')
    .eq('id', producto_id)
    .single();
  if (prodErr || !prod) return new Response(JSON.stringify({ error: 'producto no encontrado' }), { status: 404 });
  if (prod.finalizado) return new Response(JSON.stringify({ mensaje: 'ya finalizado' }), { status: 200 });

  // 2️⃣  Count vendidos tickets for the product
  const { count, error: cntErr } = await supabase
    .from('boletos')
    .select('id', { count: 'exact', head: true })
    .eq('producto_id', producto_id)
    .eq('estado', 'vendido');
  if (cntErr) return new Response(JSON.stringify({ error: cntErr.message }), { status: 500 });
  if (count < 100) return new Response(JSON.stringify({ mensaje: 'todavía no está vendido' }), { status: 200 });

  // 3️⃣  Fetch latest Quiniela two‑digit result
  let quinielaNum = null;
  try {
    const res = await fetch('https://quinielanacional1.com.ar/api/ultimo');
    const json = await res.json();
    // Assuming the API returns { numero: "23" } or similar
    quinielaNum = json.numero || json.num || json.resultado;
  } catch (e) {
    console.error('Error fetching quiniela', e);
    return new Response(JSON.stringify({ error: 'no se pudo obtener quiniela' }), { status: 502 });
  }
  if (!quinielaNum) return new Response(JSON.stringify({ error: 'quiniela sin número' }), { status: 502 });

  // 4️⃣  Update product with winner info
  const { error: updErr } = await supabase
    .from('productos')
    .update({ finalizado: true, ganador_num: quinielaNum })
    .eq('id', producto_id);
  if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });

  // 5️⃣  Simple toast message for admin (frontend will read the response and show toast)
  return new Response(JSON.stringify({ mensaje: 'ganador asignado', ganador_num: quinielaNum }), { status: 200 });
}
