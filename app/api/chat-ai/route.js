const OPENAI_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_ADMIN = '5493412500029';
const ALIASES = ['eco.rifa', 'ecorifas', 'ecorifas.app'];
const APP_URL = 'https://eco-rifas.vercel.app/app';

const SYSTEM_PROMPT = `Sos el asistente de Eco Rifas, rifas online argentinas.

REGLAS:
- Respondé en español argento, breve, directo, con emojis.
- MÁXIMO 5 LÍNEAS por respuesta.
- Respondé naturalmente a lo que pregunte, sin forzar un menú.
- Si pregunta "cómo funciona", "qué hacen", o parece perdido, mostrale el menú:
  1️⃣ Cómo comprar  2️⃣ Cómo se sortea  3️⃣ Medios de pago  4️⃣ Ver productos
- Si pregunta sobre productos/precios (opción 4), decile: "Mirá todas las rifas acá: ${APP_URL}" — no listes productos.
- Si pregunta cómo comprar, explicá los pasos.
- Si pregunta del sorteo, explicá la Quiniela Nocturna.
- Si pregunta medios de pago, decile los alias.
- Si después de responder el usuario sigue preguntando, segui la conversación natural.
- Solo volvé al menú si el usuario pide "menú", "volver", o no se entiende qué quiere.
- Terminá con "💬 wa.me/${WHATSAPP_ADMIN}" si corresponde.

DATOS:
- 100 números del 00 al 99 por rifa
- Precio por número: el de cada producto
- Reserva 10 min, pagás por transferencia a ${ALIASES.join(', ')}
- Sorteo con Quiniela Nacional Nocturna (21hs), últimas 2 cifras`;

function generateFallbackResponse(userMsg, productos) {
  const msg = userMsg.toLowerCase();
  const prod = productos && productos.length > 0 ? productos : null;

  if (msg.includes('hola') || msg.includes('buenas') || msg.includes('qué tal') || msg.includes('como estas')) {
    return '¡Hola! 👋 ¿En qué te puedo ayudar? Preguntame lo que quieras sobre las rifas 🎰';
  }

  if (msg.includes('como funciona') || msg.includes('cómo funciona') || msg.includes('que hacen') || msg.includes('qué hacen') || msg.includes('no entiendo') || msg.includes('ayuda') || msg.includes('help') || msg.includes('menú') || msg.includes('menu') || msg.includes('opciones')) {
    return '🎉 Elegí una opción:\n\n1️⃣ **Cómo comprar**\n2️⃣ **Cómo se sortea**\n3️⃣ **Medios de pago**\n4️⃣ **Ver productos**\n\nO preguntame lo que quieras 👇';
  }

  if (msg === '1' || msg === '1️⃣' || msg.includes('comprar') || msg.includes('participar') || msg.includes('reservar') || msg.includes('registrarme') || msg.includes('como hago')) {
    return '🛒 **Pasos:**\n1️⃣ Elegí una rifa\n2️⃣ Tocá tus números\n3️⃣ Pagá por transferencia\n4️⃣ Enviá el comprobante\n\n💬 wa.me/' + WHATSAPP_ADMIN;
  }

  if (msg === '2' || msg === '2️⃣' || msg.includes('sorteo') || msg.includes('quiniela') || msg.includes('ganador') || msg.includes('como se sortea') || msg.includes('cómo se sortea')) {
    return '🎰 Al venderse los 100 números, se toma la **Quiniela Nacional Nocturna** (21hs). Si tu número coincide con las últimas 2 cifras a la cabeza ... ¡ganaste! 🏆';
  }

  if (msg === '3' || msg === '3️⃣' || msg.includes('pago') || msg.includes('alias') || msg.includes('transfer') || msg.includes('medio') || msg.includes('pagar') || msg.includes('transferencia')) {
    return '💳 Transferí a cualquiera:\n• `' + ALIASES[0] + '`\n• `' + ALIASES[1] + '`\n• `' + ALIASES[2] + '`\n\nEnvianos el comprobante y confirmamos ✅';
  }

  if (msg === '4' || msg === '4️⃣' || msg.includes('producto') || msg.includes('productos') || msg.includes('rifa') || msg.includes('hay') || msg.includes('disponible') || msg.includes('qué tenés') || msg.includes('lista') || msg.includes('ver')) {
    if (prod && prod.length > 0) {
      return '🎁 Mirá todas las rifas disponibles acá: **' + APP_URL + '**\n\n💬 wa.me/' + WHATSAPP_ADMIN;
    }
    return 'Ahora no hay rifas activas. Pronto vamos a tener más! 🎉';
  }

  if (msg.includes('gracias') || msg.includes('graciass')) return 'De nada! 🍀 Suerte!';
  if (msg.includes('chau') || msg.includes('adiós') || msg.includes('bye') || msg.includes('nos vemos')) return 'Chau! Cuando quieras saber algo, estoy acá 🤖';

  if ((msg.includes('número') || msg.includes('numero')) && (msg.includes('suerte') || msg.includes('elegir') || msg.includes('recomendá') || msg.includes('recomienda') || msg.includes('cual') || msg.includes('cuál'))) {
    return 'Elegí fechas importantes (cumpleaños, aniversarios) o decime "dame un número" y te recomiendo uno 🎲';
  }

  if (msg.includes('precio') || msg.includes('cuánto cuesta') || msg.includes('cuanto cuesta') || msg.includes('costo') || msg.includes('vale') || msg.includes('cuesta') || msg.includes('sale')) {
    if (productos && productos.length > 0) {
      return '💰 Los precios varían según la rifa. Mirá todas las rifas acá: **' + APP_URL + '**\n\n💬 wa.me/' + WHATSAPP_ADMIN;
    }
    return 'Ahora no hay rifas activas. Pronto vamos a tener más! 🎉';
  }

  if (msg.includes('dónde') || msg.includes('donde') || msg.includes('ubicación') || msg.includes('local') || msg.includes('oficina')) {
    return '📱 Somos online 100%. Todo se gestiona por WhatsApp. Mandanos un mensaje: 💬 wa.me/' + WHATSAPP_ADMIN;
  }

  if (msg.includes('cuándo') || msg.includes('cuando') || msg.includes('fecha') || msg.includes('dia') || msg.includes('día') || msg.includes('horario')) {
    return '⏰ Apenas se venden los 100 números se sortea por la Quiniela Nocturna (21hs). El horario de atención es de 8 a 22hs por WhatsApp 💬';
  }

  if (prod && prod.length > 0) {
    return 'No entendí bien 😅 Decime "menú" para ver las opciones o preguntame directamente qué querés saber. Mirá las rifas acá: **' + APP_URL + '**';
  }

  return 'No entendí bien 😅 Decime "menú" para ver las opciones o preguntame directamente. 💬 wa.me/' + WHATSAPP_ADMIN;
}

const rateLimitMap = new Map();

function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.start > 120000) rateLimitMap.delete(ip);
  }
}

function checkRateLimit(ip, maxRequests = 20, windowMs = 60000) {
  if (rateLimitMap.size > 10000) cleanupRateLimit();
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.start > windowMs) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  record.count++;
  if (record.count > maxRequests) return false;
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, producto_id, producto_info, user_name, productos_activos } = body;

    if (!message || !message.trim()) {
      return Response.json({ response: 'Decime algo! 😊' });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return Response.json({ error: 'Demasiadas solicitudes. Esperá un momento.' }, { status: 429 });
    }

    const systemPrompt = SYSTEM_PROMPT;

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
              { role: 'user', content: message.slice(0, 500) }
            ],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        const data = await res.json();
        if (data.choices && data.choices[0]) {
          const reply = data.choices[0].message.content.trim();
          return Response.json({ response: reply });
        }
      } catch {
        // OpenAI failed, use fallback
      }
    }

    const reply = generateFallbackResponse(message, productos_activos);
    return Response.json({ response: reply });

  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
