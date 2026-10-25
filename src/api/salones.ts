import { cliente } from './cliente';
import type { DatosFranja, DatosSalon, Franja, Salon } from './tipos';

export const listarSalones = (incluirInhabilitados = false) =>
  cliente.get<Salon[]>('/admin/salones', { query: { incluirInhabilitados: incluirInhabilitados || undefined } });

export const obtenerSalon = (id: number) => cliente.get<Salon>(`/admin/salones/${id}`);

export const crearSalon = (datos: DatosSalon) => cliente.post<Salon>('/admin/salones', datos);

export const actualizarSalon = (
  id: number,
  cambios: Partial<Omit<DatosSalon, 'ofrecerCombos'>> & { inhabilitado?: boolean },
) => cliente.patch<Salon>(`/admin/salones/${id}`, cambios);

// ---------- franjas (horario estándar) ----------
export const listarFranjas = (salonId: number) => cliente.get<Franja[]>(`/admin/salones/${salonId}/franjas`);

export const crearFranja = (salonId: number, datos: DatosFranja) =>
  cliente.post<Franja>(`/admin/salones/${salonId}/franjas`, datos);

export const actualizarFranja = (salonId: number, id: number, cambios: Partial<DatosFranja>) =>
  cliente.patch<Franja>(`/admin/salones/${salonId}/franjas/${id}`, cambios);

export const eliminarFranja = (salonId: number, id: number) =>
  cliente.delete(`/admin/salones/${salonId}/franjas/${id}`);
