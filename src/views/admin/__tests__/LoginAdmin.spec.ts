import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import * as auth from '@/api/auth';
import { ApiError } from '@/api/http';
import type { Perfil } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { useSesionStore } from '@/store/sesion';
import LoginAdmin from '../LoginAdmin.vue';

vi.mock('@/api/auth');

const perfil: Perfil = {
  id: 1, nombre: 'María', username: 'maria', email: 'maria@x.com',
  rol: 'propietario', debeCambiarPassword: false, empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
};
const respuestaLogin = {
  accessToken: 'TOKEN', tokenType: 'Bearer' as const, expiresIn: 28800, debeCambiarPassword: false, usuario: perfil,
};

async function montar(rutaInicial = '/admin/login') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const vacio = { template: '<div />' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: vacio },
      { path: '/admin', name: 'admin-inicio', component: vacio },
      { path: '/admin/equipo', name: 'equipo', component: vacio },
      { path: '/', name: 'inicio', component: vacio },
    ],
  });
  await router.push(rutaInicial);
  await router.isReady();
  const wrapper = mount(LoginAdmin, { global: { plugins: [vuetify, pinia, router] }, attachTo: document.body });
  return { wrapper, router };
}

const escribir = async (wrapper: Awaited<ReturnType<typeof montar>>['wrapper'], email: string, password: string) => {
  await wrapper.find('input[type="email"]').setValue(email);
  await wrapper.find('input[autocomplete="current-password"]').setValue(password);
};
const enviar = async (wrapper: Awaited<ReturnType<typeof montar>>['wrapper']) => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('LoginAdmin', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });

  it('con datos vacíos o email inválido muestra los errores y NO llama a la API', async () => {
    const { wrapper } = await montar();
    await enviar(wrapper);
    expect(wrapper.text()).toContain('Campo obligatorio');
    expect(auth.login).not.toHaveBeenCalled();

    await escribir(wrapper, 'no-es-un-email', 'algo');
    await enviar(wrapper);
    expect(wrapper.text()).toContain('Ingresá un email válido');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('login correcto: guarda la sesión y va al panel', async () => {
    vi.mocked(auth.login).mockResolvedValue(respuestaLogin);
    const { wrapper, router } = await montar();

    await escribir(wrapper, 'maria@x.com', 'clave-correcta');
    await enviar(wrapper);

    expect(auth.login).toHaveBeenCalledWith('maria@x.com', 'clave-correcta');
    expect(useSesionStore().autenticado).toBe(true);
    expect(router.currentRoute.value.name).toBe('admin-inicio');
  });

  it('credenciales incorrectas: mensaje claro, borra la contraseña y no entra', async () => {
    vi.mocked(auth.login).mockRejectedValue(new ApiError(401, 'Su sesión expiró'));
    const { wrapper, router } = await montar();

    await escribir(wrapper, 'maria@x.com', 'mala');
    await enviar(wrapper);

    expect(wrapper.text()).toContain('Email o contraseña incorrectos.');
    expect(wrapper.text()).not.toContain('sesión expiró'); // en el login un 401 no es "sesión vencida"
    expect((wrapper.find('input[autocomplete="current-password"]').element as HTMLInputElement).value).toBe('');
    expect(useSesionStore().autenticado).toBe(false);
    expect(router.currentRoute.value.name).toBe('admin-login');
  });

  it('demasiados intentos y servidor caído muestran su mensaje', async () => {
    vi.mocked(auth.login).mockRejectedValueOnce(new ApiError(429, 'Demasiados intentos. Espere un minuto e intente de nuevo.'));
    const { wrapper } = await montar();
    await escribir(wrapper, 'maria@x.com', 'x');
    await enviar(wrapper);
    expect(wrapper.text()).toContain('Demasiados intentos');

    vi.mocked(auth.login).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
    await escribir(wrapper, 'maria@x.com', 'x');
    await enviar(wrapper);
    expect(wrapper.text()).toContain('No se pudo conectar');
  });

  it('vuelve a la página que se pedía (?redirect) si es una ruta interna del panel', async () => {
    vi.mocked(auth.login).mockResolvedValue(respuestaLogin);
    const { wrapper, router } = await montar('/admin/login?redirect=/admin/equipo');
    await escribir(wrapper, 'maria@x.com', 'clave');
    await enviar(wrapper);
    expect(router.currentRoute.value.fullPath).toBe('/admin/equipo');
  });

  it.each(['https://evil.com', '//evil.com', '/otra/cosa'])('ignora un redirect peligroso (%s)', async (redirect) => {
    vi.mocked(auth.login).mockResolvedValue(respuestaLogin);
    const { wrapper, router } = await montar(`/admin/login?redirect=${encodeURIComponent(redirect)}`);
    await escribir(wrapper, 'maria@x.com', 'clave');
    await enviar(wrapper);
    expect(router.currentRoute.value.name).toBe('admin-inicio');
  });

  it('el campo de contraseña se puede mostrar y ocultar', async () => {
    const { wrapper } = await montar();
    const campo = () => wrapper.find('input[autocomplete="current-password"]');
    expect(campo().attributes('type')).toBe('password');
    await wrapper.find('.fa-eye').trigger('click');
    expect(campo().attributes('type')).toBe('text');
  });
});
