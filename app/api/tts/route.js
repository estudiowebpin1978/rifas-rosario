const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MAX_TTS_LENGTH = 500;

const rateLimitMap = new Map();

function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.start > 120000) rateLimitMap.delete(ip);
  }
}

function checkRateLimit(ip, maxRequests = 10, windowMs = 60000) {
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
    const { text } = await request.json();
    if (!text || !text.trim()) {
      return Response.json({ error: 'Texto requerido' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return Response.json({ error: 'Demasiadas solicitudes. Esperá un momento.' }, { status: 429 });
    }

    if (!OPENAI_KEY) {
      return Response.json({ error: 'TTS no disponible' }, { status: 503 });
    }

    const cleanText = text
      .replace(/[*#_`]/g, '')
      .replace(/[🎉🎰🛒💳🎁🏆🍀🤖👋😅👇✅❌💰💬📱⏰⭐🎲🔐📲📤🎟️💪😊🔥👕💻🏠]/g, '')
      .trim();

    if (!cleanText) {
      return Response.json({ error: 'Texto vacío después de limpiar' }, { status: 400 });
    }

    if (cleanText.length > MAX_TTS_LENGTH) {
      return Response.json({ error: `Texto demasiado largo. Máximo ${MAX_TTS_LENGTH} caracteres` }, { status: 400 });
    }

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice: 'nova',
        input: cleanText,
        speed: 1.0
      })
    });

    if (!res.ok) {
      return Response.json({ error: 'Error al generar audio' }, { status: 500 });
    }

    const audioBuffer = await res.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
