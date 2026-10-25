import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import * as auth from '@/api/auth';
import { ApiError } from '@/api/http';
import type { Perfil } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import CambiarPassword from '../CambiarPassword.vue';

vi.mock('@/api/auth');

const perfil = (debeCambiarPassword: boolean): Perfil => ({
  id: 1, nombre: 'María', username: 'maria', email: 'maria@x.com',
  rol: 'propietario', debeCambiarPassword, empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
});

async function montar(debeCambiar: boolean) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const sesion = useSesionStore();
  sesion.usuario = perfil(debeCambiar);
  sesion.token = 'T';
  const vacio = { template: '<div />' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', name: 'admin-inicio', component: vacio },
      { path: '/admin/cambiar-password', name: 'admin-cambiar-password', component: vacio },
    ],
  });
  await router.push('/admin/cambiar-password');
  await router.isReady();
  const wrapper = mount(CambiarPassword, { global: { plugins: [vuetify, pinia, router] }, attachTo: document.body });
  return { wrapper, router };
}

type Montado = Awaited<ReturnType<typeof montar>>['wrapper'];
const campos = (w: Montado) => w.findAll('input[type="password"]');
const llenar = async (w: Montado, actual: string, nueva: string, repetir: string) => {
  const [a, n, r] = campos(w);
  await a.setValue(actual);
  await n.setValue(nueva);
  await r.setValue(repetir);
};
const enviar = async (w: Montado) => {
  await w.find('form').trigger('submit');
  await flushPromises();
};

describe('CambiarPassword', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });

  it('con clave temporal explica por qué y la llama "temporal"', async () => {
    const { wrapper } = await montar(true);
    expect(wrapper.text()).toContain('contraseña temporal');
    expect(wrapper.text()).toContain('Contraseña temporal');
  });

  it('si el cambio es voluntario no muestra el aviso', async () => {
    const { wrapper } = await montar(false);
    expect(wrapper.text()).not.toContain('Estás usando una contraseña temporal');
    expect(wrapper.text()).toContain('Contraseña actual');
  });

  it.each([
    ['muy corta', 'actual-123', 'corta', 'corta', 'al menos 10 caracteres'],
    ['igual a la actual', 'actual-12345', 'actual-12345', 'actual-12345', 'distinta de la actual'],
    ['no coincide', 'actual-12345', 'nueva-clave-segura', 'otra-clave-segura', 'no coinciden'],
  ])('valida: contraseña nueva %s -> no llama a la API', async (_caso, actual, nueva, repetir, mensaje) => {
    const { wrapper } = await montar(true);
    await llenar(wrapper, actual, nueva, repetir);
    await enviar(wrapper);
    expect(wrapper.text()).toContain(mensaje);
    expect(auth.cambiarPassword).not.toHaveBeenCalled();
  });

  it('todo vacío: pide los campos', async () => {
    const { wrapper } = await montar(true);
    await enviar(wrapper);
    expect(wrapper.text()).toContain('Campo obligatorio');
    expect(auth.cambiarPassword).not.toHaveBeenCalled();
  });

  it('clave actual incorrecta: muestra el mensaje de la API y se queda en la pantalla', async () => {
    vi.mocked(auth.cambiarPassword).mockRejectedValue(new ApiError(400, 'La contraseña actual es incorrecta'));
    const { wrapper, router } = await montar(true);
    await llenar(wrapper, 'equivocada', 'nueva-clave-segura', 'nueva-clave-segura');
    await enviar(wrapper);

    expect(wrapper.text()).toContain('La contraseña actual es incorrecta');
    expect(router.currentRoute.value.name).toBe('admin-cambiar-password');
  });

  it('éxito: guarda, recarga el perfil, avisa y va al panel', async () => {
    vi.mocked(auth.cambiarPassword).mockResolvedValue({ ok: true });
    vi.mocked(auth.obtenerPerfil).mockResolvedValue(perfil(false));
    const { wrapper, router } = await montar(true);

    await llenar(wrapper, 'temporal-abc', 'nueva-clave-segura', 'nueva-clave-segura');
    await enviar(wrapper);

    expect(auth.cambiarPassword).toHaveBeenCalledWith('temporal-abc', 'nueva-clave-segura');
    expect(useSesionStore().debeCambiarPassword).toBe(false);
    expect(genericosStore().textoSnack).toBe('Contraseña actualizada.');
    expect(router.currentRoute.value.name).toBe('admin-inicio');
  });
});
