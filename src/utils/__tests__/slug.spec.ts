import { describe, expect, it } from 'vitest';
import { SLUG_VALIDO, slugificar } from '../slug';

describe('slugificar', () => {
  it.each([
    ['Salón Los Pinos', 'salon-los-pinos'],
    ['  Cumpleaños   Felices!! ', 'cumpleanos-felices'],
    ['Año Nuevo & Más', 'ano-nuevo-mas'],
    ['Mi Salón 2.0', 'mi-salon-2-0'],
    ['ÁÉÍÓÚ ñandú', 'aeiou-nandu'],
    ['---raro---', 'raro'],
    ['', ''],
    ['¡¡¡', ''],
  ])('%j -> %j', (entrada, esperado) => {
    expect(slugificar(entrada)).toBe(esperado);
  });

  it('el resultado siempre cumple la regla de la API (cuando no queda vacío)', () => {
    for (const nombre of ['Salón Los Pinos', 'X y Z', '100% Diversión', 'a'.repeat(100), `${'palabra '.repeat(20)}`]) {
      const slug = slugificar(nombre);
      expect(slug).toMatch(SLUG_VALIDO);
      expect(slug.length).toBeLessThanOrEqual(60);
    }
  });

  it('no deja un guion al final si el recorte cae justo en uno', () => {
    const slug = slugificar(`${'a'.repeat(59)} b`);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('SLUG_VALIDO', () => {
  it('rechaza mayúsculas, espacios y guiones dobles', () => {
    expect(SLUG_VALIDO.test('los-pinos')).toBe(true);
    for (const malo of ['Los-Pinos', 'los pinos', 'los--pinos', '-los', 'los-', '']) {
      expect(SLUG_VALIDO.test(malo)).toBe(false);
    }
  });
});
