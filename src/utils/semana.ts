/**
 * Lógica pura de la vista semanal del calendario: de lunes a domingo, con las horas en vertical.
 * Todo se calcula en MINUTOS DEL DÍA (0 a 1440) en la zona de la empresa. Una reserva o un cierre puede cruzar la
 * medianoche: se parte en un tramo por día, así cada columna dibuja solo lo que le toca.
 */
import type { Bloqueo, ReservaListada } from '@/api/tipos';
import { ESTADOS_ACTIVOS } from './calendario';
import { isoALocal, localAIso, sumarDias } from './zonaHoraria';

export const MINUTOS_POR_DIA = 24 * 60;

/** «15:30» -> 930 */
export const minutosDe = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** El lunes de la semana de esa fecha. */
export const lunesDeSemana = (fecha: string): string => {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = (new Date(Date.UTC(a!, m! - 1, d)).getUTCDay() + 6) % 7; // lunes = 0
  return sumarDias(fecha, -dia);
};

/** Los 7 días (lunes a domingo) de la semana que empieza en `lunes`. */
export const diasDeSemana = (lunes: string): string[] => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

/**
 * Qué reservas pedir para dibujar la semana: desde el domingo anterior (una fiesta que arranca de noche puede terminar
 * ya el lunes) hasta el domingo de la semana.
 */
export const rangoDeSemana = (lunes: string) => ({ desde: sumarDias(lunes, -1), hasta: sumarDias(lunes, 6) });

/** Un tramo de un día, en minutos. */
export interface Tramo {
  inicio: number;
  fin: number;
}

export interface BloqueReserva extends Tramo {
  reserva: ReservaListada;
  /** la reserva empezó el día anterior y este tramo es su continuación */
  continuacion: boolean;
  /** la reserva sigue al día siguiente */
  sigueManana: boolean;
}

/** ¿La reserva termina al día siguiente? (su hora de fin es igual o anterior a la de inicio) */
const cruzaMedianoche = (r: Pick<ReservaListada, 'horaInicio' | 'horaFin'>) => minutosDe(r.horaFin) <= minutosDe(r.horaInicio);

/** Los tramos de reservas que caen en ese día: las que empiezan hoy y las que vienen de ayer pasada la medianoche. */
export const bloquesDelDia = (reservas: ReservaListada[], dia: string, verInactivas: boolean): BloqueReserva[] => {
  const ayer = sumarDias(dia, -1);
  const bloques: BloqueReserva[] = [];
  for (const r of reservas) {
    if (!verInactivas && !ESTADOS_ACTIVOS.includes(r.estado)) continue;
    const cruza = cruzaMedianoche(r);
    if (r.fecha === dia) {
      bloques.push({ reserva: r, inicio: minutosDe(r.horaInicio), fin: cruza ? MINUTOS_POR_DIA : minutosDe(r.horaFin), continuacion: false, sigueManana: cruza });
    } else if (r.fecha === ayer && cruza && minutosDe(r.horaFin) > 0) {
      bloques.push({ reserva: r, inicio: 0, fin: minutosDe(r.horaFin), continuacion: true, sigueManana: false });
    }
  }
  return bloques.sort((a, b) => a.inicio - b.inicio || a.fin - b.fin || a.reserva.id.localeCompare(b.reserva.id));
};

/**
 * La parte de un cierre que cae en ese día (en minutos locales), o null si no lo toca. Los cierres se guardan como
 * instantes: se recortan contra el día local de la empresa (de 00:00 a 00:00 del siguiente).
 */
export const tramoDeCierre = (cierre: Pick<Bloqueo, 'desde' | 'hasta'>, zona: string, dia: string): Tramo | null => {
  const inicioDia = localAIso(`${dia}T00:00`, zona);
  const inicioSiguiente = localAIso(`${sumarDias(dia, 1)}T00:00`, zona);
  const desde = new Date(cierre.desde).getTime();
  const hasta = new Date(cierre.hasta).getTime();
  const a = Math.max(desde, new Date(inicioDia).getTime());
  const b = Math.min(hasta, new Date(inicioSiguiente).getTime());
  if (b <= a) return null;
  const aMin = minutosDe(isoALocal(new Date(a).toISOString(), zona).slice(11));
  const bMin = b === new Date(inicioSiguiente).getTime() ? MINUTOS_POR_DIA : minutosDe(isoALocal(new Date(b).toISOString(), zona).slice(11));
  return bMin > aMin ? { inicio: aMin, fin: bMin } : null;
};

export interface Ubicado<T extends Tramo> {
  bloque: T;
  /** columna dentro del grupo de bloques que se pisan (0 = la primera) */
  columna: number;
  /** cuántas columnas tiene ese grupo: el ancho de cada bloque es 1/columnas */
  columnas: number;
}

/**
 * Acomoda bloques que se pisan en el tiempo (por ejemplo, dos salones ocupados a la vez) uno al lado del otro, sin
 * taparse. Los que no se pisan con nadie ocupan todo el ancho. Dos bloques que se tocan justo (uno termina cuando
 * empieza el otro) no se pisan.
 */
export const acomodar = <T extends Tramo>(bloques: T[]): Ubicado<T>[] => {
  const ordenados = [...bloques].sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);
  const resultado: Ubicado<T>[] = [];
  let grupo: Ubicado<T>[] = [];
  let finDelGrupo = -1;
  const cerrarGrupo = () => {
    const columnas = Math.max(1, ...grupo.map((u) => u.columna + 1));
    for (const u of grupo) resultado.push({ ...u, columnas });
    grupo = [];
  };
  for (const bloque of ordenados) {
    if (grupo.length > 0 && bloque.inicio >= finDelGrupo) cerrarGrupo();
    // primera columna cuyo último bloque ya terminó
    let columna = 0;
    while (grupo.some((u) => u.columna === columna && u.bloque.fin > bloque.inicio)) columna++;
    grupo.push({ bloque, columna, columnas: 1 });
    finDelGrupo = Math.max(finDelGrupo, bloque.fin);
  }
  cerrarGrupo();
  return resultado;
};

/**
 * Las horas que se dibujan: por defecto de 8 a 24, y se amplía (a horas enteras) si algo cae afuera, para no
 * dejar reservas o cierres fuera de la grilla.
 */
export const rangoHorario = (tramos: Tramo[], porDefecto: { desde: number; hasta: number } = { desde: 8, hasta: 24 }): { desde: number; hasta: number } => {
  let desde = porDefecto.desde;
  let hasta = porDefecto.hasta;
  for (const t of tramos) {
    desde = Math.min(desde, Math.floor(t.inicio / 60));
    hasta = Math.max(hasta, Math.ceil(t.fin / 60));
  }
  return { desde: Math.max(0, desde), hasta: Math.min(24, hasta) };
};

/** Posición vertical (en px) de un tramo dentro de la grilla que arranca en `desdeHora`. */
export const posicionVertical = (t: Tramo, desdeHora: number, pxPorHora: number): { top: number; alto: number } => ({
  top: ((t.inicio - desdeHora * 60) * pxPorHora) / 60,
  alto: ((t.fin - t.inicio) * pxPorHora) / 60,
});

/** Posición del «ahora» dentro del día de hoy (en minutos), o null si hoy no está en la semana. */
export const minutoActual = (ahora: Date, zona: string): { dia: string; minutos: number } => {
  const local = isoALocal(ahora.toISOString(), zona);
  return { dia: local.slice(0, 10), minutos: minutosDe(local.slice(11)) };
};

/** «Semana del 1 al 7 de marzo de 2027» (o «del 29 de marzo al 4 de abril de 2027» si cruza de mes). */
export const tituloDeSemana = (lunes: string): string => {
  const domingo = sumarDias(lunes, 6);
  const f = (iso: string, opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...opciones }).format(new Date(`${iso}T00:00:00Z`));
  const [aL, mL] = lunes.split('-');
  const [aD, mD] = domingo.split('-');
  if (aL !== aD) return `Semana del ${f(lunes, { day: 'numeric', month: 'long', year: 'numeric' })} al ${f(domingo, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  if (mL !== mD) return `Semana del ${f(lunes, { day: 'numeric', month: 'long' })} al ${f(domingo, { day: 'numeric', month: 'long' })} de ${aD}`;
  return `Semana del ${f(lunes, { day: 'numeric' })} al ${f(domingo, { day: 'numeric', month: 'long' })} de ${aD}`;
};
