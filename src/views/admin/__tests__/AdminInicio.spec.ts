import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as api from '@/api/reservas';
import type { Perfil, RolCodigo } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { useSesionStore } from '@/store/sesion';
import { routerDePrueba } from '@/test/ayudas';
import AdminInicio from '../AdminInicio.vue';

vi.mock('@/api/reservas');

let wrapper: VueWrapper;

async function montar(rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: rol === 'superadmin' ? null : { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  wrapper = mount(AdminInicio, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

describe('AdminInicio', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  it('saluda con el nombre, el rol y la empresa', async () => {
    vi.mocked(api.resumenReservas).mockResolvedValue({ comprobantesPorRevisar: 0, esperandoSena: 0, proximas: 0 });
    await montar();
    expect(wrapper.text()).toContain('Hola, María');
    expect(wrapper.text()).toContain('Demo');
  });

  it('muestra lo que hay para atender, y resalta los comprobantes por revisar', async () => {
    vi.mocked(api.resumenReservas).mockResolvedValue({ comprobantesPorRevisar: 3, esperandoSena: 1, proximas: 2 });
    await montar();
    expect(wrapper.find('[data-testid="tarjeta-comprobantes"]').text()).toContain('3');
    expect(wrapper.find('[data-testid="tarjeta-comprobantes"]').text()).toContain('comprobantes para revisar');
    expect(wrapper.find('[data-testid="tarjeta-esperando"]').text()).toContain('1');
    expect(wrapper.find('[data-testid="tarjeta-esperando"]').text()).toContain('reserva esperando la seña');
    expect(wrapper.find('[data-testid="tarjeta-proximas"]').text()).toMatch(/2\s*eventos confirmados próximos/);
  });

  it('en singular dice «comprobante»', async () => {
    vi.mocked(api.resumenReservas).mockResolvedValue({ comprobantesPorRevisar: 1, esperandoSena: 0, proximas: 0 });
    await montar();
    expect(wrapper.find('[data-testid="tarjeta-comprobantes"]').text()).toContain('1comprobante para revisar');
  });

  it('el empleado también lo ve; el superadmin no (no tiene salón) y ni siquiera lo consulta', async () => {
    vi.mocked(api.resumenReservas).mockResolvedValue({ comprobantesPorRevisar: 0, esperandoSena: 0, proximas: 0 });
    await montar('empleado');
    expect(wrapper.find('[data-testid="tarjeta-comprobantes"]').exists()).toBe(true);
    wrapper.unmount();
    vi.mocked(api.resumenReservas).mockClear();
    document.body.innerHTML = '';
    await montar('superadmin');
    expect(api.resumenReservas).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="tarjeta-comprobantes"]').exists()).toBe(false);
  });

  it('si el resumen falla, la pantalla funciona igual (sin tarjetas)', async () => {
    vi.mocked(api.resumenReservas).mockRejectedValue(new ApiError(500, 'Error del servidor'));
    await montar();
    expect(wrapper.text()).toContain('Hola, María');
    expect(wrapper.find('[data-testid="tarjeta-comprobantes"]').exists()).toBe(false);
  });
});
