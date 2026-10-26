/**
 * Lógica pura del calendario mensual. Todas las fechas son «YYYY-MM-DD» de calendario (sin zona horaria de
 * por medio); los instantes de los cierres se pasan a fecha local con la zona de la empresa.
 */
import type { Bloqueo, EstadoReserva, ReservaListada } from '@/api/tipos';
import { isoALocal, sumarDias } from './zonaHoraria';

const dos = (n: number) => String(n).padStart(2, '0');

/** Día de la semana de una fecha, con el lunes como 0. */
const diaDeSemana = (fecha: string): number => {
  const [a, m, d] = fecha.split('-').map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
};

/** `mes` de 1 a 12. */
export const primerDiaDelMes = (anio: number, mes: number) => `${anio}-${dos(mes)}-01`;

export const ultimoDiaDelMes = (anio: number, mes: number) => sumarDias(primerDiaDelMes(mes === 12 ? anio + 1 : anio, mes === 12 ? 1 : mes + 1), -1);

/** Mes anterior o siguiente (`delta` = -1 | 1), pasando de año si hace falta. */
export const moverMes = (anio: number, mes: number, delta: number): { anio: number; mes: number } => {
  const indice = anio * 12 + (mes - 1) + delta;
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
};

/** Semanas (de lunes a domingo) que cubren el mes: cada una con 7 fechas, incluidas las de los meses vecinos. */
export const semanasDelMes = (anio: number, mes: number): string[][] => {
  const primero = primerDiaDelMes(anio, mes);
  const ultimo = ultimoDiaDelMes(anio, mes);
  let dia = sumarDias(primero, -diaDeSemana(primero));
  const fin = sumarDias(ultimo, 6 - diaDeSemana(ultimo));
  const semanas: string[][] = [];
  while (dia <= fin) {
    semanas.push(Array.from({ length: 7 }, (_, i) => sumarDias(dia, i)));
    dia = sumarDias(dia, 7);
  }
  return semanas;
};

/** Rango de fechas que muestra la grilla (incluye los días de los meses vecinos). */
export const rangoDeGrilla = (anio: number, mes: number) => {
  const semanas = semanasDelMes(anio, mes);
  return { desde: semanas[0]![0]!, hasta: semanas.at(-1)![6]! };
};

/** Estados que se ven por defecto; los demás (canceladas, vencidas) se muestran con el interruptor. */
export const ESTADOS_ACTIVOS: readonly EstadoReserva[] = ['pendiente', 'confirmada', 'completada'];

export const agruparReservasPorDia = (reservas: ReservaListada[], verInactivas: boolean): Map<string, ReservaListada[]> => {
  const porDia = new Map<string, ReservaListada[]>();
  for (const r of reservas) {
    if (!verInactivas && !ESTADOS_ACTIVOS.includes(r.estado)) continue;
    porDia.set(r.fecha, [...(porDia.get(r.fecha) ?? []), r]);
  }
  for (const lista of porDia.values()) lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.id.localeCompare(b.id));
  return porDia;
};

/**
 * Días (locales, dentro de [desde, hasta]) que toca un cierre. Un cierre que termina a las 00:00 no ocupa
 * ese último día: «de las 00:00 del 10 a las 00:00 del 12» son los días 10 y 11.
 */
export const diasDeCierre = (cierre: Pick<Bloqueo, 'desde' | 'hasta'>, zona: string, desde: string, hasta: string): string[] => {
  const inicio = isoALocal(cierre.desde, zona);
  const fin = isoALocal(cierre.hasta, zona);
  const primero = inicio.slice(0, 10);
  let ultimo = fin.slice(0, 10);
  if (fin.endsWith('T00:00') && fin > inicio) ultimo = sumarDias(ultimo, -1);
  const dias: string[] = [];
  for (let dia = primero < desde ? desde : primero; dia <= ultimo && dia <= hasta; dia = sumarDias(dia, 1)) dias.push(dia);
  return dias;
};

export const agruparCierresPorDia = (cierres: Bloqueo[], zona: string, desde: string, hasta: string): Map<string, Bloqueo[]> => {
  const porDia = new Map<string, Bloqueo[]>();
  for (const c of cierres) {
    for (const dia of diasDeCierre(c, zona, desde, hasta)) porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }
  return porDia;
};

/** «2027-03» -> «marzo de 2027» */
export const nombreDelMes = (anio: number, mes: number): string =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(anio, mes - 1, 1)));
