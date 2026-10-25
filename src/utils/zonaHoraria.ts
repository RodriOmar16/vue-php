/**
 * Fechas y horas en la zona horaria de la EMPRESA (no la del navegador):
 * el dueño carga «31/12 a las 20:00» y eso debe significar las 20:00 de su salón
 * aunque use el panel desde otro lugar. La API trabaja con instantes (ISO con zona).
 */

const PARTES = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;

const formateador = (zona: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/** Diferencia en ms entre la hora local de la zona y UTC en ese instante (Buenos Aires = -3 h). */
const desfase = (instanteMs: number, zona: string): number => {
  const partes = Object.fromEntries(
    formateador(zona)
      .formatToParts(new Date(instanteMs))
      .filter((p) => (PARTES as readonly string[]).includes(p.type))
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<(typeof PARTES)[number], number>;
  const comoSiFueraUtc = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second);
  return comoSiFueraUtc - Math.floor(instanteMs / 1000) * 1000;
};

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * «2027-12-31T20:00» (lo que entrega un input datetime-local) interpretado en `zona`
 * -> instante ISO en UTC. Considera los cambios de hora de verano.
 */
export const localAIso = (local: string, zona: string): string => {
  const m = LOCAL.exec(local);
  if (!m) throw new Error(`Fecha y hora inválida: ${local}`);
  const [, anio, mes, dia, hora, minuto] = m.map(Number);
  const comoUtc = Date.UTC(anio, mes - 1, dia, hora, minuto);
  // Dos pasadas: la primera estima el desfase; la segunda lo corrige si cruzó un cambio de hora.
  let instante = comoUtc - desfase(comoUtc, zona);
  instante = comoUtc - desfase(instante, zona);
  return new Date(instante).toISOString();
};

/** Instante ISO -> «2027-12-31T20:00» en `zona`, listo para un input datetime-local. */
export const isoALocal = (iso: string, zona: string): string => {
  const ms = new Date(iso).getTime();
  return new Date(ms + desfase(ms, zona)).toISOString().slice(0, 16);
};

/** «2027-12-31» + 1 -> «2028-01-01» (cuenta de calendario, sin zonas horarias de por medio). */
export const sumarDias = (fecha: string, dias: number): string => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
};

/** ¿El rango empieza y termina a las 00:00 locales (uno o más días completos)? */
export const esRangoDeDiasCompletos = (desdeIso: string, hastaIso: string, zona: string): boolean => {
  const desde = isoALocal(desdeIso, zona);
  const hasta = isoALocal(hastaIso, zona);
  return desde.endsWith('T00:00') && hasta.endsWith('T00:00') && hasta > desde;
};

/** «2027-12-31» -> «vie 31/12/2027» */
export const formatearDia = (fecha: string): string =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(`${fecha}T00:00:00Z`),
  );

/**
 * Describe un cierre para la lista: «vie 31/12/2027 · todo el día», «vie 31/12/2027 al dom 02/01/2028 · todos los días»
 * o, si no son días completos, «vie 31/12/2027, 18:00 → sáb 01/01/2028, 02:00».
 */
export const describirRango = (desdeIso: string, hastaIso: string, zona: string): string => {
  if (!esRangoDeDiasCompletos(desdeIso, hastaIso, zona)) {
    return `${formatearInstante(desdeIso, zona)} → ${formatearInstante(hastaIso, zona)}`;
  }
  const primero = isoALocal(desdeIso, zona).slice(0, 10);
  const ultimo = sumarDias(isoALocal(hastaIso, zona).slice(0, 10), -1);
  return primero === ultimo
    ? `${formatearDia(primero)} · todo el día`
    : `${formatearDia(primero)} al ${formatearDia(ultimo)} · todos los días`;
};

/** Para mostrar: «vie 31/12/2027, 20:00». */
export const formatearInstante = (iso: string, zona: string): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: zona,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
