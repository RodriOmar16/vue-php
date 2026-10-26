import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiBloqueos from '@/api/bloqueos';
import { ApiError } from '@/api/http';
import * as api from '@/api/reservas';
import * as apiSalones from '@/api/salones';
import type { Bloqueo, PaginaReservas, Perfil, ReservaListada, Salon } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { useSesionStore } from '@/store/sesion';
import { botonAria, botonPorTexto, clic, hayDialogoActivo, routerDePrueba } from '@/test/ayudas';
import CalendarioView from '../CalendarioView.vue';

vi.mock('@/api/reservas');
vi.mock('@/api/bloqueos');
vi.mock('@/api/salones');

const reserva = (extra: Partial<ReservaListada> = {}): ReservaListada => ({
  id: 'r1', estado: 'confirmada', fecha: '2027-03-06', horaInicio: '15:00', horaFin: '19:00', salon: { id: 1, nombre: 'Salón Arcoíris' },
  combo: 'Combo Plus', cliente: { nombre: 'Ana Gómez', dni: '30123456' }, invitados: 20, total: '1250.00', pagado: '625.00', saldo: '625.00',
  pagosEnRevision: 0, reembolsoPendiente: '0.00', ...extra,
});
const pagina = (items: ReservaListada[], total = items.length): PaginaReservas => ({ total, pagina: 1, limite: 100, items });
const salon = (id: number, nombre: string) => ({ id, nombre, inhabilitado: false }) as Salon;
const cierre: Bloqueo = { id: 9, salonId: null, desde: '2027-03-10T03:00:00.000Z', hasta: '2027-03-12T03:00:00.000Z', motivo: 'Feriado' };

const botonDia = (fecha: string) => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('Ver el') && b.getAttribute('aria-label')?.includes(fecha));

let wrapper: VueWrapper;
let router: Awaited<ReturnType<typeof routerDePrueba>>;
const ultimaConsulta = () => vi.mocked(api.listarReservas).mock.calls.at(-1)![0]!;

async function montar(items: ReservaListada[] = [reserva()], cierres: Bloqueo[] = [], salones: Salon[] = [salon(1, 'Salón Arcoíris')]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol: 'propietario', debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarReservas).mockResolvedValue(pagina(items));
  vi.mocked(apiBloqueos.listarBloqueos).mockResolvedValue(cierres);
  vi.mocked(apiSalones.listarSalones).mockResolvedValue(salones);
  router = await routerDePrueba();
  wrapper = mount(CalendarioView, { global: { plugins: [vuetify, pinia, router] }, attachTo: document.body });
  await flushPromises();
}

describe('CalendarioView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T15:00:00Z'));
  });
  afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
  });

  it('abre en el mes de hoy y pide las reservas y cierres de toda la grilla (con los días de los meses vecinos)', async () => {
    await montar();
    expect(wrapper.find('[data-testid="titulo-mes"]').text()).toBe('marzo de 2027');
    expect(ultimaConsulta()).toEqual({ desde: '2027-03-01', hasta: '2027-04-04', pagina: 1, limite: 100 });
    // los cierres se piden en instantes: 00:00 locales (UTC-3) del primer día hasta 00:00 del día siguiente al último
    expect(apiBloqueos.listarBloqueos).toHaveBeenCalledWith({ desde: '2027-03-01T03:00:00.000Z', hasta: '2027-04-05T03:00:00.000Z' });
  });

  it('muestra la reserva en su día con hora y nombre, y enlaza a su detalle', async () => {
    await montar();
    const celda = wrapper.find('[data-testid="dia-2027-03-06"]');
    expect(celda.find('[data-testid="reserva"]').text()).toBe('15:00 Ana Gómez');
    expect(celda.find('a').attributes('href')).toContain('/admin/reservas/r1');
    expect(wrapper.find('[data-testid="dia-2027-03-07"]').find('[data-testid="reserva"]').exists()).toBe(false);
  });

  it('marca el día de hoy y distingue los días de otros meses', async () => {
    await montar();
    expect(wrapper.find('[data-testid="dia-2027-03-15"]').classes()).toContain('calendario__celda--hoy');
    expect(wrapper.find('[data-testid="dia-2027-04-01"]').classes()).toContain('calendario__celda--otro');
  });

  it('un cierre aparece en cada día que ocupa (y no en el que termina a las 00:00)', async () => {
    await montar([], [cierre]);
    for (const d of ['2027-03-10', '2027-03-11']) expect(wrapper.find(`[data-testid="dia-${d}"] [data-testid="cierre"]`).text()).toContain('Feriado');
    expect(wrapper.find('[data-testid="dia-2027-03-12"] [data-testid="cierre"]').exists()).toBe(false);
  });

  it('con más de 3 reservas en un día muestra tres y «+N más», que abre el día', async () => {
    const muchas = [1, 2, 3, 4, 5].map((n) => reserva({ id: `r${n}`, horaInicio: `${10 + n}:00`, cliente: { nombre: `Cliente ${n}`, dni: String(n) } }));
    await montar(muchas);
    const celda = wrapper.find('[data-testid="dia-2027-03-06"]');
    expect(celda.findAll('[data-testid="reserva"]')).toHaveLength(3);
    expect(celda.text()).toContain('+2 más');
    await clic(celda.findAll('button').find((b) => b.text().includes('más'))!.element);
    expect(document.querySelectorAll('.v-overlay--active [data-testid="reserva-dia"]')).toHaveLength(5);
  });

  it('tocar el número de un día abre el detalle: horario, salón, cliente, estado y lo que falta cobrar', async () => {
    await montar();
    await clic(botonDia('06/03/2027'));
    const t = document.querySelector('.v-overlay--active')!.textContent!;
    expect(t).toContain('15:00 a 19:00 · Ana Gómez');
    expect(t).toContain('Salón Arcoíris · Combo Plus · 20 invitados');
    expect(t).toContain('Confirmada');
    expect(t).toMatch(/Falta cobrar\s+\$\s?625,00/);
  });

  it('un día sin reservas lo dice; un día con cierre lo explica', async () => {
    await montar([], [cierre]);
    await clic(botonDia('10/03/2027'));
    expect(hayDialogoActivo('[data-testid="dia-vacio"]')).toBe(true);
    expect(document.querySelector('.v-overlay--active')!.textContent).toContain('Cerrado (todos los salones): Feriado');
  });

  it('navega entre meses y vuelve a pedir los datos del mes nuevo', async () => {
    await montar();
    await clic(botonAria('Mes siguiente'));
    expect(wrapper.find('[data-testid="titulo-mes"]').text()).toBe('abril de 2027');
    expect(ultimaConsulta()).toMatchObject({ desde: '2027-03-29', hasta: '2027-05-02' });
    await clic(botonAria('Mes anterior'));
    await clic(botonAria('Mes anterior'));
    expect(wrapper.find('[data-testid="titulo-mes"]').text()).toBe('febrero de 2027');
    await clic(botonPorTexto('Hoy'));
    expect(wrapper.find('[data-testid="titulo-mes"]').text()).toBe('marzo de 2027');
  });

  it('cruza el cambio de año', async () => {
    vi.setSystemTime(new Date('2027-12-20T15:00:00Z'));
    await montar();
    await clic(botonAria('Mes siguiente'));
    expect(wrapper.find('[data-testid="titulo-mes"]').text()).toBe('enero de 2028');
  });

  it('las canceladas y vencidas se ocultan salvo que se pida verlas', async () => {
    await montar([reserva(), reserva({ id: 'x', estado: 'cancelada', horaInicio: '20:00' }), reserva({ id: 'y', estado: 'expirada', horaInicio: '21:00' })]);
    const celda = () => wrapper.find('[data-testid="dia-2027-03-06"]');
    expect(celda().findAll('[data-testid="reserva"]')).toHaveLength(1);
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await flushPromises();
    expect(celda().findAll('[data-testid="reserva"]')).toHaveLength(3);
    expect(api.listarReservas).toHaveBeenCalledTimes(1); // es un filtro local: no vuelve a pedir
  });

  it('el filtro de salón aparece solo si hay más de uno, y se manda a la API', async () => {
    const hayFiltro = () => [...document.querySelectorAll('label')].some((l) => l.textContent?.trim() === 'Salón');
    await montar();
    expect(hayFiltro()).toBe(false);
    wrapper.unmount();
    document.body.innerHTML = '';
    await montar([reserva()], [], [salon(1, 'Salón A'), salon(2, 'Salón B')]);
    expect(hayFiltro()).toBe(true);
    (wrapper.vm as unknown as { salonId: number | null }).salonId = 2;
    await flushPromises();
    expect(ultimaConsulta()).toMatchObject({ salonId: 2 });
    expect(vi.mocked(apiBloqueos.listarBloqueos).mock.calls.at(-1)![0]).toMatchObject({ salonId: 2 });
  });

  it('trae todas las páginas cuando hay más de 100 reservas en el mes', async () => {
    await montar();
    vi.mocked(api.listarReservas)
      .mockResolvedValueOnce(pagina([reserva({ id: 'a', fecha: '2027-04-10' })], 2))
      .mockResolvedValueOnce({ ...pagina([reserva({ id: 'b', fecha: '2027-04-10', horaInicio: '20:00' })], 2), pagina: 2 });
    await clic(botonAria('Mes siguiente'));
    const ultimas = vi.mocked(api.listarReservas).mock.calls.slice(-2).map((c) => c[0]!.pagina);
    expect(ultimas).toEqual([1, 2]);
    expect(wrapper.find('[data-testid="dia-2027-04-10"]').findAll('[data-testid="reserva"]')).toHaveLength(2);
  });

  it('si falla la carga muestra el motivo y permite reintentar', async () => {
    await montar();
    vi.mocked(api.listarReservas).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
    await clic(botonAria('Mes siguiente'));
    expect(wrapper.text()).toContain('No se pudo conectar');
    vi.mocked(api.listarReservas).mockResolvedValueOnce(pagina([reserva({ fecha: '2027-04-10' })]));
    await clic(botonPorTexto('Reintentar'));
    expect(wrapper.text()).not.toContain('No se pudo conectar');
    expect(wrapper.find('[data-testid="dia-2027-04-10"]').find('[data-testid="reserva"]').exists()).toBe(true);
  });

  it('una respuesta lenta de un mes anterior no pisa al mes actual', async () => {
    await montar();
    const lentas: ((p: PaginaReservas) => void)[] = [];
    vi.mocked(api.listarReservas).mockImplementation(() => new Promise((resolver) => lentas.push(resolver)));
    await clic(botonAria('Mes siguiente')); // abril (lenta)
    await clic(botonAria('Mes siguiente')); // mayo
    lentas[1]!(pagina([reserva({ id: 'mayo', fecha: '2027-05-08', cliente: { nombre: 'De Mayo', dni: '1' } })]));
    await flushPromises();
    lentas[0]!(pagina([reserva({ id: 'abril', fecha: '2027-04-10', cliente: { nombre: 'De Abril', dni: '2' } })]));
    await flushPromises();
    expect(wrapper.text()).toContain('De Mayo');
    expect(wrapper.text()).not.toContain('De Abril');
  });

  it('en celular no hay grilla: lista solo los días con reservas o cierres', async () => {
    const ancho = window.innerWidth;
    window.innerWidth = 400;
    window.dispatchEvent(new Event('resize'));
    try {
      await montar([reserva()], [cierre]);
      await flushPromises();
      expect(wrapper.find('[data-testid="grilla"]').exists()).toBe(false);
      const lista = wrapper.find('[data-testid="lista-movil"]').text();
      expect(lista).toContain('15:00 · Ana Gómez');
      expect(lista).toContain('Feriado');
      expect(lista).not.toContain('07/03/2027');
    } finally {
      window.innerWidth = ancho;
      window.dispatchEvent(new Event('resize'));
    }
  });

  it('la zona de la empresa decide qué día es «hoy», no la del navegador', async () => {
    // 01:30 UTC del 16 = 22:30 del 15 en Buenos Aires
    vi.setSystemTime(new Date('2027-03-16T01:30:00Z'));
    await montar();
    expect(wrapper.find('[data-testid="dia-2027-03-15"]').classes()).toContain('calendario__celda--hoy');
    expect(wrapper.find('[data-testid="dia-2027-03-16"]').classes()).not.toContain('calendario__celda--hoy');
  });
});
