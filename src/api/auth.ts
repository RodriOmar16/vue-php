import { cliente } from './cliente';
import type { Perfil, RespuestaLogin } from './tipos';

export const login = (email: string, password: string) =>
  // autenticado: false -> un 401 acá es "credenciales inválidas", no "sesión vencida"
  cliente.post<RespuestaLogin>('/admin/auth/login', { email, password }, { autenticado: false });

/** Pide el enlace para restablecer la clave. La respuesta es siempre la misma, exista o no el email. */
export const olvidePassword = (email: string) =>
  cliente.post<{ ok: true }>('/admin/auth/olvide-password', { email }, { autenticado: false });

/** Elige una clave nueva con el código del enlace del mail. Cierra las sesiones anteriores. */
export const restablecerPassword = (token: string, password: string) =>
  cliente.post<{ ok: true }>('/admin/auth/restablecer-password', { token, password }, { autenticado: false });

export const obtenerPerfil = () => cliente.get<Perfil>('/admin/auth/me');

export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
  cliente.post<{ ok: true }>('/admin/auth/cambiar-password', { passwordActual, passwordNueva });
