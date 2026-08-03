const URL_NACIONALLOTERIA = 'https://www.nacionalloteria.com/argentina/quiniela-nacional.php';

let quinielaCache = null;
let quinielaCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchNocturna() {
  const now = Date.now();
  if (quinielaCache && now - quinielaCacheTime < CACHE_TTL) {
    return quinielaCache;
  }

  try {
    const res = await fetch(URL_NACIONALLOTERIA, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) return null;
    const html = await res.text();

    const regex = /<li class="nocturna">Nocturna<\/li><li class="nocturna">(\d{4}) <\/li>/;
    const match = html.match(regex);

    if (match && match[1]) {
      quinielaCache = { numero: match[1], fuente: 'nacionalloteria.com' };
      quinielaCacheTime = now;
      return quinielaCache;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const data = await fetchNocturna();

    if (data && data.numero) {
      const numStr = data.numero.padStart(4, '0');
      const ultimasDos = numStr.slice(-2);
      const numeroSorteo = parseInt(ultimasDos);

      return Response.json({
        success: true,
        tipo_sorteo: 'Nocturna',
        horario: '21:00 hs',
        numero_completo: numStr,
        ultimas_dos_cifras: ultimasDos,
        numero_rifa: numeroSorteo === 0 ? 100 : numeroSorteo,
        fecha: new Date().toISOString().split('T')[0],
        fuente: data.fuente,
        significado: getSignificado(numeroSorteo)
      });
    }

    const fechaArgentina = new Date().toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return Response.json({
      success: false,
      error: 'El sorteo Nocturna (21hs) aún no se realizó hoy',
      mensaje: `El sorteo Nocturna de la Quiniela Nacional se realiza a las 21hs. Vuelve después de las 21hs (hoy es ${fechaArgentina}).`,
      horario: '21:00 hs'
    }, { status: 503 });
  } catch {
    return Response.json({ success: false, error: 'Error al obtener quiniela' }, { status: 500 });
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
