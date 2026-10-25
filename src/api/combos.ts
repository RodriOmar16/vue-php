import { cliente } from './cliente';
import type { Combo, Cotizacion, DatosCombo, DatosTarifa, Tarifa } from './tipos';

export const listarCombos = (incluirInhabilitados = false) =>
  cliente.get<Combo[]>('/admin/combos', { query: { incluirInhabilitados: incluirInhabilitados || undefined } });

export const obtenerCombo = (id: number) => cliente.get<Combo>(`/admin/combos/${id}`);

export const crearCombo = (datos: DatosCombo) => cliente.post<Combo>('/admin/combos', datos);

export const actualizarCombo = (id: number, cambios: Partial<DatosCombo> & { inhabilitado?: boolean }) =>
  cliente.patch<Combo>(`/admin/combos/${id}`, cambios);

// ---------- tarifas ----------
export const listarTarifas = (comboId: number, incluirInhabilitadas = true) =>
  cliente.get<Tarifa[]>(`/admin/combos/${comboId}/tarifas`, {
    query: { incluirInhabilitadas: incluirInhabilitadas || undefined },
  });

export const crearTarifa = (comboId: number, datos: DatosTarifa) =>
  cliente.post<Tarifa>(`/admin/combos/${comboId}/tarifas`, datos);

export const actualizarTarifa = (comboId: number, id: number, cambios: Partial<DatosTarifa> & { inhabilitado?: boolean }) =>
  cliente.patch<Tarifa>(`/admin/combos/${comboId}/tarifas/${id}`, cambios);

export const eliminarTarifa = (comboId: number, id: number) => cliente.delete(`/admin/combos/${comboId}/tarifas/${id}`);

// ---------- cotizador ----------
export const cotizarCombo = (comboId: number, consulta: { salonId: number; fecha: string; invitados: number }) =>
  cliente.get<Cotizacion>(`/admin/combos/${comboId}/cotizar`, { query: consulta });
