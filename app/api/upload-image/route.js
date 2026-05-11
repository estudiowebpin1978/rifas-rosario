import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const dataUri = `data:${mimeType};base64,${base64}`;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    const { data, error } = await supabase.storage
      .from('comprobantes')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      return Response.json({ error: error.message, url: dataUri }, { status: 200 });
    }

    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
    
    return Response.json({ success: true, url: urlData.publicUrl });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}