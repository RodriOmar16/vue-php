/** Color de marca: `#rrggbb` (es lo único que acepta la API). */
const HEX = /^#[0-9a-f]{6}$/i;

export const COLOR_PRINCIPAL_POR_DEFECTO = '#7c3aed';
export const COLOR_ACENTO_POR_DEFECTO = '#f59e0b';

export const esColorHex = (valor: string): boolean => HEX.test(valor);

const canal = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminancia = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};

/** Blanco u oscuro, el que mejor se lee sobre ese fondo (mismo criterio que el sitio público). */
export const colorLegible = (fondo: string): '#ffffff' | '#1c1917' => {
  const l = luminancia(fondo);
  const contraBlanco = 1.05 / (l + 0.05);
  const contraOscuro = (l + 0.05) / (luminancia('#1c1917') + 0.05);
  return contraBlanco >= contraOscuro ? '#ffffff' : '#1c1917';
};

/** El valor escrito si es un color válido; si no, el de por defecto (para la vista previa). */
export const colorOPorDefecto = (valor: string, porDefecto: string): string => (esColorHex(valor.trim()) ? valor.trim().toLowerCase() : porDefecto);
