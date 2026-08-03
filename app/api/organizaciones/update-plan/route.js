import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return e;
  }

  try {
    const body = await request.json();
    const { user_id, plan_slug } = body;

    if (!user_id || !plan_slug) {
      return Response.json({ error: 'Faltan campos: user_id, plan_slug' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: org } = await supabase
      .from('organizaciones')
      .select('id, user_id')
      .eq('user_id', user_id)
      .single();

    if (!org) {
      return Response.json({ error: 'Organización no encontrada. Creá una desde el dashboard.' }, { status: 404 });
    }

    const { data: plan } = await supabase
      .from('planes')
      .select('id, slug, comision_pct')
      .eq('slug', plan_slug)
      .single();

    if (!plan) {
      return Response.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    const { error } = await supabase
      .from('organizaciones')
      .update({
        plan: plan.slug,
        commission_pct: plan.comision_pct,
      })
      .eq('id', org.id);

    if (error) throw error;

    return Response.json({ success: true, plan: plan.slug, commission_pct: plan.comision_pct });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
