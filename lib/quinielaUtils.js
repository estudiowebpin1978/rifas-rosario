export function getArgTime() {
  const now = new Date();
  const argOffset = -3 * 60;
  return new Date(now.getTime() + argOffset * 60000 + now.getTimezoneOffset() * 60000);
}

export function isQuinielaAvailableToday() {
  const argNow = getArgTime();
  const argDay = argNow.getUTCDay();
  const argHour = argNow.getUTCHours();
  const argMin = argNow.getUTCMinutes();

  if (argDay === 0) {
    return { available: false, reason: 'domingo', mensaje: 'Los domingos no hay sorteo de la Quiniela Nacional Nocturna.' };
  }
  if (argHour < 21 || (argHour === 21 && argMin < 0)) {
    return { available: false, reason: 'antes_21hs', mensaje: 'El sorteo Nocturna se realiza a las 21hs (hora Argentina).' };
  }
  return { available: true };
}

export function getNextSorteoDate() {
  const argNow = getArgTime();
  const argDay = argNow.getUTCDay();
  const argHour = argNow.getUTCHours();

  let target = new Date(argNow);

  if (argDay === 0) {
    target.setUTCDate(target.getUTCDate() + 1);
    target.setUTCHours(21, 0, 0, 0);
  } else if (argDay === 6 && argHour >= 21) {
    target.setUTCDate(target.getUTCDate() + 2);
    target.setUTCHours(21, 0, 0, 0);
  } else if (argHour >= 21) {
    target.setUTCDate(target.getUTCDate() + 1);
    target.setUTCHours(21, 0, 0, 0);
  } else {
    target.setUTCHours(21, 0, 0, 0);
  }

  return target;
}

export function formatSorteoDate(date) {
  return date.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
