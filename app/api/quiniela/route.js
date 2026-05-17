// API de Quiniela Nacional de Buenos Aires
// Obtiene las ultimas 2 cifras de la cabeza de la quiniela

const FUENTES = [
  'https://api.argentinadatos.com/v1/loteria/nacional/ultimo',
  'https://www.loterias.com/quiniela-nacional'
];

async function fetchDesdeArgDatos() {
  try {
    const res = await fetch(FUENTES[0], {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

async function fetchDesdeLoterias() {
  try {
    const res = await fetch(FUENTES[1], {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Buscar el numero de la cabeza (primer premio) en la quiniela Nacional
    const matches = html.match(/Nacional[^]*?(\d{4})/i);
    if (matches) {
      return { numero: matches[1], fuente: 'loterias.com' };
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    let data = await fetchDesdeArgDatos();

    if (data && data.numero) {
      const numStr = String(data.numero);
      const ultimasDos = numStr.slice(-2);
      const numeroCompleto = numStr;
      const numeroSorteo = parseInt(ultimasDos);

      return Response.json({
        success: true,
        numero_completo: numeroCompleto,
        ultimas_dos_cifras: ultimasDos,
        numero_rifa: numeroSorteo === 0 ? 100 : numeroSorteo,
        fecha: data.fecha || new Date().toISOString().split('T')[0],
        hora: data.hora || '',
        fuente: 'argentinadatos.com',
        significado: getSignificado(numeroSorteo)
      });
    }

    data = await fetchDesdeLoterias();

    if (data && data.numero) {
      const numStr = String(data.numero).padStart(4, '0');
      const ultimasDos = numStr.slice(-2);
      const numeroSorteo = parseInt(ultimasDos);

      return Response.json({
        success: true,
        numero_completo: numStr,
        ultimas_dos_cifras: ultimasDos,
        numero_rifa: numeroSorteo === 0 ? 100 : numeroSorteo,
        fecha: new Date().toISOString().split('T')[0],
        fuente: 'loterias.com',
        significado: getSignificado(numeroSorteo)
      });
    }

    return Response.json({
      success: false,
      error: 'No se pudo obtener el resultado de la Quiniela Nacional',
      mensaje: 'Intenta de nuevo mas tarde o usa el sorteo manual'
    }, { status: 503 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

function getSignificado(num) {
  const significados = {
    0: 'Huevos', 1: 'Agua', 2: 'Niño', 3: 'San Cono', 4: 'La Cama',
    5: 'Gato', 6: 'Perro', 7: 'Revolver', 8: 'Incendio', 9: 'Arbol',
    10: 'La Leche', 11: 'El Palito', 12: 'El Soldado', 13: 'La Yeta',
    14: 'Borracho', 15: 'Niño Bonito', 16: 'El Oro', 17: 'Roto',
    18: 'La Música', 19: 'Pescador', 20: 'La Luna', 21: 'El Negro',
    22: 'El Loco', 23: 'Cocinero', 24: 'El Caballo', 25: 'La Gallina',
    26: 'El Santero', 27: 'El Cuchillo', 28: 'Pirata', 29: 'El Arco',
    30: 'El Santo', 31: 'El Pájaro', 32: 'El Papa', 33: 'El Queso',
    34: 'Lombrices', 35: 'Anteojos', 36: 'Las Plantas', 37: 'La Mula',
    38: 'La Piedra', 39: 'La Lluvia', 40: 'La Virgen', 41: 'Cuchillo',
    42: 'Zapatilla', 43: 'Balcón', 44: 'La Cárcel', 45: 'El Vino',
    46: 'Tomates', 47: 'Muerto', 48: 'El Pescado', 49: 'El Jabón',
    50: 'La Música', 51: 'La Jirafa', 52: 'La Mujer', 53: 'El Ejército',
    54: 'La Cama', 55: 'El Rey', 56: 'El Queso', 57: 'El Santo',
    58: 'La Cama', 59: 'El Gato', 60: 'La Muerte', 61: 'El Perro',
    62: 'El Loro', 63: 'El Sol', 64: 'La Luna', 65: 'El Árbol',
    66: 'La Noche', 67: 'El Día', 68: 'El Fuego', 69: 'El Agua',
    70: 'La Tierra', 71: 'El Aire', 72: 'El Cielo', 73: 'El Mar',
    74: 'El Río', 75: 'La Montaña', 76: 'El Bosque', 77: 'El Desierto',
    78: 'La Ciudad', 79: 'El Campo', 80: 'El Río', 81: 'La Playa',
    82: 'El Sol', 83: 'La Luna', 84: 'Las Nubes', 85: 'Las Flores',
    86: 'El Pájaro', 87: 'El Pez', 88: 'El Animal', 89: 'La Planta',
    90: 'El Miedo', 91: 'El Amor', 92: 'La Paz', 93: 'La Guerra',
    94: 'La Vida', 95: 'La Muerte', 96: 'La Suerte', 97: 'La Mesa',
    98: 'La Silla', 99: 'El Pan'
  };
  return significados[num] || 'Desconocido';
}
