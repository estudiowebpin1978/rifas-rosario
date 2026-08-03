import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const UALA_ORDER_STATUS_URL = 'https://checkout.developers.ar.ua.la/v2/api/orders';

function verifyUalaSignature(payload, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return expected === signature;
}

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-ua-signature') || req.headers.get('x-webhook-signature') || '';
    const webhookSecret = process.env.UALA_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('UALA_WEBHOOK_SECRET not configured');
      return NextResponse.json({ ok: true });
    }

    if (!verifyUalaSignature(rawBody, signature, webhookSecret)) {
      console.error('Uala webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { status, referenceId, externalReference } = body;

    if (!referenceId) {
      return NextResponse.json({ error: 'No referenceId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const boleto_id = Number(referenceId);
    const producto_id = Number(externalReference);

    if (status === 'approved' || status === 'paid' || status === 'completed') {
      const { data: existing } = await supabase
        .from('boletos')
        .select('id, estado')
        .eq('id', boleto_id)
        .single();

      if (existing && existing.estado !== 'vendido') {
        await supabase
          .from('boletos')
          .update({ estado: 'vendido' })
          .eq('id', boleto_id);

        if (producto_id) {
          const { data: producto } = await supabase
            .from('productos')
            .select('id, organization_id, raffle_price')
            .eq('id', producto_id)
            .single();

          if (producto) {
            const monto = producto.raffle_price || 0;

            const { data: org } = await supabase
              .from('organizaciones')
              .select('commission_pct')
              .eq('id', producto.organization_id)
              .single();

            const comision_pct = org?.commission_pct || 15;
            const monto_comision = Math.round(monto * comision_pct / 100);

            await supabase.from('pagos_organizacion').insert({
              organizacion_id: producto.organization_id,
              monto: monto,
              metodo: 'uala',
              estado: 'completado',
            }).select();

            await supabase.from('comisiones').insert({
              organizacion_id: producto.organization_id,
              producto_id: producto_id,
              monto_venta: monto,
              comision_pct: comision_pct,
              comision_monto: monto_comision,
              estado: 'pendiente',
            }).select();
          }
        }

        try {
          const { data: boleto } = await supabase
            .from('boletos')
            .select('numero')
            .eq('id', boleto_id)
            .single();

          if (producto_id && boleto) {
            const { data: config } = await supabase
              .from('rifa_config')
              .select('*')
              .eq('producto_id', producto_id)
              .single();

            if (config) {
              const { data: pagados } = await supabase
                .from('boletos')
                .select('id')
                .eq('producto_id', producto_id)
                .eq('estado', 'vendido');

              const { data: configCompleta } = await supabase
                .from('rifa_config')
                .select('*')
                .eq('producto_id', producto_id)
                .single();

              const minBoletos = configCompleta?.min_boletos || 20;
              if (pagados && pagados.length >= minBoletos) {
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://eco-rifas.vercel.app'}/api/sortear`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ producto_id }),
                }).catch(() => {});
              }
            }
          }
        } catch {
          // Auto-sorteo check failed silently
        }
      }
    } else if (status === 'rejected' || status === 'failed' || status === 'cancelled') {
      await supabase
        .from('boletos')
        .update({ estado: 'disponible' })
        .eq('id', boleto_id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
