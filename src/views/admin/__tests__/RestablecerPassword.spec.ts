import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import * as auth from '@/api/auth';
import { ApiError } from '@/api/http';
import vuetify from '@/plugins/vuetify';
import { botonPorTexto, clic, escribir } from '@/test/ayudas';
import RestablecerPassword from '../RestablecerPassword.vue';

vi.mock('@/api/auth');

const CODIGO = 'a'.repeat(43);
let wrapper: VueWrapper;

async function montar(ruta = `/admin/restablecer?token=${CODIGO}`) {
  setActivePinia(createPinia());
  const vacio = { template: '<div />' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: vacio },
      { path: '/admin/olvide', name: 'admin-olvide', component: vacio },
      { path: '/admin/restablecer', name: 'admin-restablecer', component: vacio },
    ],
  });
  await router.push(ruta);
  await router.isReady();
  wrapper = mount(RestablecerPassword, { global: { plugins: [vuetify, router] }, attachTo: document.body });
  await flushPromises();
}

const guardar = () => clic(botonPorTexto('Guardar mi contraseña'));

describe('RestablecerPassword (panel)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  it('con el código del enlace y una clave válida, la manda junto con el código', async () => {
    vi.mocked(auth.restablecerPassword).mockResolvedValue({ ok: true });
    await montar();
    await escribir('Contraseña nueva', 'clave-nueva-larga-1');
    await escribir('Repetí la contraseña', 'clave-nueva-larga-1');
    await guardar();
    expect(auth.restablecerPassword).toHaveBeenCalledWith(CODIGO, 'clave-nueva-larga-1');
    expect(wrapper.find('[data-testid="listo"]').text()).toContain('Cambiaste tu contraseña');
    expect(wrapper.find('[data-testid="listo"]').text()).toContain('cerramos las sesiones');
  });

  it('exige 10 caracteres y que coincidan, sin llamar a la API', async () => {
    await montar();
    await guardar();
    expect(document.body.textContent).toContain('Campo obligatorio');
    await escribir('Contraseña nueva', 'corta-9');
    await escribir('Repetí la contraseña', 'corta-9');
    await guardar();
    expect(document.body.textContent).toContain('Mínimo 10 caracteres');
    await escribir('Contraseña nueva', 'clave-nueva-larga-1');
    await escribir('Repetí la contraseña', 'otra-distinta-123');
    await guardar();
    expect(document.body.textContent).toContain('Las contraseñas no coinciden');
    expect(auth.restablecerPassword).not.toHaveBeenCalled();
  });

  it('sin código en la dirección explica que el enlace no es válido y ofrece pedir otro', async () => {
    await montar('/admin/restablecer');
    expect(wrapper.find('[data-testid="sin-enlace"]').text()).toContain('no es válido');
    expect(wrapper.find('a[href="/admin/olvide"]').exists()).toBe(true);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('con un enlace vencido o ya usado, muestra el motivo y ofrece pedir uno nuevo', async () => {
    vi.mocked(auth.restablecerPassword).mockRejectedValue(new ApiError(410, 'El enlace venció. Pedí uno nuevo.'));
    await montar();
    await escribir('Contraseña nueva', 'clave-nueva-larga-1');
    await escribir('Repetí la contraseña', 'clave-nueva-larga-1');
    await guardar();
    expect(wrapper.text()).toContain('El enlace venció');
    expect(wrapper.find('a[href="/admin/olvide"]').text()).toContain('Pedir un enlace nuevo');
    expect(wrapper.find('[data-testid="listo"]').exists()).toBe(false);
  });

  it('un error que no es del enlace no ofrece pedir otro', async () => {
    vi.mocked(auth.restablecerPassword).mockRejectedValue(new ApiError(0, 'No se pudo conectar con el servidor.'));
    await montar();
    await escribir('Contraseña nueva', 'clave-nueva-larga-1');
    await escribir('Repetí la contraseña', 'clave-nueva-larga-1');
    await guardar();
    expect(wrapper.text()).toContain('No se pudo conectar');
    expect(wrapper.find('a[href="/admin/olvide"]').exists()).toBe(false);
  });

  it('el ojito muestra y oculta lo escrito', async () => {
    await montar();
    const entrada = () => document.querySelector<HTMLInputElement>('input[autocomplete="new-password"]')!;
    expect(entrada().type).toBe('password');
    await clic(document.querySelector('.v-field__append-inner .v-icon'));
    expect(entrada().type).toBe('text');
  });
});
