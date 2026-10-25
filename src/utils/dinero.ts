/**
 * Importes en pesos. La API los devuelve como texto con 2 decimales («1500.00») para no
 * arrastrar errores de punto flotante, y los recibe como número con hasta 2 decimales.
 * El front solo los MUESTRA y los edita: nunca suma ni calcula totales.
 */

const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

/** «1500.00» -> «$ 1.500,00». Si no es un número válido devuelve el texto tal cual. */
export const formatearImporte = (texto: string | null | undefined): string => {
  if (texto === null || texto === undefined || texto === '') return '—';
  const n = Number(texto);
  return Number.isFinite(n) ? formato.format(n) : texto;
};

/** Texto de un input numérico -> número, o null si está vacío o no es válido. */
export const aNumero = (texto: string): number | null => {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
};

export const MAX_IMPORTE = 99_999_999.99;

/** Regla de formulario: importe de 0 a 99.999.999,99 con hasta 2 decimales (vacío lo valida «requerido»). */
export const importeValido = (v: string): true | string => {
  const limpio = String(v ?? '').trim();
  if (limpio === '') return true;
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return 'Un importe positivo con hasta 2 decimales (por ejemplo 1500.50)';
  return Number(limpio) <= MAX_IMPORTE || 'El importe es demasiado grande';
};
