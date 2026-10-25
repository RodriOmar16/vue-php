/**
 * Convierte un nombre en un slug de URL: minúsculas, sin acentos, palabras unidas por guiones.
 * Cumple la regla de la API: ^[a-z0-9]+(-[a-z0-9]+)*$ (3 a 60 caracteres).
 */
export const slugificar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita los acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // todo lo demás pasa a guion
    .replace(/^-+|-+$/g, '') // sin guiones en los extremos
    .slice(0, 60)
    .replace(/-+$/, ''); // por si el recorte dejó un guion al final

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Slugs que la API reserva porque chocarían con rutas del sitio. */
export const SLUGS_RESERVADOS = ['admin', 'api', 'docs', 'plataforma', 'login', 'cliente', 'public', 'www', 'static', 'assets'];

export const USERNAME_VALIDO = /^[a-z0-9._-]+$/;
