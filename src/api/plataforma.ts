import { cliente } from './cliente';
import type {
  AltaEmpresa,
  EmpresaPlataforma,
  RespuestaAltaEmpresa,
  RespuestaResetDueno,
} from './tipos';

export const listarEmpresas = () => cliente.get<EmpresaPlataforma[]>('/plataforma/empresas');

export const crearEmpresa = (datos: AltaEmpresa) =>
  cliente.post<RespuestaAltaEmpresa>('/plataforma/empresas', datos);

export const actualizarEmpresa = (
  id: number,
  cambios: { nombre?: string; inhabilitado?: boolean; zonaHoraria?: string },
) => cliente.patch<Omit<EmpresaPlataforma, '_count'>>(`/plataforma/empresas/${id}`, cambios);

/** Sin usuarioId solo funciona si la empresa tiene un único dueño activo; si no, la API responde 400 con la lista. */
export const resetearDueno = (empresaId: number, usuarioId?: number) =>
  cliente.post<RespuestaResetDueno>(`/plataforma/empresas/${empresaId}/resetear-dueno`, usuarioId ? { usuarioId } : {});
