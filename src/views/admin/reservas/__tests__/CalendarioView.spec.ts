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

  describe('vista semanal', () => {
    // hoy es lunes 15/03/2027 12:00 (hora local): la semana va del 15 al 21
    const columna = (fecha: string) => wrapper.find(`[data-testid="columna-${fecha}"]`);
    const bloques = (fecha: string) => columna(fecha).findAll('[data-testid="bloque"]');
    const irASemana = async () => {
      await clic(botonPorTexto('Semana'));
      await flushPromises();
    };

    it('el selector cambia a la semana de hoy: título, rango pedido (con el domingo anterior) y cierres en instantes', async () => {
      await montar([]);
      expect(wrapper.find('[data-testid="semana"]').exists()).toBe(false);
      await irASemana();
      expect(wrapper.find('[data-testid="titulo-semana"]').text()).toBe('Semana del 15 al 21 de marzo de 2027');
      expect(wrapper.find('[data-testid="grilla"]').exists()).toBe(false); // ya no está la grilla del mes
      expect(ultimaConsulta()).toEqual({ desde: '2027-03-14', hasta: '2027-03-21', pagina: 1, limite: 100 });
      expect(vi.mocked(apiBloqueos.listarBloqueos).mock.calls.at(-1)![0]).toEqual({ desde: '2027-03-14T03:00:00.000Z', hasta: '2027-03-22T03:00:00.000Z' });
      expect(wrapper.findAll('[data-testid^="columna-"]')).toHaveLength(7);
    });

    it('cada reserva queda en su día y su hora: la altura sale de la duración', async () => {
      await montar([reserva({ fecha: '2027-03-16', horaInicio: '15:00', horaFin: '19:00' })]);
      await irASemana();
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-16', horaInicio: '15:00', horaFin: '19:00' })]));
      await clic(botonAria('Semana siguiente'));
      await clic(botonAria('Semana anterior'));
      const b = bloques('2027-03-16');
      expect(b).toHaveLength(1);
      expect(b[0]!.text()).toContain('15:00 Ana Gómez');
      // la grilla arranca a las 8: 15:00 está 7 h más abajo (7 × 48 px) y dura 4 h (4 × 48 px)
      expect(b[0]!.attributes('style')).toContain('top: 336px');
      expect(b[0]!.attributes('style')).toContain('height: 192px');
      expect(b[0]!.attributes('href')).toContain('/admin/reservas/r1');
      expect(bloques('2027-03-17')).toHaveLength(0);
    });

    it('una fiesta que cruza la medianoche se ve en los dos días', async () => {
      await montar([]);
      await irASemana();
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-16', horaInicio: '21:00', horaFin: '01:00' })]));
      await clic(botonAria('Semana siguiente'));
      await clic(botonAria('Semana anterior'));
      expect(bloques('2027-03-16')[0]!.attributes('title')).toContain('sigue al día siguiente');
      const siguiente = bloques('2027-03-17');
      expect(siguiente).toHaveLength(1);
      expect(siguiente[0]!.attributes('title')).toContain('viene del día anterior');
      expect(siguiente[0]!.text()).toContain('↳');
    });

    it('la fiesta del domingo anterior que termina el lunes aparece en el lunes', async () => {
      await montar([]);
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-14', horaInicio: '22:00', horaFin: '02:00' })]));
      await irASemana();
      expect(bloques('2027-03-15')).toHaveLength(1);
      expect(bloques('2027-03-15')[0]!.text()).toContain('↳');
    });

    it('dos reservas a la vez (de salones distintos) van una al lado de la otra, y cada una dice su salón', async () => {
      await montar([]);
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([
        reserva({ id: 'a', fecha: '2027-03-16', salon: { id: 1, nombre: 'Salón A' } }),
        reserva({ id: 'b', fecha: '2027-03-16', horaInicio: '16:00', horaFin: '20:00', salon: { id: 2, nombre: 'Salón B' }, cliente: { nombre: 'Beto Díaz', dni: '2' } }),
      ]));
      await irASemana();
      const b = bloques('2027-03-16');
      expect(b).toHaveLength(2);
      expect(b[0]!.attributes('style')).toMatch(/left: 0%.*width: 50%|width: 50%.*left: 0%/);
      expect(b[1]!.attributes('style')).toMatch(/left: 50%/);
      expect(b[0]!.text()).toContain('Salón A');
      expect(b[1]!.text()).toContain('Salón B');
    });

    it('con un solo salón no repite su nombre en cada bloque', async () => {
      await montar([]);
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-16' })]));
      await irASemana();
      expect(bloques('2027-03-16')[0]!.text()).not.toContain('Salón Arcoíris');
    });

    it('los cierres se dibujan como franja en cada día que ocupan', async () => {
      await montar([], [{ id: 9, salonId: null, desde: '2027-03-17T03:00:00.000Z', hasta: '2027-03-19T03:00:00.000Z', motivo: 'Feriado' }]);
      await irASemana();
      for (const d of ['2027-03-17', '2027-03-18']) expect(columna(d).find('[data-testid="cierre-semana"]').text()).toContain('Feriado');
      expect(columna('2027-03-19').find('[data-testid="cierre-semana"]').exists()).toBe(false);
    });

    it('si hay algo fuera de 8 a 24, la grilla se amplía para que no quede afuera', async () => {
      await montar([]);
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-16', horaInicio: '06:00', horaFin: '09:00' })]));
      await irASemana();
      // arranca a las 6: la reserva está arriba de todo
      expect(bloques('2027-03-16')[0]!.attributes('style')).toContain('top: 0px');
      expect(wrapper.text()).toContain('06:00');
    });

    it('marca la hora de ahora en la columna de hoy (en la zona de la empresa)', async () => {
      await montar([]);
      await irASemana();
      const ahora = columna('2027-03-15').find('[data-testid="ahora"]');
      expect(ahora.exists()).toBe(true);
      expect(ahora.attributes('style')).toContain('top: 192px'); // 12:00 locales: 4 h × 48 px bajo las 8
      expect(columna('2027-03-16').find('[data-testid="ahora"]').exists()).toBe(false);
    });

    it('navega entre semanas y vuelve con «Hoy»', async () => {
      await montar([]);
      await irASemana();
      await clic(botonAria('Semana siguiente'));
      expect(wrapper.find('[data-testid="titulo-semana"]').text()).toBe('Semana del 22 al 28 de marzo de 2027');
      expect(ultimaConsulta()).toMatchObject({ desde: '2027-03-21', hasta: '2027-03-28' });
      await clic(botonAria('Semana anterior'));
      await clic(botonAria('Semana anterior'));
      expect(wrapper.find('[data-testid="titulo-semana"]').text()).toBe('Semana del 8 al 14 de marzo de 2027');
      await clic(botonPorTexto('Hoy'));
      expect(wrapper.find('[data-testid="titulo-semana"]').text()).toBe('Semana del 15 al 21 de marzo de 2027');
    });

    it('al cambiar de vista conserva dónde estaba: del mes de abril va a su primera semana, y de la semana vuelve a su mes', async () => {
      await montar([]);
      await clic(botonAria('Mes siguiente')); // abril
      await irASemana();
      expect(wrapper.find('[data-testid="titulo-semana"]').text()).toBe('Semana del 29 de marzo al 4 de abril de 2027');
      await clic(botonPorTexto('Mes'));
      await flushPromises();
      expect(wrapper.find('[data-testid="titulo-mes"]').text()).toBe('abril de 2027'); // el jueves 1/4 cae en abril
    });

    it('tocar el día del encabezado abre el detalle de ese día', async () => {
      await montar([]);
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-16' })]));
      await irASemana();
      await clic(botonDia('16/03/2027'));
      expect(document.querySelector('.v-overlay--active')!.textContent).toContain('15:00 a 19:00 · Ana Gómez');
    });

    it('las canceladas y vencidas se ocultan salvo que se pidan, también en la semana', async () => {
      await montar([]);
      vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-16' }), reserva({ id: 'x', fecha: '2027-03-16', estado: 'cancelada', horaInicio: '10:00', horaFin: '12:00' })]));
      await irASemana();
      expect(bloques('2027-03-16')).toHaveLength(1);
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await flushPromises();
      expect(bloques('2027-03-16')).toHaveLength(2);
    });

    it('en celular no hay grilla de horas: lista los días de la semana que tienen algo', async () => {
      const ancho = window.innerWidth;
      window.innerWidth = 400;
      window.dispatchEvent(new Event('resize'));
      try {
        await montar([]);
        vi.mocked(api.listarReservas).mockResolvedValue(pagina([reserva({ fecha: '2027-03-16' })]));
        await irASemana();
        expect(wrapper.find('[data-testid="semana"]').exists()).toBe(false);
        const lista = wrapper.find('[data-testid="lista-movil"]').text();
        expect(lista).toContain('15:00 · Ana Gómez');
        expect(lista).not.toContain('17/03/2027');
      } finally {
        window.innerWidth = ancho;
        window.dispatchEvent(new Event('resize'));
      }
    });

    it('un error de carga se muestra y se puede reintentar', async () => {
      await montar([]);
      await irASemana();
      vi.mocked(api.listarReservas).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      await clic(botonAria('Semana siguiente'));
      expect(wrapper.text()).toContain('No se pudo conectar');
      vi.mocked(api.listarReservas).mockResolvedValueOnce(pagina([reserva({ fecha: '2027-03-23' })]));
      await clic(botonPorTexto('Reintentar'));
      expect(bloques('2027-03-23')).toHaveLength(1);
    });
  });
});
