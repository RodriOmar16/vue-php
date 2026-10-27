import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import * as auth from '@/api/auth';
import { ApiError } from '@/api/http';
import vuetify from '@/plugins/vuetify';
import { botonPorTexto, clic, escribir } from '@/test/ayudas';
import OlvidePassword from '../OlvidePassword.vue';

vi.mock('@/api/auth');

let wrapper: VueWrapper;

async function montar() {
  setActivePinia(createPinia());
  const vacio = { template: '<div />' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/login', name: 'admin-login', component: vacio }, { path: '/admin/olvide', name: 'admin-olvide', component: vacio }],
  });
  await router.push('/admin/olvide');
  await router.isReady();
  wrapper = mount(OlvidePassword, { global: { plugins: [vuetify, router] }, attachTo: document.body });
  await flushPromises();
}

describe('OlvidePassword (panel)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  it('pide el email y manda solo el email, sin espacios', async () => {
    vi.mocked(auth.olvidePassword).mockResolvedValue({ ok: true });
    await montar();
    await escribir('Email', '  maria@lospinos.com  ');
    await clic(botonPorTexto('Enviarme el enlace'));
    expect(auth.olvidePassword).toHaveBeenCalledWith('maria@lospinos.com');
  });

  it('al terminar dice que se mandó «si hay una cuenta»: nunca confirma que el email exista', async () => {
    vi.mocked(auth.olvidePassword).mockResolvedValue({ ok: true });
    await montar();
    await escribir('Email', 'cualquiera@mail.com');
    await clic(botonPorTexto('Enviarme el enlace'));
    const enviado = wrapper.find('[data-testid="enviado"]');
    expect(enviado.text()).toContain('Si hay una cuenta con cualquiera@mail.com');
    expect(enviado.text()).toContain('vence en 1 hora');
    expect(botonPorTexto('Enviarme el enlace')).toBeUndefined(); // el formulario se reemplaza por el aviso
  });

  it('valida el email antes de enviar', async () => {
    await montar();
    await clic(botonPorTexto('Enviarme el enlace'));
    expect(document.body.textContent).toContain('Campo obligatorio');
    await escribir('Email', 'esto-no-es-un-email');
    await clic(botonPorTexto('Enviarme el enlace'));
    expect(document.body.textContent).toContain('Ingresá un email válido');
    expect(auth.olvidePassword).not.toHaveBeenCalled();
  });

  it('si falla (por ejemplo, sin conexión) lo muestra y deja reintentar', async () => {
    vi.mocked(auth.olvidePassword).mockRejectedValue(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
    await montar();
    await escribir('Email', 'maria@lospinos.com');
    await clic(botonPorTexto('Enviarme el enlace'));
    expect(wrapper.text()).toContain('No se pudo conectar');
    expect(wrapper.find('[data-testid="enviado"]').exists()).toBe(false);
    expect(botonPorTexto('Enviarme el enlace')).toBeTruthy();
  });

  it('se puede volver al ingreso', async () => {
    await montar();
    expect(wrapper.find('a[href="/admin/login"]').exists()).toBe(true);
  });
});
