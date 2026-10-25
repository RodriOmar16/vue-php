import type { Franja } from '@/api/tipos';

export const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 7, nombre: 'Domingo' },
] as const;

export const nombreDia = (dia: number): string => DIAS_SEMANA.find((d) => d.valor === dia)?.nombre ?? `Día ${dia}`;

const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/** Una franja cruza la medianoche cuando termina «antes» de lo que empieza (20:00 a 02:00). */
export const cruzaMedianoche = (f: Pick<Franja, 'horaInicio' | 'horaFin'>): boolean =>
  aMinutos(f.horaFin) <= aMinutos(f.horaInicio);

export const duracionMinutos = (f: Pick<Franja, 'horaInicio' | 'horaFin'>): number =>
  (aMinutos(f.horaFin) - aMinutos(f.horaInicio) + 24 * 60) % (24 * 60);

/** «5 h», «2 h 30 min», «45 min» */
export const textoDuracion = (minutos: number): string => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h && m) return `${h} h ${m} min`;
  return h ? `${h} h` : `${m} min`;
};

/** «15:00 a 22:00 (7 h)» · «20:00 a 02:00 del día siguiente (6 h)» */
export const etiquetaFranja = (f: Pick<Franja, 'horaInicio' | 'horaFin'>): string =>
  `${f.horaInicio} a ${f.horaFin}${cruzaMedianoche(f) ? ' del día siguiente' : ''} (${textoDuracion(duracionMinutos(f))})`;

/** Agrupa las franjas por día de la semana (los 7 días siempre presentes), cada día ordenado por hora. */
export const franjasPorDia = (franjas: Franja[]): Map<number, Franja[]> => {
  const mapa = new Map<number, Franja[]>(DIAS_SEMANA.map((d) => [d.valor, []]));
  for (const f of franjas) mapa.get(f.diaSemana)?.push(f);
  for (const lista of mapa.values()) lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  return mapa;
};
