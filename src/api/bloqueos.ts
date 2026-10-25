import { cliente } from './cliente';
import type { Bloqueo, DatosBloqueo } from './tipos';

/** Con `salonId` la API devuelve también los cierres que afectan a todos los salones. */
export const listarBloqueos = (filtros: { salonId?: number; desde?: string; hasta?: string } = {}) =>
  cliente.get<Bloqueo[]>('/admin/bloqueos', { query: filtros });

export const crearBloqueo = (datos: DatosBloqueo) => cliente.post<Bloqueo>('/admin/bloqueos', datos);

export const actualizarBloqueo = (id: number, cambios: Partial<DatosBloqueo>) =>
  cliente.patch<Bloqueo>(`/admin/bloqueos/${id}`, cambios);

export const eliminarBloqueo = (id: number) => cliente.delete(`/admin/bloqueos/${id}`);
