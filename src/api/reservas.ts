import { cliente } from './cliente';
import type { DatosNuevoPago, FiltroReservas, PaginaReservas, ReservaDetalleAdmin, ResultadoPago, ResumenReservas } from './tipos';

export const resumenReservas = () => cliente.get<ResumenReservas>('/admin/reservas/resumen');

export const listarReservas = (filtro: FiltroReservas = {}) =>
  cliente.get<PaginaReservas>('/admin/reservas', { query: { ...filtro } });

export const obtenerReserva = (id: string) => cliente.get<ReservaDetalleAdmin>(`/admin/reservas/${id}`);

/** Registra un pago recibido por fuera del sitio (efectivo o una transferencia ya verificada). */
export const registrarPago = (reservaId: string, datos: DatosNuevoPago) =>
  cliente.post<ResultadoPago>(`/admin/reservas/${reservaId}/pagos`, datos);

export const aprobarPago = (pagoId: string) => cliente.post<ResultadoPago>(`/admin/pagos/${pagoId}/aprobar`);

export const rechazarPago = (pagoId: string, motivo: string) =>
  cliente.post<ResultadoPago>(`/admin/pagos/${pagoId}/rechazar`, { motivo });

/** El comprobante no tiene dirección pública: se descarga con la sesión del personal. */
export const descargarComprobante = (pagoId: string) => cliente.descargar(`/admin/pagos/${pagoId}/comprobante`);
