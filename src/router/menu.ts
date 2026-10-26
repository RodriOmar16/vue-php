import type { RouteLocationRaw } from 'vue-router';
import type { RolCodigo } from '@/api/tipos';

export interface ItemMenu {
  titulo: string;
  icono: string;
  to: RouteLocationRaw;
  /** Sin `roles` lo ven todos los usuarios con sesión */
  roles?: RolCodigo[];
}

/**
 * Menú lateral del back office. Cada rebanada agrega su opción acá, con los
 * roles que corresponden (las mismas restricciones que declara su ruta).
 */
export const ITEMS_MENU: ItemMenu[] = [
  { titulo: 'Inicio', icono: 'fa-solid fa-house', to: { name: 'admin-inicio' } },
  { titulo: 'Reservas', icono: 'fa-solid fa-calendar-check', to: { name: 'admin-reservas' }, roles: ['propietario', 'empleado'] },
  { titulo: 'Calendario', icono: 'fa-solid fa-calendar-days', to: { name: 'admin-calendario' }, roles: ['propietario', 'empleado'] },
  { titulo: 'Salones', icono: 'fa-solid fa-champagne-glasses', to: { name: 'admin-salones' }, roles: ['propietario', 'empleado'] },
  { titulo: 'Catálogo', icono: 'fa-solid fa-book-open', to: { name: 'admin-catalogo-menus' }, roles: ['propietario', 'empleado'] },
  { titulo: 'Combos', icono: 'fa-solid fa-gift', to: { name: 'admin-combos' }, roles: ['propietario', 'empleado'] },
  { titulo: 'Cierres', icono: 'fa-solid fa-calendar-xmark', to: { name: 'admin-bloqueos' }, roles: ['propietario', 'empleado'] },
  { titulo: 'Marca', icono: 'fa-solid fa-palette', to: { name: 'admin-marca' }, roles: ['propietario'] },
  { titulo: 'Equipo', icono: 'fa-solid fa-users', to: { name: 'admin-equipo' }, roles: ['propietario'] },
  {
    titulo: 'Empresas',
    icono: 'fa-solid fa-building',
    to: { name: 'admin-plataforma-empresas' },
    roles: ['superadmin'],
  },
];

export const menuPara = (rol: RolCodigo | null, items: ItemMenu[] = ITEMS_MENU): ItemMenu[] =>
  rol ? items.filter((item) => !item.roles || item.roles.includes(rol)) : [];
