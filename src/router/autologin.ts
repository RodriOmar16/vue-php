/**
 * Comodidad solo para desarrollo: si definiste VITE_DEV_EMAIL y VITE_DEV_PASSWORD
 * (en .env.development.local, que git ignora), el login se completa solo.
 * Usa el login normal de la API; no hay ningún atajo de autenticación.
 * En el build de producción import.meta.env.DEV es false y esto no hace nada.
 */
const CLAVE_SIN_AUTOLOGIN = 'reservas.sinAutoLogin';

interface EntornoDev {
  DEV: boolean;
  VITE_DEV_EMAIL?: string;
  VITE_DEV_PASSWORD?: string;
}

export const credencialesDeDesarrollo = (
  env: EntornoDev,
): { email: string; password: string } | null =>
  env.DEV && env.VITE_DEV_EMAIL && env.VITE_DEV_PASSWORD
    ? { email: env.VITE_DEV_EMAIL, password: env.VITE_DEV_PASSWORD }
    : null;

/** Tras cerrar sesión a propósito no se debe volver a entrar solo. */
export const autoLoginPermitido = (): boolean => {
  try {
    return sessionStorage.getItem(CLAVE_SIN_AUTOLOGIN) !== '1';
  } catch {
    return true;
  }
};

export const impedirAutoLogin = (): void => {
  try {
    sessionStorage.setItem(CLAVE_SIN_AUTOLOGIN, '1');
  } catch {
    /* sin sessionStorage: no hay forma de recordarlo */
  }
};

export const permitirAutoLogin = (): void => {
  try {
    sessionStorage.removeItem(CLAVE_SIN_AUTOLOGIN);
  } catch {
    /* nada que limpiar */
  }
};
