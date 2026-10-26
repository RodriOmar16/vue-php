import { describe, expect, it } from 'vitest';
import { colorLegible, colorOPorDefecto, esColorHex } from '../color';

describe('esColorHex', () => {
  it.each(['#7c3aed', '#AABBCC', '#000000'])('acepta %s', (c) => expect(esColorHex(c)).toBe(true));
  it.each(['', 'red', '#fff', '#12345', '#1234567', '7c3aed', '#zzzzzz', '#aabbcc '])('rechaza «%s»', (c) => expect(esColorHex(c)).toBe(false));
});

describe('colorLegible (mismo criterio que el sitio público)', () => {
  it('blanco sobre fondos oscuros y oscuro sobre fondos claros', () => {
    expect(colorLegible('#000000')).toBe('#ffffff');
    expect(colorLegible('#7c3aed')).toBe('#ffffff');
    expect(colorLegible('#ffffff')).toBe('#1c1917');
    expect(colorLegible('#f59e0b')).toBe('#1c1917');
  });
});

describe('colorOPorDefecto', () => {
  it('usa el color escrito si es válido (sin espacios, en minúsculas) y el de por defecto si no', () => {
    expect(colorOPorDefecto(' #AABBCC ', '#000000')).toBe('#aabbcc');
    expect(colorOPorDefecto('', '#7c3aed')).toBe('#7c3aed');
    expect(colorOPorDefecto('#12', '#7c3aed')).toBe('#7c3aed');
  });
});
