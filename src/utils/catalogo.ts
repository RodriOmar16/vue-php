import type { PrecioPor, PublicoMenu, TipoAlimento } from '@/api/tipos';

export const ETIQUETA_TIPO_ALIMENTO: Record<TipoAlimento, string> = { comida: 'Comida', bebida: 'Bebida' };
export const ICONO_TIPO_ALIMENTO: Record<TipoAlimento, string> = {
  comida: 'fa-solid fa-utensils',
  bebida: 'fa-solid fa-martini-glass-citrus',
};

export const ETIQUETA_PUBLICO: Record<PublicoMenu, string> = { ninos: 'Niños', adultos: 'Adultos', todos: 'Todos' };

export const ETIQUETA_PRECIO_POR: Record<PrecioPor, string> = { persona: 'Por persona', fijo: 'Precio fijo' };

/** «Por persona» / «precio fijo» a continuación de un importe ya formateado. */
export const sufijoPrecio = (precioPor: PrecioPor): string => (precioPor === 'persona' ? 'por persona' : 'precio fijo');

/** Restricción de edad de una instalación en palabras (sin límites = apto para todo público). */
export const textoEdades = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return 'Apto para todo público (ATP)';
  if (min !== null && max !== null) return min === max ? `${min} años` : `De ${min} a ${max} años`;
  return min !== null ? `Desde ${min} años` : `Hasta ${max} años`;
};
