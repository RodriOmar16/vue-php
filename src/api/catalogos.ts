import { cliente } from './cliente';
import type {
  Alimento,
  DatosInstalacion,
  DatosMenu,
  DatosServicio,
  Instalacion,
  Menu,
  Servicio,
  TipoAlimento,
} from './tipos';

const incluir = (incluirInhabilitados: boolean) => ({ incluirInhabilitados: incluirInhabilitados || undefined });

// ---------- alimentos ----------
export const listarAlimentos = (incluirInhabilitados = false) =>
  cliente.get<Alimento[]>('/admin/alimentos', { query: incluir(incluirInhabilitados) });
export const crearAlimento = (datos: { nombre: string; tipo: TipoAlimento }) =>
  cliente.post<Alimento>('/admin/alimentos', datos);
export const actualizarAlimento = (
  id: number,
  cambios: { nombre?: string; tipo?: TipoAlimento; inhabilitado?: boolean },
) => cliente.patch<Alimento>(`/admin/alimentos/${id}`, cambios);

// ---------- menús ----------
export const listarMenus = (incluirInhabilitados = false) =>
  cliente.get<Menu[]>('/admin/menus', { query: incluir(incluirInhabilitados) });
export const crearMenu = (datos: DatosMenu) => cliente.post<Menu>('/admin/menus', datos);
export const actualizarMenu = (id: number, cambios: Partial<DatosMenu> & { inhabilitado?: boolean }) =>
  cliente.patch<Menu>(`/admin/menus/${id}`, cambios);

// ---------- instalaciones ----------
export const listarInstalaciones = (incluirInhabilitados = false) =>
  cliente.get<Instalacion[]>('/admin/instalaciones', { query: incluir(incluirInhabilitados) });
export const crearInstalacion = (datos: DatosInstalacion) => cliente.post<Instalacion>('/admin/instalaciones', datos);
export const actualizarInstalacion = (id: number, cambios: Partial<DatosInstalacion> & { inhabilitado?: boolean }) =>
  cliente.patch<Instalacion>(`/admin/instalaciones/${id}`, cambios);

// ---------- servicios ----------
export const listarServicios = (incluirInhabilitados = false) =>
  cliente.get<Servicio[]>('/admin/servicios', { query: incluir(incluirInhabilitados) });
export const crearServicio = (datos: DatosServicio) => cliente.post<Servicio>('/admin/servicios', datos);
export const actualizarServicio = (id: number, cambios: Partial<DatosServicio> & { inhabilitado?: boolean }) =>
  cliente.patch<Servicio>(`/admin/servicios/${id}`, cambios);
