import { afterEach, describe, expect, it } from 'vitest';
import {
  autoLoginPermitido,
  credencialesDeDesarrollo,
  impedirAutoLogin,
  permitirAutoLogin,
} from '../autologin';
import { menuPara, type ItemMenu } from '../menu';
import { esRedireccionSegura } from '../redireccion';

describe('esRedireccionSegura (evita el open redirect)', () => {
  it.each(['/admin', '/admin/', '/admin/equipo', '/admin/equipo?x=1', '/admin/salones/3#top', '/admin?a=b'])(
    'acepta %s',
    (ruta) => expect(esRedireccionSegura(ruta)).toBe(true),
  );

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/administrador',
    '/admin//evil.com',
    '/admin/../x//y',
    '/admin/login',
    '/admin/login?redirect=/admin',
    'admin/equipo',
    '/otra/cosa',
    '',
    '/admin/\nSet-Cookie:x',
    null,
    undefined,
    ['/admin'],
    42,
  ])('rechaza %j', (ruta) => expect(esRedireccionSegura(ruta)).toBe(false));
});

describe('menuPara', () => {
  const items: ItemMenu[] = [
    { titulo: 'Inicio', icono: 'i', to: '/admin' },
    { titulo: 'Plataforma', icono: 'i', to: '/admin/plataforma', roles: ['superadmin'] },
    { titulo: 'Equipo', icono: 'i', to: '/admin/equipo', roles: ['propietario'] },
    { titulo: 'Reservas', icono: 'i', to: '/admin/reservas', roles: ['propietario', 'empleado'] },
  ];
  const titulos = (rol: Parameters<typeof menuPara>[0]) => menuPara(rol, items).map((i) => i.titulo);

  it('cada rol ve solo lo suyo', () => {
    expect(titulos('superadmin')).toEqual(['Inicio', 'Plataforma']);
    expect(titulos('propietario')).toEqual(['Inicio', 'Equipo', 'Reservas']);
    expect(titulos('empleado')).toEqual(['Inicio', 'Reservas']);
  });

  it('sin rol no hay menú', () => {
    expect(titulos(null)).toEqual([]);
  });
});

describe('login automático de desarrollo', () => {
  afterEach(() => sessionStorage.clear());

  it('solo con DEV y ambas variables definidas', () => {
    const ok = { DEV: true, VITE_DEV_EMAIL: 'a@b.com', VITE_DEV_PASSWORD: 'x' };
    expect(credencialesDeDesarrollo(ok)).toEqual({ email: 'a@b.com', password: 'x' });
    expect(credencialesDeDesarrollo({ ...ok, DEV: false })).toBeNull(); // build de producción
    expect(credencialesDeDesarrollo({ ...ok, VITE_DEV_PASSWORD: undefined })).toBeNull();
    expect(credencialesDeDesarrollo({ ...ok, VITE_DEV_EMAIL: '' })).toBeNull();
    expect(credencialesDeDesarrollo({ DEV: true })).toBeNull();
  });

  it('tras cerrar sesión a propósito no vuelve a entrar solo, hasta un login manual', () => {
    expect(autoLoginPermitido()).toBe(true);
    impedirAutoLogin();
    expect(autoLoginPermitido()).toBe(false);
    permitirAutoLogin();
    expect(autoLoginPermitido()).toBe(true);
  });
});
