import { describe, expect, it } from 'vitest';
import type { ReservaListada } from '@/api/tipos';
import {
  acomodar, bloquesDelDia, diasDeSemana, lunesDeSemana, minutoActual, minutosDe, posicionVertical, rangoDeSemana, rangoHorario, tituloDeSemana, tramoDeCierre,
} from '../semana';

const ZONA = 'America/Argentina/Buenos_Aires';
const reserva = (extra: Partial<ReservaListada> = {}): ReservaListada => ({
  id: 'a', estado: 'confirmada', fecha: '2027-03-06', horaInicio: '15:00', horaFin: '19:00', salon: { id: 1, nombre: 'S' }, combo: 'C',
  cliente: { nombre: 'Ana', dni: '1' }, invitados: 10, total: '1.00', pagado: '0.00', saldo: '1.00', pagosEnRevision: 0, reembolsoPendiente: '0.00', ...extra,
});

describe('fechas de la semana', () => {
  it('minutosDe', () => {
    expect(minutosDe('00:00')).toBe(0);
    expect(minutosDe('15:30')).toBe(930);
    expect(minutosDe('23:59')).toBe(1439);
  });
  it('el lunes de cualquier día de la semana (el domingo es el último día, no el primero)', () => {
    for (const d of ['2027-03-01', '2027-03-03', '2027-03-06', '2027-03-07']) expect(lunesDeSemana(d)).toBe('2027-03-01');
    expect(lunesDeSemana('2027-03-08')).toBe('2027-03-08');
  });
  it('cruza de mes y de año', () => {
    expect(lunesDeSemana('2027-01-01')).toBe('2026-12-28');
    expect(diasDeSemana('2026-12-28')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  });
  it('el rango a pedir incluye el domingo anterior (por las fiestas que terminan el lunes)', () => {
    expect(rangoDeSemana('2027-03-01')).toEqual({ desde: '2027-02-28', hasta: '2027-03-07' });
  });
  it('el título', () => {
    expect(tituloDeSemana('2027-03-01')).toBe('Semana del 1 al 7 de marzo de 2027');
    expect(tituloDeSemana('2027-03-29')).toBe('Semana del 29 de marzo al 4 de abril de 2027');
    expect(tituloDeSemana('2026-12-28')).toBe('Semana del 28 de diciembre de 2026 al 3 de enero de 2027');
  });
});

describe('bloquesDelDia', () => {
  it('una reserva del día es un tramo de su hora de inicio a la de fin', () => {
    const [b] = bloquesDelDia([reserva()], '2027-03-06', false);
    expect(b).toMatchObject({ inicio: 900, fin: 1140, continuacion: false, sigueManana: false });
    expect(bloquesDelDia([reserva()], '2027-03-07', false)).toEqual([]);
  });

  it('una fiesta que cruza la medianoche se parte: hasta las 24:00 hoy y desde las 00:00 mañana', () => {
    const noche = reserva({ horaInicio: '21:00', horaFin: '01:00' });
    expect(bloquesDelDia([noche], '2027-03-06', false)).toEqual([expect.objectContaining({ inicio: 1260, fin: 1440, continuacion: false, sigueManana: true })]);
    expect(bloquesDelDia([noche], '2027-03-07', false)).toEqual([expect.objectContaining({ inicio: 0, fin: 60, continuacion: true, sigueManana: false })]);
    expect(bloquesDelDia([noche], '2027-03-08', false)).toEqual([]);
  });

  it('termina justo a las 00:00: no deja un tramo vacío al día siguiente', () => {
    const justo = reserva({ horaInicio: '20:00', horaFin: '00:00' });
    expect(bloquesDelDia([justo], '2027-03-06', false)).toEqual([expect.objectContaining({ inicio: 1200, fin: 1440 })]);
    expect(bloquesDelDia([justo], '2027-03-07', false)).toEqual([]);
  });

  it('ordena por hora y oculta canceladas y vencidas salvo que se pidan', () => {
    const lista = [reserva({ id: 'c', horaInicio: '20:00', horaFin: '23:00' }), reserva({ id: 'a' }), reserva({ id: 'x', estado: 'cancelada', horaInicio: '10:00', horaFin: '12:00' })];
    expect(bloquesDelDia(lista, '2027-03-06', false).map((b) => b.reserva.id)).toEqual(['a', 'c']);
    expect(bloquesDelDia(lista, '2027-03-06', true).map((b) => b.reserva.id)).toEqual(['x', 'a', 'c']);
  });
});

describe('tramoDeCierre', () => {
  // 2027-03-10 00:00 a 2027-03-12 00:00 (Buenos Aires = UTC-3): los días 10 y 11 completos
  const completo = { desde: '2027-03-10T03:00:00.000Z', hasta: '2027-03-12T03:00:00.000Z' };
  it('un cierre de días completos ocupa 00:00 a 24:00 en cada día, y ninguno más', () => {
    expect(tramoDeCierre(completo, ZONA, '2027-03-10')).toEqual({ inicio: 0, fin: 1440 });
    expect(tramoDeCierre(completo, ZONA, '2027-03-11')).toEqual({ inicio: 0, fin: 1440 });
    expect(tramoDeCierre(completo, ZONA, '2027-03-12')).toBeNull();
    expect(tramoDeCierre(completo, ZONA, '2027-03-09')).toBeNull();
  });
  it('un cierre por horas se recorta en cada día que toca', () => {
    // 22:00 del 10 a 02:00 del 11 (hora local)
    const noche = { desde: '2027-03-11T01:00:00.000Z', hasta: '2027-03-11T05:00:00.000Z' };
    expect(tramoDeCierre(noche, ZONA, '2027-03-10')).toEqual({ inicio: 1320, fin: 1440 });
    expect(tramoDeCierre(noche, ZONA, '2027-03-11')).toEqual({ inicio: 0, fin: 120 });
  });
  it('usa la zona de la empresa, no la del navegador', () => {
    // 15:00 a 18:00 locales del día 10 = 18:00 a 21:00 UTC
    expect(tramoDeCierre({ desde: '2027-03-10T18:00:00.000Z', hasta: '2027-03-10T21:00:00.000Z' }, ZONA, '2027-03-10')).toEqual({ inicio: 900, fin: 1080 });
  });
  it('un cierre dentro del día, y uno que termina justo a las 00:00', () => {
    expect(tramoDeCierre({ desde: '2027-03-10T12:00:00.000Z', hasta: '2027-03-10T15:00:00.000Z' }, ZONA, '2027-03-10')).toEqual({ inicio: 540, fin: 720 });
    expect(tramoDeCierre({ desde: '2027-03-10T12:00:00.000Z', hasta: '2027-03-11T03:00:00.000Z' }, ZONA, '2027-03-10')).toEqual({ inicio: 540, fin: 1440 });
    expect(tramoDeCierre({ desde: '2027-03-10T12:00:00.000Z', hasta: '2027-03-11T03:00:00.000Z' }, ZONA, '2027-03-11')).toBeNull();
  });
});

describe('acomodar (reservas que se pisan)', () => {
  const t = (inicio: number, fin: number, id = '') => ({ inicio, fin, id });
  it('uno solo ocupa todo el ancho', () => {
    expect(acomodar([t(900, 1140)])).toEqual([{ bloque: t(900, 1140), columna: 0, columnas: 1 }]);
  });
  it('dos que no se pisan ocupan todo el ancho cada uno, aunque se toquen justo', () => {
    const r = acomodar([t(600, 720, 'a'), t(720, 900, 'b')]);
    expect(r.map((u) => [u.bloque.id, u.columna, u.columnas])).toEqual([['a', 0, 1], ['b', 0, 1]]);
  });
  it('dos que se pisan van una al lado de la otra', () => {
    const r = acomodar([t(600, 900, 'a'), t(720, 1000, 'b')]);
    expect(r.map((u) => [u.bloque.id, u.columna, u.columnas])).toEqual([['a', 0, 2], ['b', 1, 2]]);
  });
  it('un grupo de tres que se encadenan reparte columnas y reutiliza la libre', () => {
    // a y b se pisan; c empieza cuando a ya terminó pero b sigue: ocupa la columna de a
    const r = acomodar([t(600, 700, 'a'), t(650, 900, 'b'), t(700, 800, 'c')]);
    const por = Object.fromEntries(r.map((u) => [u.bloque.id, [u.columna, u.columnas]]));
    expect(por).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] });
  });
  it('los grupos son independientes: uno suelto después no hereda las columnas del anterior', () => {
    const r = acomodar([t(600, 900, 'a'), t(700, 800, 'b'), t(1000, 1100, 'c')]);
    const por = Object.fromEntries(r.map((u) => [u.bloque.id, u.columnas]));
    expect(por).toEqual({ a: 2, b: 2, c: 1 });
  });
  it('tres a la vez usan tres columnas', () => {
    const r = acomodar([t(600, 900, 'a'), t(600, 900, 'b'), t(600, 900, 'c')]);
    expect(r.map((u) => u.columna).sort()).toEqual([0, 1, 2]);
    expect(r.every((u) => u.columnas === 3)).toBe(true);
  });
  it('sin bloques no devuelve nada', () => {
    expect(acomodar([])).toEqual([]);
  });
});

describe('rangoHorario y posición', () => {
  it('por defecto de 8 a 24', () => {
    expect(rangoHorario([])).toEqual({ desde: 8, hasta: 24 });
    expect(rangoHorario([{ inicio: 900, fin: 1140 }])).toEqual({ desde: 8, hasta: 24 });
  });
  it('se amplía a horas enteras si algo cae antes o después', () => {
    expect(rangoHorario([{ inicio: 6 * 60 + 30, fin: 9 * 60 }])).toEqual({ desde: 6, hasta: 24 });
    expect(rangoHorario([{ inicio: 0, fin: 90 }])).toEqual({ desde: 0, hasta: 24 });
    expect(rangoHorario([{ inicio: 600, fin: 660 }], { desde: 10, hasta: 20 })).toEqual({ desde: 10, hasta: 20 });
    expect(rangoHorario([{ inicio: 600, fin: 21 * 60 + 15 }], { desde: 10, hasta: 20 })).toEqual({ desde: 10, hasta: 22 });
  });
  it('posición vertical según la hora de arranque de la grilla', () => {
    expect(posicionVertical({ inicio: 15 * 60, fin: 19 * 60 }, 8, 48)).toEqual({ top: 336, alto: 192 });
    expect(posicionVertical({ inicio: 8 * 60 + 30, fin: 9 * 60 }, 8, 48)).toEqual({ top: 24, alto: 24 });
  });
});

describe('minutoActual', () => {
  it('es la hora local de la empresa, no la de UTC', () => {
    // 01:30 UTC del 16 = 22:30 del 15 en Buenos Aires
    expect(minutoActual(new Date('2027-03-16T01:30:00Z'), ZONA)).toEqual({ dia: '2027-03-15', minutos: 22 * 60 + 30 });
  });
});
