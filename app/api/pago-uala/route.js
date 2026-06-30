import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const UALA_AUTH_URL = 'https://auth.developers.ar.ua.la/v2/api/auth/token';
const UALA_CHECKOUT_URL = 'https://checkout.developers.ar.ua.la/v2/api/checkout';

async function getUalaToken() {
  const res = await fetch(UALA_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.UALA_CLIENT_ID,
      client_secret_id: process.env.UALA_CLIENT_SECRET,
      username: process.env.UALA_USERNAME,
    }),
  });
  if (!res.ok) throw new Error('Uala auth failed');
  const data = await res.json();
  return data.access_token;
}

export async function POST(req) {
  try {
    const { producto_id, boleto_id, monto, titulo, descripcion, quantity } = await req.json();

    if (!producto_id || !boleto_id || !monto) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: producto } = await supabase
      .from('productos')
      .select('id, organization_id')
      .eq('id', producto_id)
      .single();

    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://eco-rifas.vercel.app'}/api/webhooks/uala`;

    const token = await getUalaToken();

    const checkoutBody = {
      referenceId: String(boleto_id),
      externalReference: String(producto_id),
      concept: titulo || 'Boleto EcoRifas',
      amount: monto,
      quantity: quantity || 1,
      currency: 'ARS',
      webhook: {
        url: webhookUrl,
      },
      metadata: {
        organization_id: producto?.organization_id || '',
        producto_id,
        boleto_id,
      },
    };

    const res = await fetch(UALA_CHECKOUT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(checkoutBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Uala checkout error:', errText);
      return NextResponse.json({ error: 'Error creating checkout', details: errText }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({
      checkoutUrl: data.checkoutUrl || data.init_point || data.redirect_url,
      id: data.id,
    });
  } catch (e) {
    console.error('Pago Uala error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
