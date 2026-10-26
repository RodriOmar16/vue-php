import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as api from '@/api/reservas';
import * as apiSalones from '@/api/salones';
import type { PaginaReservas, ReservaListada, ResumenReservas, Salon } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { botonPorTexto, campo, clic, escribir, routerDePrueba } from '@/test/ayudas';
import ReservasView from '../ReservasView.vue';

vi.mock('@/api/reservas');
vi.mock('@/api/salones');

const reserva = (extra: Partial<ReservaListada> = {}): ReservaListada => ({
  id: 'r1', estado: 'pendiente', fecha: '2027-03-06', horaInicio: '15:00', horaFin: '19:00', salon: { id: 1, nombre: 'Salón Arcoíris' },
  combo: 'Combo Plus', cliente: { nombre: 'Ana Gómez', dni: '30123456' }, invitados: 20, total: '1250.00', pagado: '0.00', saldo: '1250.00',
  pagosEnRevision: 0, reembolsoPendiente: '0.00', ...extra,
});
const pagina = (items: ReservaListada[], total = items.length): PaginaReservas => ({ total, pagina: 1, limite: 20, items });
const salon = (id: number, nombre: string) => ({ id, nombre }) as Salon;
const RESUMEN: ResumenReservas = { comprobantesPorRevisar: 0, esperandoSena: 0, proximas: 0, reembolsosPendientes: 0 };

let wrapper: VueWrapper;
const ultimaConsulta = () => vi.mocked(api.listarReservas).mock.calls.at(-1)![0]!;

async function montar(items: ReservaListada[] = [reserva()], resumen: ResumenReservas = RESUMEN, salones: Salon[] = [salon(1, 'Salón Arcoíris')]) {
  setActivePinia(createPinia());
  vi.mocked(api.listarReservas).mockResolvedValue(pagina(items));
  vi.mocked(api.resumenReservas).mockResolvedValue(resumen);
  vi.mocked(apiSalones.listarSalones).mockResolvedValue(salones);
  wrapper = mount(ReservasView, { global: { plugins: [vuetify, createPinia(), await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

describe('ReservasView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
  });

  it('muestra cada reserva con su fecha, salón, cliente, importes y estado', async () => {
    await montar([reserva(), reserva({ id: 'r2', estado: 'confirmada', fecha: '2027-03-13', pagado: '625.00', cliente: { nombre: 'Beto Díaz', dni: '20111222' } })]);
    const t = wrapper.text();
    expect(t).toContain('06/03/2027');
    expect(t).toContain('15:00 a 19:00');
    expect(t).toContain('Salón Arcoíris');
    expect(t).toContain('Combo Plus · 20 invitados');
    expect(t).toContain('Ana Gómez');
    expect(t).toContain('DNI 30123456');
    expect(t).toMatch(/1\.250,00/);
    expect(t).toContain('Esperando la seña');
    expect(t).toContain('Confirmada');
    expect(t).toContain('Beto Díaz');
  });

  it('pide la primera página con 20 filas, sin filtros', async () => {
    await montar();
    expect(ultimaConsulta()).toEqual({ pagina: 1, limite: 20 });
  });

  it('marca las reservas que tienen comprobantes por revisar', async () => {
    await montar([reserva({ pagosEnRevision: 2 })]);
    expect(wrapper.find('[data-testid="revision-r1"]').text()).toContain('2 por revisar');
  });

  it('marca las reservas canceladas a las que todavía hay que devolverles dinero', async () => {
    await montar([reserva({ estado: 'cancelada', reembolsoPendiente: '625.00' }), reserva({ id: 'r2', estado: 'cancelada' })]);
    expect(wrapper.find('[data-testid="reembolso-r1"]').text()).toMatch(/devolver\s+\$\s?625,00/);
    expect(wrapper.find('[data-testid="reembolso-r2"]').exists()).toBe(false);
  });

  it('avisa cuántos reembolsos hay para devolver, y «Ver cuáles» muestra las canceladas', async () => {
    await montar([reserva()], { ...RESUMEN, reembolsosPendientes: 2 });
    expect(wrapper.find('[data-testid="aviso-reembolsos"]').text()).toContain('2 reembolsos');
    const botones = [...document.querySelectorAll('button')].filter((b) => b.textContent?.includes('Ver cuáles'));
    await clic(botones.at(-1));
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    expect(ultimaConsulta()).toMatchObject({ estado: 'cancelada', pagina: 1 });
  });

  it('sin reembolsos pendientes no muestra ese aviso', async () => {
    await montar();
    expect(wrapper.find('[data-testid="aviso-reembolsos"]').exists()).toBe(false);
  });

  it('sin resultados lo dice', async () => {
    await montar([]);
    expect(wrapper.text()).toContain('No hay reservas con esos filtros');
  });

  it('avisa cuántos comprobantes esperan revisión, y «Ver cuáles» filtra por las pendientes', async () => {
    await montar([reserva()], { ...RESUMEN, comprobantesPorRevisar: 3, esperandoSena: 1 });
    expect(wrapper.find('[data-testid="aviso-comprobantes"]').text()).toContain('3 comprobantes');
    await clic(botonPorTexto('Ver cuáles'));
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    expect(ultimaConsulta()).toMatchObject({ estado: 'pendiente', pagina: 1 });
  });

  it('sin comprobantes por revisar no muestra el aviso; en singular dice «comprobante»', async () => {
    await montar();
    expect(wrapper.find('[data-testid="aviso-comprobantes"]').exists()).toBe(false);
    wrapper.unmount();
    await montar([reserva()], { ...RESUMEN, comprobantesPorRevisar: 1 });
    expect(wrapper.find('[data-testid="aviso-comprobantes"]').text()).toMatch(/1\s+comprobante de pago/);
  });

  it('los filtros de fecha se mandan a la API, y cambiar un filtro vuelve a la primera página', async () => {
    await montar();
    await escribir('Evento desde', '2027-03-01');
    await escribir('Evento hasta', '2027-03-31');
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    expect(ultimaConsulta()).toMatchObject({ desde: '2027-03-01', hasta: '2027-03-31', pagina: 1 });
  });

  it('la búsqueda espera a que se deje de escribir (no consulta en cada tecla) y recorta los espacios', async () => {
    await montar();
    vi.mocked(api.listarReservas).mockClear();
    await escribir('Buscar por nombre', 'A');
    await escribir('Buscar por nombre', 'An');
    await escribir('Buscar por nombre', '  Ana  ');
    expect(api.listarReservas).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();
    expect(api.listarReservas).toHaveBeenCalledTimes(1);
    expect(ultimaConsulta()).toMatchObject({ q: 'Ana' });
  });

  it('el filtro de salón aparece solo si hay más de uno', async () => {
    const hayFiltroDeSalon = () => [...document.querySelectorAll('label')].some((l) => l.textContent?.trim() === 'Salón');
    await montar();
    expect(hayFiltroDeSalon()).toBe(false);
    wrapper.unmount();
    document.body.innerHTML = '';
    await montar([reserva()], RESUMEN, [salon(1, 'Salón A'), salon(2, 'Salón B')]);
    expect(hayFiltroDeSalon()).toBe(true);
  });

  it('si falla la carga muestra el motivo y permite reintentar', async () => {
    setActivePinia(createPinia());
    vi.mocked(api.listarReservas).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
    vi.mocked(api.resumenReservas).mockResolvedValue(RESUMEN);
    vi.mocked(apiSalones.listarSalones).mockResolvedValue([]);
    wrapper = mount(ReservasView, { global: { plugins: [vuetify, createPinia(), await routerDePrueba()] }, attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('No se pudo conectar');
    vi.mocked(api.listarReservas).mockResolvedValueOnce(pagina([reserva()]));
    await clic(botonPorTexto('Reintentar'));
    expect(wrapper.text()).toContain('Ana Gómez');
  });

  it('si fallan el resumen o los salones, la lista funciona igual', async () => {
    setActivePinia(createPinia());
    vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva()]));
    vi.mocked(api.resumenReservas).mockRejectedValue(new ApiError(500, 'Error del servidor'));
    vi.mocked(apiSalones.listarSalones).mockRejectedValue(new ApiError(500, 'Error del servidor'));
    wrapper = mount(ReservasView, { global: { plugins: [vuetify, createPinia(), await routerDePrueba()] }, attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('Ana Gómez');
    expect(campo('Evento desde')).toBeTruthy();
  });

  it('una respuesta lenta de una consulta anterior no pisa a la última', async () => {
    await montar();
    const lenta: ((p: PaginaReservas) => void)[] = [];
    vi.mocked(api.listarReservas).mockImplementation(() => new Promise((resolver) => lenta.push(resolver)));
    await escribir('Evento desde', '2027-03-01');
    await vi.advanceTimersByTimeAsync(400);
    await escribir('Evento desde', '2027-04-01');
    await vi.advanceTimersByTimeAsync(400);
    lenta[1]!(pagina([reserva({ id: 'nueva', cliente: { nombre: 'Respuesta Nueva', dni: '1' } })]));
    await flushPromises();
    lenta[0]!(pagina([reserva({ id: 'vieja', cliente: { nombre: 'Respuesta Vieja', dni: '2' } })]));
    await flushPromises();
    expect(wrapper.text()).toContain('Respuesta Nueva');
    expect(wrapper.text()).not.toContain('Respuesta Vieja');
  });
});
