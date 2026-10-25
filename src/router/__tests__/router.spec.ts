import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as auth from '@/api/auth';
import { ApiError } from '@/api/http';
import type { Perfil } from '@/api/tipos';
import { leerToken } from '@/api/token';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import router from '../index';

vi.mock('@/api/auth');

const perfil = (extra: Partial<Perfil> = {}): Perfil => ({
  id: 1, nombre: 'María', username: 'maria', email: 'maria@x.com',
  rol: 'propietario', debeCambiarPassword: false, empresa: { id: 1, slug: 'demo', nombre: 'Demo' },
  ...extra,
});

/** Navega con el router REAL de la app (rutas, metas, guardias y carga de sesión). */
const ir = async (ruta: string) => {
  await router.push(ruta).catch(() => undefined);
  return router.currentRoute.value;
};

describe('router de la aplicación (rutas + guardias + sesión)', () => {
  beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
    // sale de cualquier ruta anterior sin pasar por los guardias de este test
    await router.replace('/');
  });

  describe('sin sesión', () => {
    it('el sitio público es accesible', async () => {
      expect((await ir('/')).name).toBe('inicio');
    });

    it('/home redirige al inicio y una ruta inexistente muestra la 404', async () => {
      expect((await ir('/home')).name).toBe('inicio');
      expect((await ir('/cosa/inexistente')).name).toBe('no-encontrada');
    });

    it('el panel pide login y recuerda a dónde iba', async () => {
      const ruta = await ir('/admin');
      expect(ruta.name).toBe('admin-login');
      expect(ruta.query.redirect).toBe('/admin');

      const otra = await ir('/admin/cambiar-password');
      expect(otra.name).toBe('admin-login');
      expect(otra.query.redirect).toBe('/admin/cambiar-password');
    });

    it('el login es accesible', async () => {
      expect((await ir('/admin/login')).name).toBe('admin-login');
    });
  });

  describe('con una sesión guardada (recarga de página)', () => {
    beforeEach(() => {
      localStorage.setItem('reservas.token', 'GUARDADO');
      setActivePinia(createPinia()); // store nuevo: lee el token guardado
    });

    it('carga el perfil, entra al panel y no vuelve a pedirlo en cada navegación', async () => {
      vi.mocked(auth.obtenerPerfil).mockResolvedValue(perfil());
      expect((await ir('/admin')).name).toBe('admin-inicio');
      expect(useSesionStore().usuario?.nombre).toBe('María');

      await ir('/admin/cambiar-password');
      await ir('/admin');
      expect(auth.obtenerPerfil).toHaveBeenCalledTimes(1);
    });

    it('con la sesión iniciada, el login manda al panel', async () => {
      vi.mocked(auth.obtenerPerfil).mockResolvedValue(perfil());
      expect((await ir('/admin/login')).name).toBe('admin-inicio');
    });

    it('token vencido (401): limpia la sesión y manda al login', async () => {
      vi.mocked(auth.obtenerPerfil).mockRejectedValue(new ApiError(401, 'x'));
      const ruta = await ir('/admin');
      expect(ruta.name).toBe('admin-login');
      expect(leerToken()).toBeNull();
      expect(useSesionStore().autenticado).toBe(false);
    });

    it('servidor caído: avisa y manda al login, pero NO borra el token guardado', async () => {
      vi.mocked(auth.obtenerPerfil).mockRejectedValue(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      const ruta = await ir('/admin');
      expect(ruta.name).toBe('admin-login');
      expect(genericosStore().textoSnack).toContain('No se pudo conectar');
      expect(genericosStore().colorSnack).toBe('error');
      expect(leerToken()).toBe('GUARDADO'); // al volver el servidor, no tiene que volver a loguearse
    });

    it('con clave temporal solo puede ir a cambiarla', async () => {
      vi.mocked(auth.obtenerPerfil).mockResolvedValue(perfil({ debeCambiarPassword: true }));
      expect((await ir('/admin')).name).toBe('admin-cambiar-password');
      expect((await ir('/admin/cambiar-password')).name).toBe('admin-cambiar-password');
    });
  });

  it('el logout deja de dar acceso al panel', async () => {
    localStorage.setItem('reservas.token', 'T');
    setActivePinia(createPinia());
    vi.mocked(auth.obtenerPerfil).mockResolvedValue(perfil());
    expect((await ir('/admin')).name).toBe('admin-inicio');

    useSesionStore().cerrarSesion();
    await ir('/'); // sale del panel (ir a la misma ruta sería una navegación duplicada, sin guardias)
    expect((await ir('/admin')).name).toBe('admin-login');
  });
});
