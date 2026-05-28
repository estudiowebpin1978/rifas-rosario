import { createClient } from '@supabase/supabase-js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: productos, error: prodErr } = await supabase
    .from('productos')
    .select('id, precio')
    .eq('finalizado', false);

  if (prodErr) return Response.json({ error: prodErr.message }, { status: 500 });

  const results = [];

  for (const prod of productos) {
    const { data: disponibles } = await supabase
      .from('boletos')
      .select('id, numero')
      .eq('producto_id', prod.id)
      .eq('estado', 'disponible');

    if (!disponibles || disponibles.length === 0) continue;

    const count = Math.floor(Math.random() * 3) + 5; // 5-7
    const toReserve = shuffle(disponibles).slice(0, Math.min(count, disponibles.length));

    for (const b of toReserve) {
      const { error: updErr } = await supabase
        .from('boletos')
        .update({
          estado: 'reservado',
          nombre: 'georchina348@gmail.com',
          whatsapp: '3416971479',
        })
        .eq('id', b.id);

      if (updErr) {
        results.push({ producto_id: prod.id, numero: b.numero, error: updErr.message });
        continue;
      }

      await supabase.from('pagos').insert({
        boleto_id: b.id,
        producto_id: prod.id,
        numero: b.numero,
        nombre: 'georchina348@gmail.com',
        whatsapp: '3416971479',
        monto: parseInt(prod.precio) || 0,
        alias_usado: 'eco.rifa',
        comprobante_url: '',
        estado: 'pendiente',
      });
    }

    results.push({
      producto_id: prod.id,
      reservados: toReserve.length,
      numeros: toReserve.map(b => b.numero),
    });
  }

  return Response.json({ success: true, results });
}
