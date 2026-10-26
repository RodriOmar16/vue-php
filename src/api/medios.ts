import { cliente } from './cliente';
import type { Medio, TipoMedio } from './tipos';

/** Máximo de fotos por elemento (la API es quien lo hace cumplir). */
export const MAXIMO_FOTOS: Record<TipoMedio, number> = { salones: 10, combos: 5, instalaciones: 5 };
/** Tamaño máximo del archivo que acepta la API. */
export const BYTES_MAXIMOS = 8 * 1024 * 1024;
export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];

export const listarMedios = (tipo: TipoMedio, id: number) => cliente.get<Medio[]>(`/admin/medios/${tipo}/${id}`);

export const subirMedio = (tipo: TipoMedio, id: number, archivo: File, alt?: string) => {
  const datos = new FormData();
  datos.append('archivo', archivo);
  if (alt) datos.append('alt', alt);
  return cliente.post<Medio>(`/admin/medios/${tipo}/${id}`, datos);
};

export const actualizarMedio = (medioId: number, cambios: { alt?: string | null; esPortada?: boolean }) =>
  cliente.patch<Medio>(`/admin/medios/${medioId}`, cambios);

export const ordenarMedios = (tipo: TipoMedio, id: number, medioIds: number[]) =>
  cliente.put<Medio[]>(`/admin/medios/${tipo}/${id}/orden`, { medioIds });

export const eliminarMedio = (medioId: number) => cliente.delete(`/admin/medios/${medioId}`);
