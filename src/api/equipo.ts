import { cliente } from './cliente';
import type { AltaUsuario, RespuestaAltaUsuario, RolEquipo, UsuarioEquipo } from './tipos';

export const listarEquipo = (incluirInhabilitados = false) =>
  cliente.get<UsuarioEquipo[]>('/admin/usuarios', {
    query: { incluirInhabilitados: incluirInhabilitados || undefined },
  });

export const crearUsuario = (datos: AltaUsuario) =>
  cliente.post<RespuestaAltaUsuario>('/admin/usuarios', datos);

export const actualizarUsuario = (
  id: number,
  cambios: { nombre?: string; rol?: RolEquipo; inhabilitado?: boolean },
) => cliente.patch<UsuarioEquipo>(`/admin/usuarios/${id}`, cambios);

export const resetearPasswordUsuario = (id: number) =>
  cliente.post<{ passwordTemporal: string }>(`/admin/usuarios/${id}/resetear-password`);
