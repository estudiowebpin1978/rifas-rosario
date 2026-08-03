import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'payment.created' || action === 'payment.updated') {
      const paymentId = data?.id;
      if (!paymentId) return Response.json({ ok: true });

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: existingPayment } = await supabase
        .from('pagos_mp')
        .select('id, estado')
        .eq('payment_id', String(paymentId))
        .single();

      if (existingPayment && existingPayment.estado === 'aprobado') {
        return Response.json({ ok: true });
      }

      const { data: payment } = await supabase
        .from('pagos_mp')
        .upsert([{
          payment_id: String(paymentId),
          boleto_id: data?.metadata?.boleto_id || null,
          producto_id: data?.metadata?.producto_id || null,
          organizacion_id: data?.metadata?.organization_id || null,
          monto: data?.transaction_amount || 0,
          estado: data?.status === 'approved' ? 'aprobado' : data?.status || 'pendiente',
          metadata: data || {},
        }], { onConflict: 'payment_id' })
        .select()
        .single();

      if (data?.status === 'approved' && payment) {
        if (payment.boleto_id) {
          await supabase
            .from('boletos')
            .update({ estado: 'vendido' })
            .eq('id', payment.boleto_id);

          const { data: boleto } = await supabase
            .from('boletos')
            .select('producto_id')
            .eq('id', payment.boleto_id)
            .single();

          if (boleto) {
            const { count } = await supabase
              .from('boletos')
              .select('*', { count: 'exact', head: true })
              .eq('producto_id', boleto.producto_id)
              .eq('estado', 'vendido');

            const { data: prod } = await supabase
              .from('productos')
              .select('raffle_price, organization_id, numbers_total')
              .eq('id', boleto.producto_id)
              .single();

            if (prod && prod.organization_id) {
              const { data: org } = await supabase
                .from('organizaciones')
                .select('commission_pct')
                .eq('id', prod.organization_id)
                .single();
              const comisionPct = org?.commission_pct || 15;
              await supabase.from('comisiones').insert([{
                organizacion_id: prod.organization_id,
                producto_id: boleto.producto_id,
                monto_venta: prod.raffle_price || 0,
                comision_pct: comisionPct,
                comision_monto: Math.round((prod.raffle_price || 0) * comisionPct / 100),
                estado: 'pendiente',
              }]);
            }

            if (prod && count >= (prod.numbers_total || 100)) {
              await supabase
                .from('productos')
                .update({ finalizado: true })
                .eq('id', boleto.producto_id);
            }
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}

export async function GET() {
  return Response.json({ ok: true, message: 'Mercado Pago webhook active' });
}
