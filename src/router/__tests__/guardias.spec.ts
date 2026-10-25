import { describe, expect, it } from 'vitest';
import type { RolCodigo } from '@/api/tipos';
import { decidirNavegacion, type EstadoSesion, type MetaRuta } from '../guardias';

const sesion = (extra: Partial<EstadoSesion> = {}): EstadoSesion => ({
  autenticado: true,
  debeCambiarPassword: false,
  rol: 'propietario',
  ...extra,
});
const anonimo = sesion({ autenticado: false, rol: null });
const ruta = (meta: MetaRuta, fullPath = '/admin/algo') => ({ meta, fullPath });

describe('decidirNavegacion', () => {
  it('las rutas públicas se permiten a cualquiera', () => {
    expect(decidirNavegacion(ruta({}, '/'), anonimo)).toEqual({ permitir: true });
    expect(decidirNavegacion(ruta({}, '/'), sesion())).toEqual({ permitir: true });
  });

  it('sin sesión, una ruta protegida manda al login recordando a dónde iba', () => {
    expect(decidirNavegacion(ruta({ requiereAuth: true }, '/admin/equipo?x=1'), anonimo)).toEqual({
      permitir: false,
      redirigir: { name: 'admin-login', query: { redirect: '/admin/equipo?x=1' } },
    });
  });

  it('con sesión, el login no tiene sentido: manda al inicio del panel', () => {
    expect(decidirNavegacion(ruta({ soloInvitado: true }), sesion())).toEqual({
      permitir: false,
      redirigir: { name: 'admin-inicio' },
    });
    expect(decidirNavegacion(ruta({ soloInvitado: true }), anonimo)).toEqual({ permitir: true });
  });

  it('con clave temporal solo se puede cambiar la clave', () => {
    const temporal = sesion({ debeCambiarPassword: true });
    expect(decidirNavegacion(ruta({ requiereAuth: true }), temporal)).toEqual({
      permitir: false,
      redirigir: { name: 'admin-cambiar-password' },
    });
    expect(decidirNavegacion(ruta({ requiereAuth: true, permiteCambioPassword: true }), temporal)).toEqual({ permitir: true });
  });

  it('cambiar la clave de forma voluntaria también se permite', () => {
    expect(decidirNavegacion(ruta({ requiereAuth: true, permiteCambioPassword: true }), sesion())).toEqual({ permitir: true });
  });

  describe('roles', () => {
    const soloDueno = ruta({ requiereAuth: true, roles: ['propietario'] });

    it('deja pasar al rol indicado', () => {
      expect(decidirNavegacion(soloDueno, sesion({ rol: 'propietario' }))).toEqual({ permitir: true });
    });

    it.each<RolCodigo>(['empleado', 'superadmin'])('rechaza a %s con un aviso y lo manda al inicio', (rol) => {
      const decision = decidirNavegacion(soloDueno, sesion({ rol }));
      expect(decision).toMatchObject({ permitir: false, redirigir: { name: 'admin-inicio' } });
      expect(decision.permitir === false && decision.mensaje).toContain('permiso');
    });

    it('sin rol conocido no entra', () => {
      expect(decidirNavegacion(soloDueno, sesion({ rol: null }))).toMatchObject({ permitir: false });
    });

    it('varios roles permitidos', () => {
      const duenoOEmpleado = ruta({ requiereAuth: true, roles: ['propietario', 'empleado'] });
      expect(decidirNavegacion(duenoOEmpleado, sesion({ rol: 'empleado' }))).toEqual({ permitir: true });
      expect(decidirNavegacion(duenoOEmpleado, sesion({ rol: 'superadmin' }))).toMatchObject({ permitir: false });
    });
  });

  it('el orden importa: sin sesión se pide login antes que revisar roles', () => {
    expect(decidirNavegacion(ruta({ requiereAuth: true, roles: ['propietario'] }), anonimo)).toMatchObject({
      redirigir: { name: 'admin-login' },
    });
  });

  it('la clave temporal se atiende antes que los roles', () => {
    const temporal = sesion({ debeCambiarPassword: true, rol: 'empleado' });
    expect(decidirNavegacion(ruta({ requiereAuth: true, roles: ['propietario'] }), temporal)).toMatchObject({
      redirigir: { name: 'admin-cambiar-password' },
    });
  });
});
