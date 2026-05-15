import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function uploadToImgbb(base64Image) {
  try {
    const res = await fetch('https://api.imgbb.com/1/upload?key=ed9d97ae7b0e4710cc59f83b968e9e12', {
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
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    let imageUrl = null;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

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
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}