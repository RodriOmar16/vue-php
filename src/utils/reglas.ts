/**
 * Reglas de validación de formularios (Vuetify las llama con el valor y esperan
 * `true` o el texto del error). Espejan lo que valida la API, para avisar antes de enviar.
 */
export const requerido = (v: unknown): true | string =>
  (typeof v === 'string' ? !!v.trim() : v !== null && v !== undefined && v !== '') || 'Campo obligatorio';

export const maximo =
  (n: number) =>
  (v: string): true | string =>
    (v?.length ?? 0) <= n || `Máximo ${n} caracteres`;

export const email = (v: string): true | string =>
  /^\S+@\S+\.\S+$/.test(v ?? '') || 'Ingresá un email válido';

export const usernameFormato = (v: string): true | string =>
  !v || /^[a-z0-9._-]+$/.test(v) || 'Solo minúsculas, números, punto, guion y guion bajo';

export const usernameLargo = (v: string): true | string =>
  !v || (v.length >= 3 && v.length <= 30) || 'Entre 3 y 30 caracteres';

/** Sugiere un nombre de usuario a partir de un email: «Ana.Gomez@x.com» -> «ana.gomez». */
export const usernameDesdeEmail = (correo: string): string =>
  (correo.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30);
