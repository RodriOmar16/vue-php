import { cliente } from './cliente';
import type { DatosCancelacion, DatosNuevoPago, FiltroReservas, MetodoDevolucion, PaginaReservas, ReservaDetalleAdmin, ResultadoPago, ResumenReservas } from './tipos';

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

/** Cancela la reserva y libera el horario. El reembolso queda PENDIENTE hasta que se confirme que se devolvió el dinero. */
export const cancelarReserva = (reservaId: string, datos: DatosCancelacion) =>
  cliente.post<ResultadoPago>(`/admin/reservas/${reservaId}/cancelar`, datos);

/** Acuerda una devolución de dinero (queda pendiente). */
export const registrarReembolso = (reservaId: string, datos: { monto: number; metodo: MetodoDevolucion }) =>
  cliente.post<ResultadoPago>(`/admin/reservas/${reservaId}/reembolsos`, datos);

/** Confirma que el dinero YA se devolvió: es lo único que pasa un reembolso a aprobado. */
export const reembolsoRealizado = (pagoId: string, metodo: MetodoDevolucion) =>
  cliente.post<ResultadoPago>(`/admin/pagos/${pagoId}/reembolso-realizado`, { metodo });

export const anularReembolso = (pagoId: string, motivo: string) =>
  cliente.post<ResultadoPago>(`/admin/pagos/${pagoId}/reembolso-anulado`, { motivo });
