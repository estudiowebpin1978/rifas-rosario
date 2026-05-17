import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
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
      const quinielaRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/api/quiniela`);

      if (quinielaRes.ok) {
        const quinielaData = await quinielaRes.json();

        if (quinielaData.success) {
          const numeroGanador = quinielaData.numero_rifa;

          ganador = boletos.find(b => b.numero === numeroGanador);

          if (!ganador) {
            const msg = `La Quiniela dio el numero #${String(numeroGanador).padStart(2, '0')} pero ese boleto no fue vendido. Se usara sorteo aleatorio.`;
            ganador = boletos[Math.floor(Math.random() * boletos.length)];
            ganador._quiniela_msg = msg;
          } else {
            ganador._quiniela_numero = numeroGanador;
            ganador._quiniela_completo = quinielaData.numero_completo;
            ganador._quiniela_significado = quinielaData.significado;
          }
        }
      }
    }

    if (!ganador) {
      const total = boletos.length;
      const indice = Math.floor(Math.random() * total);
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
      return Response.json({ error: 'Error al actualizar producto: ' + updateError.message }, { status: 500 });
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
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
