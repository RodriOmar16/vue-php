import { describe, expect, it } from 'vitest';
import { email, maximo, requerido, usernameDesdeEmail, usernameFormato, usernameLargo } from '../reglas';

describe('reglas de formulario', () => {
  it('requerido', () => {
    expect(requerido('hola')).toBe(true);
    expect(requerido(5)).toBe(true);
    expect(requerido(0)).toBe(true); // el cero es un valor válido
    for (const vacio of ['', '   ', null, undefined]) expect(requerido(vacio)).toBe('Campo obligatorio');
  });

  it('maximo', () => {
    expect(maximo(3)('abc')).toBe(true);
    expect(maximo(3)('abcd')).toBe('Máximo 3 caracteres');
  });

  it('email', () => {
    expect(email('a@b.com')).toBe(true);
    for (const malo of ['', 'a@b', 'sin arroba', 'a b@c.com']) expect(email(malo)).toBe('Ingresá un email válido');
  });

  it('username: formato y largo (vacío lo valida «requerido»)', () => {
    expect(usernameFormato('maria.perez-1_x')).toBe(true);
    expect(usernameFormato('María')).not.toBe(true);
    expect(usernameFormato('')).toBe(true);
    expect(usernameLargo('abc')).toBe(true);
    expect(usernameLargo('ab')).not.toBe(true);
    expect(usernameLargo('a'.repeat(31))).not.toBe(true);
  });

  it('usernameDesdeEmail genera algo válido', () => {
    expect(usernameDesdeEmail('Ana.Gomez@correo.com')).toBe('ana.gomez');
    // los caracteres no permitidos (ñ, tildes, +) se descartan
    expect(usernameDesdeEmail('ñandú+x@x.com')).toBe('andx');
    expect(usernameFormato(usernameDesdeEmail('Ñ+Raro!!@x.com'))).toBe(true);
    expect(usernameDesdeEmail('a'.repeat(50) + '@x.com').length).toBe(30);
  });
});
