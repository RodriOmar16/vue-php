import { describe, expect, it } from 'vitest';
import { describirCuando, describirTarifa, fechaCorta, tipoDeTarifa } from '../combos';

const t = (diaSemana: number | null, fechaDesde: string | null, fechaHasta: string | null, salonId: number | null = null) => ({
  diaSemana, fechaDesde, fechaHasta, salonId,
});

describe('fechaCorta', () => {
  it('YYYY-MM-DD -> DD/MM/YYYY', () => expect(fechaCorta('2027-12-25')).toBe('25/12/2027'));
});

describe('describirCuando', () => {
  it.each([
    [t(6, null, null), 'Los sábados'],
    [t(1, null, null), 'Los lunes'],
    [t(null, '2027-12-25', '2027-12-25'), '25/12/2027'],
    [t(null, '2027-01-01', '2027-01-31'), 'Del 01/01/2027 al 31/01/2027'],
    [t(6, '2027-01-01', '2027-01-31'), 'Los sábados del 01/01/2027 al 31/01/2027'],
    [t(6, '2027-12-25', '2027-12-25'), 'Los sábados (25/12/2027)'],
    [t(null, null, null), 'Siempre'],
  ])('%j -> %s', (condiciones, esperado) => {
    expect(describirCuando(condiciones)).toBe(esperado);
  });
});

describe('tipoDeTarifa (la jerarquía con que se elige cuál rige)', () => {
  it('día puntual > temporada > día de la semana', () => {
    expect(tipoDeTarifa(t(null, '2027-12-25', '2027-12-25'))).toBe('Día puntual');
    expect(tipoDeTarifa(t(null, '2027-01-01', '2027-01-31'))).toBe('Temporada');
    expect(tipoDeTarifa(t(6, '2027-01-01', '2027-01-31'))).toBe('Temporada y día');
    expect(tipoDeTarifa(t(6, null, null))).toBe('Día de la semana');
  });
});

describe('describirTarifa', () => {
  const salones = [{ id: 1, nombre: 'Salón Arcoíris' }, { id: 2, nombre: 'Salón Luna' }];
  it('agrega el salón solo si la tarifa es de un salón en particular', () => {
    expect(describirTarifa(t(6, null, null), salones)).toBe('Los sábados');
    expect(describirTarifa(t(6, null, null, 2), salones)).toBe('Los sábados · Salón Luna');
    expect(describirTarifa(t(6, null, null, 99), salones)).toBe('Los sábados · Salón 99');
  });
});
