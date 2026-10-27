import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, describe, expect, it } from 'vitest';
import type { Perfil } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { useSesionStore } from '@/store/sesion';
import { routerDePrueba } from '@/test/ayudas';
import Inicio from '../Inicio.vue';

let wrapper: VueWrapper;

async function montar(conSesion = false) {
  const pinia = createPinia();
  setActivePinia(pinia);
  if (conSesion) {
    const sesion = useSesionStore();
    sesion.token = 'TOKEN';
    sesion.usuario = {
      id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol: 'propietario', debeCambiarPassword: false,
      empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
    } as Perfil;
  }
  const router = await routerDePrueba();
  router.addRoute({ path: '/admin/login', name: 'admin-login', component: { template: '<div />' } });
  router.addRoute({ path: '/admin', name: 'admin-inicio', component: { template: '<div />' } });
  wrapper = mount(Inicio, { global: { plugins: [vuetify, pinia, router] }, attachTo: document.body });
  await flushPromises();
  return router;
}

describe('Inicio del panel (la raíz «/»)', () => {
  afterEach(() => wrapper?.unmount());

  it('es una portada del panel, no el sitio viejo: se explica y NO redirige solo al panel', async () => {
    const router = await montar();
    expect(wrapper.text()).toContain('Panel de administración');
    expect(wrapper.text()).not.toContain('Muy pronto');
    expect(router.currentRoute.value.name).toBe('inicio'); // sigue en la raíz
  });

  it('sin sesión ofrece «Ingresar», que lleva al login', async () => {
    await montar();
    const boton = wrapper.find('a[href="/admin/login"]');
    expect(boton.exists()).toBe(true);
    expect(boton.text()).toBe('Ingresar');
    expect(wrapper.text()).not.toContain('Ir al panel');
  });

  it('con sesión ofrece «Ir al panel» (sin entrar solo)', async () => {
    const router = await montar(true);
    const boton = wrapper.find('a[href="/admin"]');
    expect(boton.text()).toBe('Ir al panel');
    expect(wrapper.text()).not.toContain('Ingresar');
    expect(router.currentRoute.value.name).toBe('inicio');
  });

  it('manda a quien busca reservar al sitio público, en otra pestaña no hace falta: es un enlace normal', async () => {
    await montar();
    const enlace = wrapper.find('a[href^="http"]');
    expect(enlace.attributes('href')).toBe('http://localhost:3001');
    expect(enlace.text()).toContain('Ir al sitio de reservas');
  });
});
