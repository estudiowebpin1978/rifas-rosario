const OPENAI_KEY = process.env.OPENAI_API_KEY;

export async function POST(request) {
  try {
    const { text } = await request.json();
    if (!text || !text.trim()) {
      return Response.json({ error: 'Texto requerido' }, { status: 400 });
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

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
