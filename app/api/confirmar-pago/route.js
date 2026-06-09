import { createClient } from '@supabase/supabase-js';
import { isQuinielaAvailableToday, getNextSorteoDate } from '@/lib/quinielaUtils';
import { clonarProducto } from '@/lib/clonarProducto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function obtenerBoletosVendidos(supabase, productoId) {
  const { data, error } = await supabase
    .from('boletos')
    .select('id, numero, nombre, whatsapp')
    .eq('producto_id', productoId)
    .eq('estado', 'vendido');

  if (error) throw new Error('Error al contar boletos vendidos: ' + error.message);
  return data || [];
}

async function intentarSorteoQuiniela(supabase, producto, boletos) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const quinielaRes = await fetch(`${baseUrl}/api/quiniela`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!quinielaRes.ok) {
      const quinielaData = await quinielaRes.json();
      if (quinielaData.error?.includes('no se realizó')) {
        return { disponible: false, motivo: 'Antes de las 21hs' };
      }
      return { disponible: false, motivo: 'Quiniela no disponible' };
    }

    const quinielaData = await quinielaRes.json();
    if (!quinielaData.success) {
      return { disponible: false, motivo: 'Quiniela no disponible' };
    }

    const numeroGanador = quinielaData.numero_rifa;
    let ganador = boletos.find(b => b.numero === numeroGanador);

    if (!ganador) {
      ganador = boletos[Math.floor(Math.random() * boletos.length)];
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

    const { error: updateError } = await supabase
      .from('productos')
      .update(updates)
      .eq('id', producto.id);

    if (updateError) throw new Error('Error al actualizar sorteo: ' + updateError.message);

    return {
      disponible: true,
      completado: true,
      ganador: {
        numero: ganador.numero,
        nombre: ganador.nombre || 'Anónimo',
        whatsapp: ganador.whatsapp || ''
      },
      quiniela: {
        numero_completo: quinielaData.numero_completo,
        ultimas_dos: String(numeroGanador).padStart(2, '0'),
        significado: quinielaData.significado
      },
      participantes: boletos.map(b => ({ nombre: b.nombre, whatsapp: b.whatsapp }))
    };
  } catch (err) {
    return { disponible: false, motivo: 'Error al consultar quiniela: ' + err.message };
  }
}

export async function POST(request) {
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
      return Response.json({ error: error.message, details: error }, { status: 500 });
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

    const boletosVendidos = await obtenerBoletosVendidos(supabase, producto.id);
    const numbersTotal = producto.numbers_total || 100;

    if (boletosVendidos.length >= numbersTotal) {
      const disponibilidad = isQuinielaAvailableToday();

      if (disponibilidad.available) {
        const resultado = await intentarSorteoQuiniela(supabase, producto, boletosVendidos);

        if (resultado.completado) {
          try {
            await clonarProducto(supabase, producto);
          } catch (e) {
            console.error('Error al clonar producto:', e);
          }
          return Response.json({
            success: true,
            data: boletoActualizado,
            sorteo: {
              estado: 'completado',
              ganador: resultado.ganador,
              quiniela: resultado.quiniela,
              participantes: resultado.participantes
            }
          });
        }

        const sorteoFecha = getNextSorteoDate();
        await supabase
          .from('productos')
          .update({
            sorteo_programado: true,
            sorteo_fecha: sorteoFecha.toISOString(),
            metodo_sorteo: 'quiniela',
            sorteo_notificado: true
          })
          .eq('id', producto.id);

        return Response.json({
          success: true,
          data: boletoActualizado,
          sorteo: {
            estado: 'programado',
            motivo: resultado.motivo,
            fecha: sorteoFecha.toISOString(),
            participantes: boletosVendidos.map(b => ({ nombre: b.nombre, whatsapp: b.whatsapp }))
          }
        });
      }

      const sorteoFecha = getNextSorteoDate();
      await supabase
        .from('productos')
        .update({
          sorteo_programado: true,
          sorteo_fecha: sorteoFecha.toISOString(),
          metodo_sorteo: 'quiniela',
          sorteo_notificado: true
        })
        .eq('id', producto.id);

      return Response.json({
        success: true,
        data: boletoActualizado,
        sorteo: {
          estado: 'programado',
          motivo: disponibilidad.reason === 'domingo' ? 'Hoy es domingo (no hay Quiniela)' : 'Antes de las 21hs',
          fecha: sorteoFecha.toISOString(),
          participantes: boletosVendidos.map(b => ({ nombre: b.nombre, whatsapp: b.whatsapp }))
        }
      });
    }

    return Response.json({ success: true, data: boletoActualizado });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
