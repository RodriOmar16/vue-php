import type { Tarifa } from '@/api/tipos';

/** «2027-12-25» -> «25/12/2027» (sin pasar por Date: no depende de la zona del navegador) */
export const fechaCorta = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
};

const LOS_DIAS: Record<number, string> = {
  1: 'Los lunes',
  2: 'Los martes',
  3: 'Los miércoles',
  4: 'Los jueves',
  5: 'Los viernes',
  6: 'Los sábados',
  7: 'Los domingos',
};

type Condiciones = Pick<Tarifa, 'diaSemana' | 'fechaDesde' | 'fechaHasta'>;

/**
 * Cuándo rige una tarifa, en palabras:
 * «Los sábados» · «25/12/2027» · «Del 01/01/2027 al 31/01/2027» · «Los sábados del 01/01/2027 al 31/01/2027».
 */
export const describirCuando = ({ diaSemana, fechaDesde, fechaHasta }: Condiciones): string => {
  const dia = diaSemana === null ? null : (LOS_DIAS[diaSemana] ?? `Día ${diaSemana}`);
  const hayFechas = fechaDesde !== null && fechaHasta !== null;
  const unSoloDia = hayFechas && fechaDesde === fechaHasta;

  if (!hayFechas) return dia ?? 'Siempre';
  if (unSoloDia) return dia ? `${dia} (${fechaCorta(fechaDesde)})` : fechaCorta(fechaDesde);
  const rango = `${fechaCorta(fechaDesde)} al ${fechaCorta(fechaHasta)}`;
  return dia ? `${dia} del ${rango}` : `Del ${rango}`;
};

/** Qué clase de tarifa es, según qué tan específica es (coincide con la regla de la API). */
export const tipoDeTarifa = ({ diaSemana, fechaDesde, fechaHasta }: Condiciones): string => {
  if (fechaDesde !== null && fechaDesde === fechaHasta) return 'Día puntual';
  if (fechaDesde !== null) return diaSemana !== null ? 'Temporada y día' : 'Temporada';
  return 'Día de la semana';
};

/** Descripción completa para la lista y el cotizador: cuándo + en qué salón. */
export const describirTarifa = (
  t: Condiciones & Pick<Tarifa, 'salonId'>,
  salones: { id: number; nombre: string }[],
): string => {
  const donde = t.salonId === null ? '' : ` · ${salones.find((s) => s.id === t.salonId)?.nombre ?? `Salón ${t.salonId}`}`;
  return `${describirCuando(t)}${donde}`;
};
