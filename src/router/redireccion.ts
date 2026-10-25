/**
 * Después del login se vuelve a la página que se pedía (?redirect=...).
 * Solo se acepta una ruta interna del back office, para que nadie pueda armar
 * un enlace de login que te mande a otro sitio ("open redirect").
 */
export const esRedireccionSegura = (valor: unknown): valor is string =>
  typeof valor === 'string' &&
  /^\/admin(\/|\?|#|$)/.test(valor) &&
  !valor.startsWith('/admin/login') &&
  !valor.includes('\\') &&
  !valor.includes('//') &&
  !/[\u0000-\u001f]/.test(valor);
