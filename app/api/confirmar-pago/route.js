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
    const { boleto_id, action } = body;

    if (!boleto_id || !action) {
      return Response.json({ error: 'boleto_id y action requeridos' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let updateData = {};

    if (action === 'confirmar') {
      updateData = { estado: 'vendido' };
    } else if (action === 'cancelar') {
      updateData = { estado: 'disponible', nombre: null, whatsapp: null };
    } else {
      return Response.json({ error: 'Action invalida. Usar: confirmar o cancelar' }, { status: 400 });
    }

    const { data: boletoActualizado, error } = await supabase
      .from('boletos')
      .update(updateData)
      .eq('id', boleto_id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Error al actualizar boleto' }, { status: 500 });
    }

    if (action === 'cancelar') {
      return Response.json({ success: true, data: boletoActualizado });
    }

    const { data: producto } = await supabase
      .from('productos')
      .select('*')
      .eq('id', boletoActualizado.producto_id)
      .single();

    if (!producto || producto.finalizado) {
      return Response.json({ success: true, data: boletoActualizado });
    }

    const { data: boletosVendidos } = await supabase
      .from('boletos')
      .select('id, numero, nombre, whatsapp')
      .eq('producto_id', producto.id)
      .eq('estado', 'vendido');

    const vendidos = boletosVendidos || [];
    const numbersTotal = producto.numbers_total || 100;

    if (vendidos.length >= numbersTotal) {
      try {
        const { isQuinielaAvailableToday, getNextSorteoDate } = await import('@/lib/quinielaUtils');
        const disponibilidad = isQuinielaAvailableToday();

        if (disponibilidad.available) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const quinielaRes = await fetch(`${baseUrl}/api/quiniela`, {
            signal: AbortSignal.timeout(10000)
          });

          if (quinielaRes.ok) {
            const quinielaData = await quinielaRes.json();
            if (quinielaData.success) {
              const { data: freshProduct } = await supabase
                .from('productos')
                .select('finalizado')
                .eq('id', producto.id)
                .single();

              if (freshProduct?.finalizado) {
                return Response.json({ success: true, data: boletoActualizado });
              }

              const numeroGanador = quinielaData.numero_rifa;
              let ganador = vendidos.find(b => b.numero === numeroGanador);

              if (!ganador) {
                ganador = vendidos[Math.floor(Math.random() * vendidos.length)];
              }

              const updates = {
                finalizado: true,
                ganador_num: ganador.numero,
                ganador_nombre: ganador.nombre || 'Anónimo',
                metodo_sorteo: 'quiniela',
                sorteo_fecha: new Date().toISOString(),
                quiniela_numero: String(numeroGanador).padStart(2, '0'),
                sorteo_notificado: true
              };

              await supabase.from('productos').update(updates).eq('id', producto.id);

              try {
                const { clonarProducto } = await import('@/lib/clonarProducto');
                await clonarProducto(supabase, producto);
              } catch {
                // Clone failed silently
              }

              return Response.json({
                success: true,
                data: boletoActualizado,
                sorteo: {
                  estado: 'completado',
                  ganador: { numero: ganador.numero, nombre: ganador.nombre || 'Anónimo', whatsapp: ganador.whatsapp || '' },
                  quiniela: {
                    numero_completo: quinielaData.numero_completo,
                    ultimas_dos: String(numeroGanador).padStart(2, '0'),
                    significado: quinielaData.significado
                  },
                  participantes: vendidos.map(b => ({ nombre: b.nombre, whatsapp: b.whatsapp }))
                }
              });
            }
          }
        }

        const sorteoFecha = getNextSorteoDate();
        await supabase.from('productos').update({
          sorteo_programado: true,
          sorteo_fecha: sorteoFecha.toISOString(),
          metodo_sorteo: 'quiniela',
          sorteo_notificado: true
        }).eq('id', producto.id);

        return Response.json({
          success: true,
          data: boletoActualizado,
          sorteo: {
            estado: 'programado',
            motivo: disponibilidad.reason === 'domingo' ? 'Hoy es domingo (no hay Quiniela)' : 'Antes de las 21hs',
            fecha: sorteoFecha.toISOString(),
            participantes: vendidos.map(b => ({ nombre: b.nombre, whatsapp: b.whatsapp }))
          }
        });
      } catch {
        return Response.json({ success: true, data: boletoActualizado });
      }
    }

    return Response.json({ success: true, data: boletoActualizado });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
