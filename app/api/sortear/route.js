import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';
import { clonarProducto } from '@/lib/clonarProducto';
import crypto from 'crypto';

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
    const { producto_id, metodo } = body;

    if (!producto_id) {
      return Response.json({ error: 'producto_id requerido' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: producto, error: prodError } = await supabase
      .from('productos')
      .select('*')
      .eq('id', producto_id)
      .single();

    if (prodError || !producto) {
      return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (producto.finalizado) {
      return Response.json({ error: 'Este producto ya tiene un ganador' }, { status: 400 });
    }

    const { data: boletos, error: bolError } = await supabase
      .from('boletos')
      .select('*')
      .eq('producto_id', producto_id)
      .eq('estado', 'vendido');

    if (bolError) {
      return Response.json({ error: 'Error al obtener boletos' }, { status: 500 });
    }

    if (!boletos || boletos.length === 0) {
      return Response.json({ error: 'No hay boletos vendidos para sortear' }, { status: 400 });
    }

    let ganador = null;

    if (metodo === 'quiniela' || producto.metodo_sorteo === 'quiniela') {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      const quinielaRes = await fetch(`${baseUrl}/api/quiniela`, {
        signal: AbortSignal.timeout(10000)
      });

      if (quinielaRes.ok) {
        const quinielaData = await quinielaRes.json();

        if (quinielaData.success) {
          const numeroGanador = quinielaData.numero_rifa;

          ganador = boletos.find(b => b.numero === numeroGanador);

          if (!ganador) {
            const msg = `La Quiniela Nocturna dio el #${String(numeroGanador).padStart(2, '0')} pero ese boleto no fue vendido. Se usara sorteo aleatorio.`;
            const indice = crypto.randomInt(boletos.length);
            ganador = boletos[indice];
            ganador._quiniela_msg = msg;
          } else {
            ganador._quiniela_numero = numeroGanador;
            ganador._quiniela_completo = quinielaData.numero_completo;
            ganador._quiniela_significado = quinielaData.significado;
          }
        } else {
          return Response.json({
            success: false,
            error: 'El sorteo Nocturna (21hs) aún no se realizó hoy',
            mensaje: quinielaData.mensaje || 'Esperá a las 21hs para realizar el sorteo por la Quiniela Nacional Nocturna'
          }, { status: 400 });
        }
      }
    }

    if (!ganador) {
      const total = boletos.length;
      const indice = crypto.randomInt(total);
      ganador = boletos[indice];
    }

    const updates = {
      finalizado: true,
      ganador_num: ganador.numero,
      ganador_nombre: ganador.nombre || 'Anónimo',
      metodo_sorteo: metodo || producto.metodo_sorteo || 'aleatorio',
      sorteo_fecha: new Date().toISOString()
    };

    if (ganador._quiniela_numero) {
      updates.quiniela_numero = String(ganador._quiniela_numero).padStart(2, '0');
    }

    const { error: updateError } = await supabase
      .from('productos')
      .update(updates)
      .eq('id', producto_id);

    if (updateError) {
      return Response.json({ error: 'Error al actualizar sorteo' }, { status: 500 });
    }

    try {
      await clonarProducto(supabase, producto);
    } catch {
      // Clone failed silently
    }

    return Response.json({
      success: true,
      ganador: {
        numero: ganador.numero,
        nombre: ganador.nombre || 'Anónimo',
        whatsapp: ganador.whatsapp || ''
      },
      metodo: metodo || producto.metodo_sorteo || 'aleatorio',
      quiniela: ganador._quiniela_numero ? {
        numero_completo: ganador._quiniela_completo,
        ultimas_dos: String(ganador._quiniela_numero).padStart(2, '0'),
        significado: ganador._quiniela_significado
      } : null,
      mensaje: ganador._quiniela_msg || null
    });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
