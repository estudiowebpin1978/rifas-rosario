const WHATSAPP_ADMIN = '5493412500029';
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eco-rifas.vercel.app';

export function generarMensajeGanador(ganador, producto) {
  const prodName = producto?.title || producto?.nombre || 'la rifa';
  return encodeURIComponent(
    `🎉🎉🎉 FELICIDADES! 🎉🎉🎉\n\n` +
    `Ganaste ${prodName} en Eco Rifas!\n\n` +
    `🏆 Tu número: #${String(ganador.numero).padStart(2, '0')}\n\n` +
    `📲 Para coordinar la entrega de tu premio, respondé este mensaje o contactanos al ${WHATSAPP_ADMIN}\n\n` +
    `🔥 ¿Querés seguir participando? Mirá otras rifas activas:\n${APP_URL}/app\n\n` +
    `🀄 Sorteo realizado mediante Quiniela Nacional Nocturna - 100% transparente`
  );
}

export function generarMensajeNoGanador(ganador, producto) {
  const prodName = producto?.title || producto?.nombre || 'la rifa';
  return encodeURIComponent(
    `🎰 SORTEO REALIZADO - Eco Rifas\n\n` +
    `El sorteo de ${prodName} ya se realizó mediante la Quiniela Nacional Nocturna.\n\n` +
    `🏆 Ganador: #${String(ganador.numero).padStart(2, '0')} - ${ganador.nombre}\n\n` +
    `😢 No fue tu número esta vez... ¡PERO SEGUÍ PARTICIPANDO!\n\n` +
    `🔥 Hay otras rifas activas esperando por vos:\n${APP_URL}/app\n\n` +
    `🚀 Comprá más números y aumentá tus chances de ganar!\n\n` +
    `🍀 Suerte la próxima!`
  );
}

export function generarMensajeAdmin(producto, ganador, participantes) {
  const prodName = producto?.title || producto?.nombre || 'la rifa';
  let msg =
    `🏆 SORTEO REALIZADO - Eco Rifas\n\n` +
    `🎁 Producto: ${prodName}\n` +
    `💰 Precio: $${producto?.raffle_price || producto?.precio || ''}\n\n` +
    `🥇 GANADOR:\n` +
    `#${String(ganador.numero).padStart(2, '0')} - ${ganador.nombre}\n` +
    `📱 ${ganador.whatsapp || 'Sin WhatsApp'}\n\n` +
    `🀄 Método: Quiniela Nacional Nocturna\n\n` +
    `📋 PARTICIPANTES (${participantes.length}):\n`;

  participantes.forEach((p, i) => {
    const esGanador = p.whatsapp === ganador.whatsapp && p.nombre === ganador.nombre;
    msg += `${i + 1}. ${p.nombre || 'Anónimo'} 📱${p.whatsapp || '-'}${esGanador ? ' 🏆' : ''}\n`;
  });

  msg += `\n🔗 Link app: ${APP_URL}/app`;
  return encodeURIComponent(msg);
}

export function generarMensajeSorteoProgramado(producto, fecha, motivo, participantes) {
  const prodName = producto?.title || producto?.nombre || 'la rifa';
  const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'próximo día hábil';

  return {
    admin: encodeURIComponent(
      `📅 SORTEO PROGRAMADO - Eco Rifas\n\n` +
      `🎁 ${prodName}\n` +
      `📅 Fecha: ${fechaStr}\n` +
      `📋 Motivo: ${motivo || 'Quiniela no disponible'}\n\n` +
      `👥 Participantes (${participantes.length}):\n` +
      participantes.map((p, i) => `${i + 1}. ${p.nombre || 'Anónimo'} 📱${p.whatsapp || '-'}`).join('\n') +
      `\n\n🔗 ${APP_URL}/app`
    ),
    participantes: participantes.filter(p => p.whatsapp).map(p => ({
      whatsapp: p.whatsapp,
      msg: encodeURIComponent(
        `📅 SORTEO PROGRAMADO - Eco Rifas\n\n` +
        `Todos los números de ${prodName} fueron vendidos!\n\n` +
        `📅 Fecha del sorteo: ${fechaStr}\n` +
        `🀄 Método: Quiniela Nacional Nocturna\n\n` +
        `🔥 Mientras tanto, seguí participando en otras rifas:\n${APP_URL}/app\n\n` +
        `🍀 Suerte a todos!`
      )
    }))
  };
}

export function abrirWhatsAppNumero(numero, mensaje) {
  if (!numero) return;
  window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
}

export function abrirWhatsAppAdmin(mensaje) {
  window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${mensaje}`, '_blank');
}
