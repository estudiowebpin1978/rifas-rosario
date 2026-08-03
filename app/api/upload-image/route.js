import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function uploadToImgbb(base64Image) {
  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
      method: 'POST',
      body: new URLSearchParams({ image: base64Image }),
    });
    const data = await res.json();
    if (data.success) return data.data.url;
    return null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
  } catch (e) {
    return e;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ error: 'Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'Archivo demasiado máximo 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    let imageUrl = null;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const fileName = `${crypto.randomUUID()}.jpg`;

      const { error } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (!error) {
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    if (!imageUrl) {
      imageUrl = await uploadToImgbb(base64);
    }

    if (!imageUrl) {
      return Response.json({ error: 'No se pudo subir la imagen' }, { status: 500 });
    }

    return Response.json({ success: true, url: imageUrl });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
