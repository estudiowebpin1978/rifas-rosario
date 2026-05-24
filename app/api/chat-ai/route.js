const OPENAI_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_ADMIN = '5493412500029';
const ALIASES = ['eco.rifa', 'ecorifas', 'ecorifas.app'];

const SYSTEM_PROMPT = `Sos el asistente de Eco Rifas, rifas online argentinas.

REGLAS ABSOLUTAS:
- Respondé en español argento, breve, directo, con emojis.
- MÁXIMO 5 LÍNEAS por respuesta. Sin excepción.
- NUNCA liste todos los productos a menos que el usuario pregunte específicamente "qué productos hay" o "lista".
- Cuando te pregunten "cómo funciona" o al inicio, respondé SOLO con opciones numeradas tipo menú:

1️⃣ Cómo comprar
2️⃣ Cómo se sortea
3️⃣ Medios de pago
4️⃣ Ver productos disponibles

Sin explicar nada más hasta que elija una opción.
- Si elige una opción, respondé solo eso en 3 líneas máximo.
- Si elige "productos", recién ahí mostrá la lista.
- IMPORTANTE: Si después de responder una opción el usuario pregunta algo relacionado (ej: "y cuánto cuesta?", "y cómo pago?"), respondé naturalmente sin volver al menú.
- Solo volvé al menú si el usuario pide "menú", "volver" o saluda de nuevo.
- Siempre terminá con "💬 wa.me/${WHATSAPP_ADMIN}" si corresponde.
- NUNCA des más de una info por mensaje. Primero el menú, después el detalle, después seguí la conversación.

DATOS (usar solo cuando pregunten específicamente):
- 100 números del 00 al 99 por rifa
- Precio por número: el de cada producto
- Reserva 10 min, pagás por transferencia a ${ALIASES.join(', ')}
- Sorteo con Quiniela Nacional Nocturna (21hs), últimas 2 cifras
- Productos activos:
{productos_info}`;

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
    return '🎉 ¡Bienvenido! Elegí una opción:\n\n1️⃣ **Cómo comprar**\n2️⃣ **Cómo se sortea**\n3️⃣ **Medios de pago**\n4️⃣ **Ver productos**\n\nRespondé con el número o lo que quieras saber 👇';
  }

  if (msg === '1' || msg === '1️⃣' || msg.includes('comprar') || msg.includes('participar') || msg.includes('reservar') || msg.includes('registrarme')) {
    return '🛒 **Pasos:**\n1️⃣ Elegí una rifa\n2️⃣ Tocá tus números\n3️⃣ Pagá por transferencia\n4️⃣ Enviá el comprobante\n\n💬 wa.me/' + WHATSAPP_ADMIN;
  }

  if (msg === '2' || msg === '2️⃣' || msg.includes('sorteo') || msg.includes('quiniela') || msg.includes('ganador')) {
    return '🎰 Al venderse los 100 números, se toma la **Quiniela Nacional Nocturna** (21hs). Si tu número coincide con las últimas 2 cifras a la cabeza ... ¡ganaste! 🏆';
  }

  if (msg === '3' || msg === '3️⃣' || msg.includes('pago') || msg.includes('alias') || msg.includes('transfer') || msg.includes('medio')) {
    return '💳 Transferí a cualquiera:\n• `' + ALIASES[0] + '`\n• `' + ALIASES[1] + '`\n• `' + ALIASES[2] + '`\n\nEnvianos el comprobante y confirmamos ✅';
  }

  if (msg === '4' || msg === '4️⃣' || msg.includes('producto') || msg.includes('rifa') || msg.includes('hay') || msg.includes('disponible') || msg.includes('qué tenés') || msg.includes('lista') || msg.includes('precio') || msg.includes('cuánto') || msg.includes('costo') || msg.includes('vale') || msg.includes('cuesta')) {
    if (prod && prod.length > 0) {
      return '🎁 **Rifas activas:**\n' + prod.map(p => '• **' + p.title + '** $' + (p.price || 0).toLocaleString('es-AR') + '/num (' + (p.vendidos || 0) + '/' + (p.total || 100) + ')').join('\n') + '\n\n💬 wa.me/' + WHATSAPP_ADMIN;
    }
    return 'Ahora no hay rifas activas. Pronto vamos a tener más! 🎉';
  }

  if (msg.includes('gracias')) return 'De nada! 🍀 Suerte!';
  if (msg.includes('chau') || msg.includes('adiós') || msg.includes('bye')) return 'Chau! Cuando quieras saber algo, estoy acá 🤖';

  if (msg.includes('número') && (msg.includes('suerte') || msg.includes('elegir') || msg.includes('recomendá'))) {
    return 'Elegí fechas importantes o decime "dame un número" y te recomiendo uno 🎲';
  }

  if (msg.includes('precio') || msg.includes('cuánto cuesta') || msg.includes('costo') || msg.includes('vale') || msg.includes('cuesta')) {
    if (productos && productos.length > 0) {
      return '💰 Los precios varían según la rifa. Tocá "Ver productos" (opción 4) para verlos todos.\n\n💬 wa.me/' + WHATSAPP_ADMIN;
    }
    return 'Ahora no hay rifas activas. Pronto vamos a tener más! 🎉';
  }

  if ((msg.includes('cómo') || msg.includes('como') || msg.includes('que es') || msg.includes('qué es') || msg.includes('explica')) && !msg.includes('menú') && !msg.includes('menu') && !msg.includes('volver')) {
    if (productos && productos.length > 0) {
      return '💰 Los precios y detalles varían. Decime "4" y te muestro las rifas disponibles! 🎁\n\n💬 wa.me/' + WHATSAPP_ADMIN;
    }
    return 'Ahora no hay rifas activas. Pronto vamos a tener más! 🎉';
  }

  return 'Elegí:\n1️⃣ Cómo comprar\n2️⃣ Cómo se sortea\n3️⃣ Medios de pago\n4️⃣ Ver productos\n\n💬 wa.me/' + WHATSAPP_ADMIN;
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
