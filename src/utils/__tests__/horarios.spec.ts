import { describe, expect, it } from 'vitest';
import type { Franja } from '@/api/tipos';
import { cruzaMedianoche, duracionMinutos, etiquetaFranja, franjasPorDia, nombreDia, textoDuracion } from '../horarios';

const f = (diaSemana: number, horaInicio: string, horaFin: string, id = 1): Franja => ({
  id,
  salonId: 1,
  diaSemana,
  horaInicio,
  horaFin,
});

describe('horarios', () => {
  it('nombreDia: 1 = lunes ... 7 = domingo', () => {
    expect(nombreDia(1)).toBe('Lunes');
    expect(nombreDia(6)).toBe('Sábado');
    expect(nombreDia(7)).toBe('Domingo');
    expect(nombreDia(9)).toBe('Día 9');
  });

  it('cruzaMedianoche', () => {
    expect(cruzaMedianoche(f(6, '15:00', '22:00'))).toBe(false);
    expect(cruzaMedianoche(f(6, '20:00', '02:00'))).toBe(true);
  });

  it('duracionMinutos, también cruzando la medianoche', () => {
    expect(duracionMinutos(f(6, '15:00', '22:00'))).toBe(420);
    expect(duracionMinutos(f(6, '20:00', '02:00'))).toBe(360);
    expect(duracionMinutos(f(6, '09:30', '10:15'))).toBe(45);
  });

  it('textoDuracion', () => {
    expect(textoDuracion(420)).toBe('7 h');
    expect(textoDuracion(150)).toBe('2 h 30 min');
    expect(textoDuracion(45)).toBe('45 min');
  });

  it('etiquetaFranja', () => {
    expect(etiquetaFranja(f(6, '15:00', '22:00'))).toBe('15:00 a 22:00 (7 h)');
    expect(etiquetaFranja(f(6, '20:00', '02:00'))).toBe('20:00 a 02:00 del día siguiente (6 h)');
  });

  it('franjasPorDia: siempre los 7 días, ordenados por hora', () => {
    const mapa = franjasPorDia([f(6, '20:00', '23:00', 2), f(6, '10:00', '14:00', 1), f(1, '09:00', '12:00', 3)]);
    expect([...mapa.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(mapa.get(6)!.map((x) => x.id)).toEqual([1, 2]);
    expect(mapa.get(1)!).toHaveLength(1);
    expect(mapa.get(3)).toEqual([]);
  });
});
