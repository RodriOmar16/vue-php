import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { VApp } from 'vuetify/components';
import type { Perfil } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { autoLoginPermitido } from '@/router/autologin';
import { useSesionStore } from '@/store/sesion';
import LayoutAdmin from '../LayoutAdmin.vue';

const perfil = (extra: Partial<Perfil> = {}): Perfil => ({
  id: 1, nombre: 'María Pérez', username: 'maria', email: 'maria@x.com',
  rol: 'propietario', debeCambiarPassword: false, empresa: { id: 1, slug: 'demo', nombre: 'Salón Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  ...extra,
});

async function montar(usuario: Perfil) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const sesion = useSesionStore();
  sesion.usuario = usuario;
  sesion.token = 'T';

  const vacio = { template: '<div class="contenido">contenido</div>' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: vacio },
      {
        path: '/admin',
        component: LayoutAdmin,
        children: [
          { path: '', name: 'admin-inicio', component: vacio },
          { path: 'cambiar-password', name: 'admin-cambiar-password', component: vacio },
          // las rutas a las que apunta el menú deben existir en este router de prueba
          { path: 'plataforma/empresas', name: 'admin-plataforma-empresas', component: vacio },
          { path: 'equipo', name: 'admin-equipo', component: vacio },
          { path: 'salones', name: 'admin-salones', component: vacio },
          { path: 'cierres', name: 'admin-bloqueos', component: vacio },
          { path: 'catalogo/menus', name: 'admin-catalogo-menus', component: vacio },
          { path: 'combos', name: 'admin-combos', component: vacio },
          { path: 'marca', name: 'admin-marca', component: vacio },
          { path: 'reservas', name: 'admin-reservas', component: vacio },
          { path: 'calendario', name: 'admin-calendario', component: vacio },
        ],
      },
    ],
  });
  await router.push('/admin');
  await router.isReady();
  // El layout usa componentes de layout de Vuetify, que necesitan estar dentro de <v-app>
  const Raiz = defineComponent({ render: () => h(VApp, null, { default: () => h(RouterView) }) });
  const wrapper = mount(Raiz, { global: { plugins: [vuetify, pinia, router] }, attachTo: document.body });
  await flushPromises();
  return { wrapper, router, sesion };
}

describe('LayoutAdmin', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('muestra el nombre de la empresa, la persona, su rol y el menú', async () => {
    const { wrapper } = await montar(perfil());
    const texto = document.body.textContent ?? '';
    expect(texto).toContain('Salón Demo');
    expect(texto).toContain('María Pérez');
    expect(texto).toContain('Dueño');
    expect(texto).toContain('Inicio'); // opción del menú lateral
    expect(wrapper.find('.contenido').exists()).toBe(true); // la vista hija se renderiza
  });

  it('el empleado ve «Empleado» y el superadmin ve el título de la plataforma', async () => {
    await montar(perfil({ rol: 'empleado' }));
    expect(document.body.textContent).toContain('Empleado');
    expect(document.body.textContent).not.toContain('Dueño');

    document.body.innerHTML = '';
    await montar(perfil({ rol: 'superadmin', empresa: null, nombre: 'Yo' }));
    expect(document.body.textContent).toContain('Administración de la plataforma');
    expect(document.body.textContent).toContain('Superadmin');
  });

  it('con clave temporal no hay menú de navegación ni botón para abrirlo', async () => {
    await montar(perfil({ debeCambiarPassword: true }));
    expect(document.querySelector('.v-navigation-drawer')).toBeNull();
    expect(document.querySelector('[aria-label="Abrir menú"]')).toBeNull();
  });

  it('con la sesión normal sí hay menú lateral', async () => {
    await montar(perfil());
    expect(document.querySelector('.v-navigation-drawer')).not.toBeNull();
  });

  it('cerrar sesión limpia todo, va al login y desactiva el login automático de desarrollo', async () => {
    const { wrapper, router, sesion } = await montar(perfil());
    expect(autoLoginPermitido()).toBe(true);

    const botonUsuario = wrapper.findAll('button').find((b) => b.text().includes('María Pérez'));
    await botonUsuario!.trigger('click'); // abre el menú de la persona
    await flushPromises();
    const salir = [...document.querySelectorAll('.v-list-item')].find((e) => e.textContent?.includes('Cerrar sesión'));
    expect(salir).toBeDefined();
    (salir as HTMLElement).click();
    await flushPromises();

    expect(sesion.autenticado).toBe(false);
    expect(localStorage.getItem('reservas.token')).toBeNull();
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('admin-login'));
    expect(autoLoginPermitido()).toBe(false);
  });
});
