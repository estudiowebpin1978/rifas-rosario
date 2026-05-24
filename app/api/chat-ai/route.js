const OPENAI_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_ADMIN = '5493412500029';
const ALIASES = ['eco.rifa', 'ecorifas', 'ecorifas.app'];

const SYSTEM_PROMPT = `Sos el asistente virtual de Eco Rifas, una plataforma de rifas online argentina.

REGLAS:
- Respondé siempre en español argentino, amigable, entusiasta, con emojis.
- Sé breve y directo. Máximo 3 párrafos por respuesta.
- Nunca inventes precios ni productos que no están en la lista que te pasan.
- Si te preguntan algo que no sabés, decí "Consultá con el vendedor al WhatsApp".

INFORMACIÓN SOBRE ECO RIFAS:
- Cada rifa tiene 100 números numerados del 00 al 99.
- Cada número vale el precio publicado en la rifa.
- Podés reservar 1 o varios números.
- Una vez que elegís tus números, los reservás por 10 minutos.
- Pagás por transferencia a uno de estos alias: ${ALIASES.join(', ')}.
- Enviás el comprobante al WhatsApp del administrador.
- El administrador confirma el pago y tus números quedan confirmados.
- Cuando se venden los 100 números, se realiza el sorteo automático.
- El sorteo usa la Quiniela Nacional Nocturna (21hs).
- El ganador se define con las últimas 2 cifras de la cabeza de la Quiniela.
- Si tenés el número que coincide con esas 2 cifras, ganás.
- El resultado es 100% transparente y verificable.

PRODUCTOS ACTIVOS (disponibles para comprar):
{productos_info}

Si el usuario quiere comprar, decile que:
1. Elija un producto de la lista
2. Seleccione sus números de la suerte
3. Reserve y pague al alias que se le indique
4. Envíe el comprobante al WhatsApp del administrador

SIEMPRE al final de cada respuesta sobre un producto específico, agregá:
"💬 Si querés comprar, hablá directo con el vendedor: wa.me/${WHATSAPP_ADMIN}"`;

function buildProductList(productos) {
  if (!productos || productos.length === 0) return 'No hay productos activos en este momento.';
  return productos.map(p =>
    `- ${p.title}: $${(p.price || 0).toLocaleString('es-AR')}- por número. Vendidos: ${p.vendidos || 0}/${p.total || 100}.`
  ).join('\n');
}

function generateFallbackResponse(userMsg, productos) {
  const msg = userMsg.toLowerCase();
  const prod = productos && productos.length > 0 ? productos : null;

  if (msg.includes('hola') || msg.includes('buenas') || msg.includes('qué tal') || msg.includes('como funciona')) {
    let r = '🎉 ¡Bienvenido a **Eco Rifas**!\n\n*¿Cómo funciona?*\n• Elegí una rifa de la lista\n• Seleccioná tus números de la suerte (del 00 al 99)\n• Reservalos y pagás por transferencia\n• Cuando se vendan los 100, se sortea con la Quiniela Nacional Nocturna\n• Si tu número coincide con las últimas 2 cifras... ¡GANASTE! 🏆\n\n💬 Hablá con el vendedor: wa.me/' + WHATSAPP_ADMIN;
    if (prod) r += '\n\n📦 Productos activos:\n' + prod.map(p => '• ' + p.title + ' - $' + (p.price || 0).toLocaleString('es-AR') + '/num').join('\n');
    return r;
  }

  if (msg.includes('pago') || msg.includes('alias') || msg.includes('transfer') || msg.includes('cómo pago') || msg.includes('medio de pago')) {
    return '💳 **Medios de pago:**\n\nHacé una transferencia a cualquiera de estos alias:\n• `' + ALIASES[0] + '`\n• `' + ALIASES[1] + '`\n• `' + ALIASES[2] + '`\n\nDespués envianos el comprobante al WhatsApp y confirmamos tu reserva al toque ✅\n\n💬 wa.me/' + WHATSAPP_ADMIN;
  }

  if (msg.includes('sorteo') || msg.includes('quiniela') || msg.includes('cómo se sortea') || msg.includes('ganador')) {
    return '🎰 **¿Cómo se sortea?**\n\nCuando se venden los 100 números, el sistema toma las **últimas 2 cifras de la cabeza de la Quiniela Nacional Nocturna** (sorteo de las 21hs).\n\nSi tu número coincide con esas 2 cifras... ¡SOS EL GANADOR! 🏆\n\nEs 100% transparente y verificable por cualquiera.';
  }

  if (msg.includes('precio') || msg.includes('cuánto') || msg.includes('costo') || msg.includes('vale') || msg.includes('cuesta')) {
    if (prod && prod.length > 0) {
      return '💰 **Precios de las rifas activas:**\n\n' + prod.map(p => '• ' + p.title + ': **$' + (p.price || 0).toLocaleString('es-AR') + '** por número (' + (p.vendidos || 0) + '/' + (p.total || 100) + ' vendidos)').join('\n') + '\n\n💬 wa.me/' + WHATSAPP_ADMIN;
    }
    return 'Mirá los productos disponibles en la app y sus precios. 💬 Consultá al vendedor: wa.me/' + WHATSAPP_ADMIN;
  }

  if (msg.includes('producto') || msg.includes('rifa') || msg.includes('hay') || msg.includes('disponible') || msg.includes('qué tenés') || msg.includes('lista')) {
    if (prod && prod.length > 0) {
      return '🎁 **Rifas activas:**\n\n' + prod.map(p => '• **' + p.title + '** - $' + (p.price || 0).toLocaleString('es-AR') + '/num (' + (p.vendidos || 0) + '/' + (p.total || 100) + ' vendidos)').join('\n') + '\n\nElegí la que más te guste y participá! 🍀\n\n💬 wa.me/' + WHATSAPP_ADMIN;
    }
    return 'Ahora no hay rifas activas, pero pronto vamos a tener más. Seguinos en la app! 🎉';
  }

  if (msg.includes('cómo compro') || msg.includes('quiero comprar') || msg.includes('participar') || msg.includes('reservar') || msg.includes('registrarme')) {
    return '🛒 **Pasá para comprar:**\n\n1️⃣ Elegí una rifa de las disponibles\n2️⃣ Tocá los números que te gusten\n3️⃣ Completá tus datos\n4️⃣ Pagá por transferencia a uno de estos alias:\n   `' + ALIASES[0] + '`\n   `' + ALIASES[1] + '`\n   `' + ALIASES[2] + '`\n5️⃣ Envianos el comprobante por WhatsApp\n\n¡Y listo! Ya estás participando 🎉\n\n💬 wa.me/' + WHATSAPP_ADMIN;
  }

  if (msg.includes('gracias') || msg.includes('graciass')) {
    return '¡De nada! 😊 Cualquier duda que tengas, acá estoy. ¡Suerte en el sorteo! 🍀🎉';
  }

  if (msg.includes('número') && (msg.includes('suerte') || msg.includes('elegir') || msg.includes('recomendá') || msg.includes('cuál'))) {
    return '🔢 **Números de la suerte:**\n\nAlgunos eligen fechas importantes (cumpleaños, aniversarios), otros prefieren números que les hayan dado suerte antes.\n\nSi querés un número al azar, decime "dame un número" y te recomiendo uno! 🎲';
  }

  return '¡Hola! 😊 En **Eco Rifas** podés ganar premios increíbles por muy poco.\n\n' +
    (prod && prod.length > 0 ? '🎁 Tenemos ' + prod.length + ' rifa' + (prod.length > 1 ? 's' : '') + ' activa' + (prod.length > 1 ? 's' : '') + ':\n' + prod.map(p => '• ' + p.title + ' - $' + (p.price || 0).toLocaleString('es-AR') + '/num').join('\n') + '\n\n' : '') +
    '¿Qué querés saber?\n• ¿Cómo funciona?\n• ¿Cuánto cuesta?\n• ¿Cómo se sortea?\n• ¿Cómo compro?\n\n💬 wa.me/' + WHATSAPP_ADMIN;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, producto_id, producto_info, user_name, productos_activos } = body;

    if (!message || !message.trim()) {
      return Response.json({ response: 'Decime algo! 😊' });
    }

    const productListStr = buildProductList(productos_activos);
    const systemPrompt = SYSTEM_PROMPT.replace('{productos_info}', productListStr);

    if (OPENAI_KEY) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + OPENAI_KEY
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        const data = await res.json();
        if (data.choices && data.choices[0]) {
          const reply = data.choices[0].message.content.trim();
          const hasProductLink = reply.includes('wa.me/');
          return Response.json({
            response: reply,
            product_suggestions: hasProductLink && productos_activos ? productos_activos.slice(0, 3) : null
          });
        }
      } catch (e) {
        console.error('OpenAI error:', e);
      }
    }

    const reply = generateFallbackResponse(message, productos_activos);
    const hasProductLink = reply.includes('wa.me/');
    return Response.json({
      response: reply,
      product_suggestions: hasProductLink && productos_activos ? productos_activos.slice(0, 3) : null
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
