/**
 * Ayudantes para probar pantallas con Vuetify en jsdom.
 * Los diálogos se montan en <body>; los cerrados siguen en el DOM y sus animaciones no
 * terminan, así que siempre se busca dentro del diálogo ACTIVO (.v-overlay--active).
 */
import { DOMWrapper, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { expect } from 'vitest';

export const botonAria = (etiqueta: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${etiqueta}"]`);

export const botonPorTexto = (texto: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(texto));

/** Botón dentro del diálogo abierto en este momento. */
export const botonActivo = (texto: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.v-overlay--active button')].find((b) => b.textContent?.includes(texto));

export const hayDialogoActivo = (selector = '') => document.querySelector(`.v-overlay--active ${selector}`.trim()) !== null;

export const clic = async (el: Element | null | undefined) => {
  expect(el, 'no se encontró el elemento').toBeTruthy();
  (el as HTMLElement).click();
  await flushPromises();
};

/** Input asociado a la etiqueta (la primera que empiece con ese texto). */
export const campo = (etiqueta: string): DOMWrapper<HTMLInputElement> => {
  const etiquetas = [...document.querySelectorAll('label[for]')];
  const label = etiquetas.find((l) => l.textContent?.trim().startsWith(etiqueta));
  if (!label) {
    throw new Error(`No hay un campo «${etiqueta}». Etiquetas presentes: ${etiquetas.map((l) => l.textContent?.trim()).join(' | ')}`);
  }
  const input = document.getElementById(label.getAttribute('for')!) as HTMLInputElement | null;
  if (!input) throw new Error(`La etiqueta «${etiqueta}» apunta a un input que no existe (${label.getAttribute('for')})`);
  return new DOMWrapper(input);
};

export const escribir = async (etiqueta: string, valor: string) => {
  await campo(etiqueta).setValue(valor);
  await flushPromises();
};

export const textoPantalla = () => document.body.textContent ?? '';

/** Router mínimo con las rutas por nombre que usan las pantallas (para los enlaces `:to`). */
export const routerDePrueba = async (inicial = '/'): Promise<Router> => {
  const vacio = { template: '<div />' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: vacio },
      { path: '/admin/salones', name: 'admin-salones', component: vacio },
      { path: '/admin/salones/:id/horarios', name: 'admin-salon-horarios', component: vacio },
      { path: '/admin/cierres', name: 'admin-bloqueos', component: vacio },
      { path: '/admin/combos', name: 'admin-combos', component: vacio },
      { path: '/admin/reservas', name: 'admin-reservas', component: vacio },
      { path: '/admin/reservas/:id', name: 'admin-reserva-detalle', component: vacio },
      { path: '/admin/combos/:id', name: 'admin-combo-detalle', component: vacio },
    ],
  });
  await router.push(inicial);
  await router.isReady();
  return router;
};
