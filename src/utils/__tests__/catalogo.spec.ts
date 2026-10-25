import { describe, expect, it } from 'vitest';
import { sufijoPrecio, textoEdades } from '../catalogo';

describe('textoEdades', () => {
  it('sin restricción', () => expect(textoEdades(null, null)).toBe('Todas las edades'));
  it('rango', () => expect(textoEdades(4, 12)).toBe('De 4 a 12 años'));
  it('solo mínimo o solo máximo', () => {
    expect(textoEdades(6, null)).toBe('Desde 6 años');
    expect(textoEdades(null, 10)).toBe('Hasta 10 años');
  });
  it('edad única', () => expect(textoEdades(5, 5)).toBe('5 años'));
  it('el cero es una edad válida (no «sin restricción»)', () => {
    expect(textoEdades(0, 3)).toBe('De 0 a 3 años');
    expect(textoEdades(0, null)).toBe('Desde 0 años');
  });
});

describe('sufijoPrecio', () => {
  it('describe cómo se cobra', () => {
    expect(sufijoPrecio('persona')).toBe('por persona');
    expect(sufijoPrecio('fijo')).toBe('precio fijo');
  });
});
