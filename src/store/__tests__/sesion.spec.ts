import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as auth from '@/api/auth';
import { ApiError } from '@/api/http';
import type { Perfil, RespuestaLogin } from '@/api/tipos';
import { leerToken } from '@/api/token';
import { useSesionStore } from '../sesion';

vi.mock('@/api/auth');

const perfil = (extra: Partial<Perfil> = {}): Perfil => ({
  id: 1,
  nombre: 'María',
  username: 'maria',
  email: 'maria@x.com',
  rol: 'propietario',
  debeCambiarPassword: false,
  empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  ...extra,
});
const login = (usuario: Perfil, token = 'T1'): RespuestaLogin => ({
  accessToken: token,
  tokenType: 'Bearer',
  expiresIn: 28800,
  debeCambiarPassword: usuario.debeCambiarPassword,
  usuario,
});

describe('store de sesión', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('arranca sin sesión', () => {
    const s = useSesionStore();
    expect(s.autenticado).toBe(false);
    expect(s.rol).toBeNull();
  });

  it('iniciarSesion guarda el token (también en localStorage) y el perfil', async () => {
    vi.mocked(auth.login).mockResolvedValue(login(perfil()));
    const s = useSesionStore();

    await s.iniciarSesion('  maria@x.com ', 'clave');

    expect(auth.login).toHaveBeenCalledWith('maria@x.com', 'clave'); // email recortado
    expect(s.autenticado).toBe(true);
    expect(s.esDueno).toBe(true);
    expect(s.esEmpleado).toBe(false);
    expect(s.esSuperadmin).toBe(false);
    expect(leerToken()).toBe('T1');
  });

  it('un login fallido no deja nada guardado', async () => {
    vi.mocked(auth.login).mockRejectedValue(new ApiError(401, 'x'));
    const s = useSesionStore();
    await expect(s.iniciarSesion('a@b.com', 'mala')).rejects.toBeInstanceOf(ApiError);
    expect(s.autenticado).toBe(false);
    expect(leerToken()).toBeNull();
  });

  it('reconoce cada rol y la clave temporal', async () => {
    const s = useSesionStore();
    vi.mocked(auth.login).mockResolvedValue(login(perfil({ rol: 'superadmin', empresa: null })));
    await s.iniciarSesion('a@b.com', 'x');
    expect(s.esSuperadmin).toBe(true);
    expect(s.usuario?.empresa).toBeNull();

    vi.mocked(auth.login).mockResolvedValue(login(perfil({ rol: 'empleado', debeCambiarPassword: true })));
    await s.iniciarSesion('a@b.com', 'x');
    expect(s.esEmpleado).toBe(true);
    expect(s.debeCambiarPassword).toBe(true);
  });

  it('cargarPerfil restaura la sesión tras recargar la página (hay token guardado)', async () => {
    localStorage.setItem('reservas.token', 'GUARDADO');
    setActivePinia(createPinia()); // store nuevo: lee el token del almacenamiento
    vi.mocked(auth.obtenerPerfil).mockResolvedValue(perfil({ nombre: 'Restaurada' }));
    const s = useSesionStore();
    expect(s.token).toBe('GUARDADO');
    expect(s.autenticado).toBe(false); // todavía no se sabe quién es

    await s.cargarPerfil();
    expect(s.autenticado).toBe(true);
    expect(s.usuario?.nombre).toBe('Restaurada');
  });

  it('cargarPerfil sin token no llama a la API', async () => {
    await useSesionStore().cargarPerfil();
    expect(auth.obtenerPerfil).not.toHaveBeenCalled();
  });

  it('un 401 al cargar el perfil (token vencido) cierra la sesión limpiamente', async () => {
    localStorage.setItem('reservas.token', 'VENCIDO');
    setActivePinia(createPinia());
    vi.mocked(auth.obtenerPerfil).mockRejectedValue(new ApiError(401, 'x'));
    const s = useSesionStore();

    await expect(s.cargarPerfil()).resolves.toBeUndefined();
    expect(s.token).toBeNull();
    expect(leerToken()).toBeNull();
  });

  it('otros errores (servidor caído) se propagan SIN cerrar la sesión', async () => {
    localStorage.setItem('reservas.token', 'VALIDO');
    setActivePinia(createPinia());
    vi.mocked(auth.obtenerPerfil).mockRejectedValue(new ApiError(0, 'sin conexión'));
    const s = useSesionStore();

    await expect(s.cargarPerfil()).rejects.toMatchObject({ status: 0 });
    expect(s.token).toBe('VALIDO'); // al volver el servidor sigue logueado
  });

  it('cambiarPassword recarga el perfil (ya no debe cambiarla)', async () => {
    vi.mocked(auth.login).mockResolvedValue(login(perfil({ debeCambiarPassword: true })));
    vi.mocked(auth.cambiarPassword).mockResolvedValue({ ok: true });
    vi.mocked(auth.obtenerPerfil).mockResolvedValue(perfil({ debeCambiarPassword: false }));
    const s = useSesionStore();
    await s.iniciarSesion('a@b.com', 'temporal');
    expect(s.debeCambiarPassword).toBe(true);

    await s.cambiarPassword('temporal', 'nueva-clave-segura');
    expect(auth.cambiarPassword).toHaveBeenCalledWith('temporal', 'nueva-clave-segura');
    expect(s.debeCambiarPassword).toBe(false);
  });

  it('cerrarSesion limpia token, perfil y almacenamiento', async () => {
    vi.mocked(auth.login).mockResolvedValue(login(perfil()));
    const s = useSesionStore();
    await s.iniciarSesion('a@b.com', 'x');

    s.cerrarSesion();
    expect(s.autenticado).toBe(false);
    expect(s.usuario).toBeNull();
    expect(leerToken()).toBeNull();
  });
});
