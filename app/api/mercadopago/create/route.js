import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, price, quantity, currency_id, boleto_id, producto_id, organization_id, payer_email } = body;

    if (!title || !price) {
      return Response.json({ error: 'Faltan campos requeridos: title, price' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const preference = {
      items: [{
        title: title || 'Número de Rifa',
        unit_price: parseFloat(price),
        quantity: parseInt(quantity) || 1,
        currency_id: currency_id || 'ARS',
      }],
      payment_methods: {
        excluded_payment_types: [],
      },
      metadata: {
        boleto_id: boleto_id || null,
        producto_id: producto_id || null,
        organization_id: organization_id || null,
      },
      back_urls: {
        success: 'https://eco-rifas.vercel.app/app',
        failure: 'https://eco-rifas.vercel.app/app',
        pending: 'https://eco-rifas.vercel.app/app',
      },
      auto_return: 'approved',
      notification_url: 'https://eco-rifas.vercel.app/api/mercadopago/webhook',
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();

    if (mpRes.status !== 200 && mpRes.status !== 201) {
      return Response.json({ error: mpData.message || 'Error creando preferencia de pago' }, { status: 400 });
    }

    return Response.json({
      success: true,
      init_point: mpData.init_point,
      preference_id: mpData.id,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
