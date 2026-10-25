import { cliente } from './cliente';
import type { Perfil, RespuestaLogin } from './tipos';

export const login = (email: string, password: string) =>
  // autenticado: false -> un 401 acá es "credenciales inválidas", no "sesión vencida"
  cliente.post<RespuestaLogin>('/admin/auth/login', { email, password }, { autenticado: false });

export const obtenerPerfil = () => cliente.get<Perfil>('/admin/auth/me');

export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
  cliente.post<{ ok: true }>('/admin/auth/cambiar-password', { passwordActual, passwordNueva });
