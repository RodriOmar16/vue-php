import { describe, expect, it } from 'vitest';
import type { ReservaListada } from '@/api/tipos';
import {
  agruparCierresPorDia, agruparReservasPorDia, diasDeCierre, moverMes, nombreDelMes, rangoDeGrilla, semanasDelMes, ultimoDiaDelMes,
} from '../calendario';

const ZONA = 'America/Argentina/Buenos_Aires';
const reserva = (extra: Partial<ReservaListada> = {}): ReservaListada => ({
  id: 'a', estado: 'confirmada', fecha: '2027-03-06', horaInicio: '15:00', horaFin: '19:00', salon: { id: 1, nombre: 'S' }, combo: 'C',
  cliente: { nombre: 'Ana', dni: '1' }, invitados: 10, total: '1.00', pagado: '0.00', saldo: '1.00', pagosEnRevision: 0, reembolsoPendiente: '0.00', ...extra,
});

describe('semanasDelMes', () => {
  it('arranca en lunes y termina en domingo, con 7 días por semana', () => {
    for (const [anio, mes] of [[2027, 3], [2027, 2], [2028, 2], [2027, 12], [2027, 1], [2026, 6]]) {
      const semanas = semanasDelMes(anio!, mes!);
      expect(semanas.every((s) => s.length === 7)).toBe(true);
      // el lunes de cada semana: 2027-03-01 es lunes -> cualquier lunes se obtiene sumando múltiplos de 7
      const dias = semanas.flat();
      for (let i = 1; i < dias.length; i++) expect(dias[i]! > dias[i - 1]!).toBe(true);
      expect(new Date(`${dias[0]}T00:00:00Z`).getUTCDay()).toBe(1);
      expect(new Date(`${dias.at(-1)}T00:00:00Z`).getUTCDay()).toBe(0);
    }
  });

  it('marzo de 2027 (empieza en lunes): 5 semanas justas', () => {
    const s = semanasDelMes(2027, 3);
    expect(s).toHaveLength(5);
    expect(s[0]![0]).toBe('2027-03-01');
    expect(s.at(-1)![6]).toBe('2027-04-04');
  });

  it('febrero de 2027 (28 días, empieza en lunes): 4 semanas', () => {
    expect(semanasDelMes(2027, 2)).toHaveLength(4);
  });

  it('incluye los días de los meses vecinos y cruza el cambio de año', () => {
    const s = semanasDelMes(2027, 1);
    expect(s[0]![0]).toBe('2026-12-28');
    expect(s.flat()).toContain('2027-01-31');
    const dic = semanasDelMes(2027, 12);
    expect(dic.at(-1)![6]).toBe('2028-01-02');
  });

  it('un mes puede necesitar 6 semanas', () => {
    expect(semanasDelMes(2027, 5)).toHaveLength(6); // mayo 2027 empieza en sábado y tiene 31 días
  });
});

describe('meses', () => {
  it('último día, con años bisiestos', () => {
    expect(ultimoDiaDelMes(2027, 2)).toBe('2027-02-28');
    expect(ultimoDiaDelMes(2028, 2)).toBe('2028-02-29');
    expect(ultimoDiaDelMes(2027, 12)).toBe('2027-12-31');
    expect(ultimoDiaDelMes(2027, 4)).toBe('2027-04-30');
  });
  it('moverMes pasa de año hacia los dos lados', () => {
    expect(moverMes(2027, 12, 1)).toEqual({ anio: 2028, mes: 1 });
    expect(moverMes(2027, 1, -1)).toEqual({ anio: 2026, mes: 12 });
    expect(moverMes(2027, 6, 1)).toEqual({ anio: 2027, mes: 7 });
    expect(moverMes(2027, 6, -1)).toEqual({ anio: 2027, mes: 5 });
  });
  it('rangoDeGrilla y nombreDelMes', () => {
    expect(rangoDeGrilla(2027, 3)).toEqual({ desde: '2027-03-01', hasta: '2027-04-04' });
    expect(nombreDelMes(2027, 3)).toBe('marzo de 2027');
  });
});

describe('agruparReservasPorDia', () => {
  it('agrupa por día y ordena por hora', () => {
    const m = agruparReservasPorDia([reserva({ id: 'b', horaInicio: '20:00' }), reserva({ id: 'a' }), reserva({ id: 'c', fecha: '2027-03-07' })], false);
    expect(m.get('2027-03-06')!.map((r) => r.id)).toEqual(['a', 'b']);
    expect(m.get('2027-03-07')!.map((r) => r.id)).toEqual(['c']);
  });
  it('oculta canceladas y vencidas salvo que se pidan', () => {
    const lista = [reserva({ id: 'ok' }), reserva({ id: 'x', estado: 'cancelada' }), reserva({ id: 'y', estado: 'expirada' }), reserva({ id: 'p', estado: 'pendiente' }), reserva({ id: 'h', estado: 'completada' })];
    expect(agruparReservasPorDia(lista, false).get('2027-03-06')!.map((r) => r.id).sort()).toEqual(['h', 'ok', 'p']);
    expect(agruparReservasPorDia(lista, true).get('2027-03-06')).toHaveLength(5);
  });
});

describe('cierres', () => {
  // 2027-03-10 00:00 a 2027-03-12 00:00 (Buenos Aires = UTC-3)
  const completo = { desde: '2027-03-10T03:00:00.000Z', hasta: '2027-03-12T03:00:00.000Z' };

  it('días completos: no ocupan el día en que terminan a las 00:00', () => {
    expect(diasDeCierre(completo, ZONA, '2027-03-01', '2027-04-04')).toEqual(['2027-03-10', '2027-03-11']);
  });
  it('un cierre por horas ocupa el día donde empieza y donde termina', () => {
    // 22:00 del 10 a 02:00 del 11
    expect(diasDeCierre({ desde: '2027-03-11T01:00:00.000Z', hasta: '2027-03-11T05:00:00.000Z' }, ZONA, '2027-03-01', '2027-04-04')).toEqual(['2027-03-10', '2027-03-11']);
  });
  it('usa la zona de la empresa, no la del navegador (23:00 en Buenos Aires ya es el día siguiente en UTC)', () => {
    expect(diasDeCierre({ desde: '2027-03-11T02:00:00.000Z', hasta: '2027-03-11T03:00:00.000Z' }, ZONA, '2027-03-01', '2027-04-04')).toEqual(['2027-03-10']);
  });
  it('se recorta a la grilla visible', () => {
    const largo = { desde: '2027-02-20T03:00:00.000Z', hasta: '2027-05-01T03:00:00.000Z' };
    const dias = diasDeCierre(largo, ZONA, '2027-03-01', '2027-04-04');
    expect(dias[0]).toBe('2027-03-01');
    expect(dias.at(-1)).toBe('2027-04-04');
    expect(dias).toHaveLength(35);
    expect(diasDeCierre(completo, ZONA, '2027-04-01', '2027-05-02')).toEqual([]);
  });
  it('agruparCierresPorDia pone el mismo cierre en cada día que toca', () => {
    const m = agruparCierresPorDia([{ id: 1, salonId: null, motivo: 'Feriado', ...completo }], ZONA, '2027-03-01', '2027-04-04');
    expect([...m.keys()]).toEqual(['2027-03-10', '2027-03-11']);
    expect(m.get('2027-03-11')![0]!.motivo).toBe('Feriado');
  });
});
