import { describe, expect, it } from 'vitest';
import { aNumero, formatearImporte, importeValido } from '../dinero';

describe('formatearImporte', () => {
  it('formato argentino con símbolo y dos decimales', () => {
    const texto = formatearImporte('1500.00');
    expect(texto).toMatch(/1\.500,00/);
    expect(texto).toContain('$');
    expect(formatearImporte('0.00')).toMatch(/0,00/);
    expect(formatearImporte('99999999.99')).toMatch(/99\.999\.999,99/);
    expect(formatearImporte('12.5')).toMatch(/12,50/);
  });

  it('vacío o nulo -> raya; basura -> el mismo texto', () => {
    expect(formatearImporte(null)).toBe('—');
    expect(formatearImporte(undefined)).toBe('—');
    expect(formatearImporte('')).toBe('—');
    expect(formatearImporte('abc')).toBe('abc');
  });
});

describe('aNumero', () => {
  it('convierte el texto de un input', () => {
    expect(aNumero('1500.5')).toBe(1500.5);
    expect(aNumero(' 20 ')).toBe(20);
    expect(aNumero('0')).toBe(0);
  });
  it('vacío o inválido -> null', () => {
    for (const malo of ['', '   ', 'abc', 'Infinity']) expect(aNumero(malo)).toBeNull();
  });
});

describe('importeValido', () => {
  it.each(['0', '1', '1500', '1500.5', '1500.50', '99999999.99', ''])('acepta %j', (v) => expect(importeValido(v)).toBe(true));
  it.each(['-1', '10.123', '1,5', 'abc', '1e5', '.5', '100000000', '99999999.999'])('rechaza %j', (v) =>
    expect(importeValido(v)).not.toBe(true),
  );
});
