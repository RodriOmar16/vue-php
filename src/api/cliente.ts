import { ClienteHttp } from './http';
import { leerToken } from './token';

/**
 * Cliente único de la aplicación. Los avisos de sesión (401, clave temporal)
 * se conectan en main.ts, donde ya existen el router y los stores.
 */
export const cliente = new ClienteHttp({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  obtenerToken: leerToken,
});
