/**
 * Persistencia del token de sesión. localStorage es la fuente de verdad (así
 * cerrar sesión en otra pestaña se nota en todas). Solo si localStorage no está
 * disponible (modo privado, datos bloqueados) se usa una copia en memoria, y la
 * sesión dura lo que la pestaña.
 */
const CLAVE = 'reservas.token';
let enMemoria: string | null = null;

export const leerToken = (): string | null => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return enMemoria;
  }
};

export const guardarToken = (token: string): void => {
  enMemoria = token;
  try {
    localStorage.setItem(CLAVE, token);
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
};

export const borrarToken = (): void => {
  enMemoria = null;
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que borrar */
  }
};
