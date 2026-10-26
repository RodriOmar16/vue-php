import { cliente } from './cliente';
import type { CambiosMarca, MarcaEmpresa } from './tipos';

/** Tamaño máximo del logo que acepta la API. */
export const BYTES_MAXIMOS_LOGO = 5 * 1024 * 1024;
export const TIPOS_ACEPTADOS_LOGO = ['image/jpeg', 'image/png', 'image/webp'];

export const obtenerMarca = () => cliente.get<MarcaEmpresa>('/admin/marca');

export const actualizarMarca = (cambios: CambiosMarca) => cliente.patch<MarcaEmpresa>('/admin/marca', cambios);

export const subirLogo = (archivo: File) => {
  const datos = new FormData();
  datos.append('archivo', archivo);
  return cliente.put<MarcaEmpresa>('/admin/marca/logo', datos);
};

export const quitarLogo = () => cliente.delete<MarcaEmpresa>('/admin/marca/logo');
