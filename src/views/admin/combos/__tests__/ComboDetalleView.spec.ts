import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/combos';
import { ApiError } from '@/api/http';
import type { Combo, Cotizacion, Perfil, RolCodigo, Tarifa } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, routerDePrueba, textoPantalla } from '@/test/ayudas';
import ComboDetalleView from '../ComboDetalleView.vue';

vi.mock('@/api/combos');
vi.mock('@/api/catalogos');
vi.mock('@/api/salones');

const COMBO: Combo = {
  id: 1, nombre: 'Combo Plus', descripcion: 'El más completo', precioBase: '1000.00', maxPersonas: 20, precioAdicionalPersona: '12.50',
  cantidadHoras: 4, precioHoraExtra: '300.00', observaciones: 'Sin pirotecnia', inhabilitado: false, creadoEn: '', actualizadoEn: '',
  salones: [{ id: 1, nombre: 'Salón Arcoíris', inhabilitado: false }, { id: 2, nombre: 'Salón Luna', inhabilitado: false }],
  menus: [
    { id: 10, nombre: 'Menú infantil', publico: 'todos', precio: '1500.00', precioPor: 'persona', inhabilitado: false, recargo: null },
    { id: 11, nombre: 'Menú parrilla', publico: 'todos', precio: '2500.00', precioPor: 'persona', inhabilitado: false, recargo: '250.00' },
  ],
  instalaciones: [{ id: 20, nombre: 'Pelotero', precio: '0.00', inhabilitado: false }],
  servicios: [{ id: 30, nombre: 'Mozos', precio: '500.00', precioPor: 'fijo', inhabilitado: false }],
};

const tarifa = (extra: Partial<Tarifa> = {}): Tarifa => ({
  id: 5, comboId: 1, salonId: null, diaSemana: 6, fechaDesde: null, fechaHasta: null, precioBase: '1500.00',
  precioAdicionalPersona: null, prioridad: 0, inhabilitado: false, ...extra,
});

const cotizacion = (extra: Partial<Cotizacion> = {}): Cotizacion => ({
  combo: { id: 1, nombre: 'Combo Plus' }, salonId: 1, fecha: '2027-03-06', invitados: 25, maxPersonas: 20,
  precioBase: { importe: '1500.00', origen: 'tarifa', tarifaId: 5 },
  excedente: { personas: 5, precioPorPersona: '12.50', importe: '62.50' }, total: '1562.50', ...extra,
});

let wrapper: VueWrapper;

async function montar(rol: RolCodigo = 'propietario', tarifas: Tarifa[] = [tarifa()], combo: Combo = COMBO) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.obtenerCombo).mockResolvedValue(combo);
  vi.mocked(api.listarTarifas).mockResolvedValue(tarifas);
  wrapper = mount(ComboDetalleView, { props: { id: 1 }, global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

describe('ComboDetalleView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('resumen', () => {
    it('muestra precios, salones y qué incluye (menús con recargo, observaciones)', async () => {
      await montar();
      const t = wrapper.text();
      expect(t).toContain('Combo Plus');
      expect(t).toContain('El más completo');
      expect(t).toMatch(/1\.000,00/);
      expect(t).toContain('hasta 20 personas · 4 h');
      expect(t).toContain('Salón Arcoíris');
      expect(t).toContain('Menú infantil');
      expect(t).toContain('Menú parrilla');
      expect(t).toMatch(/recargo \$\s?250,00/);
      expect(t).toContain('Pelotero');
      expect(t).toContain('Mozos');
      expect(t).toContain('Sin pirotecnia');
      expect(api.obtenerCombo).toHaveBeenCalledWith(1);
      expect(api.listarTarifas).toHaveBeenCalledWith(1, true);
    });

    it('si falla la carga muestra el motivo y permite reintentar', async () => {
      vi.mocked(api.obtenerCombo).mockRejectedValueOnce(new ApiError(404, 'No se encontró lo que busca.'));
      vi.mocked(api.listarTarifas).mockResolvedValue([]);
      const pinia = createPinia();
      setActivePinia(pinia);
      wrapper = mount(ComboDetalleView, { props: { id: 1 }, global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se encontró lo que busca.');
      vi.mocked(api.obtenerCombo).mockResolvedValueOnce(COMBO);
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).toContain('Combo Plus');
    });
  });

  describe('tarifas: lista', () => {
    it('describe cuándo rige, el tipo, el precio y el invitado extra', async () => {
      await montar('propietario', [
        tarifa(),
        tarifa({ id: 6, diaSemana: null, fechaDesde: '2027-12-25', fechaHasta: '2027-12-25', salonId: 2, precioAdicionalPersona: '20.00', inhabilitado: true }),
      ]);
      const t = wrapper.text();
      expect(t).toContain('Los sábados');
      expect(t).toContain('Día de la semana');
      expect(t).toContain('25/12/2027 · Salón Luna');
      expect(t).toContain('Día puntual');
      expect(t).toContain('El del combo');
      expect(t).toContain('Desactivada');
    });

    it('sin tarifas aclara que rige el precio base', async () => {
      await montar('propietario', []);
      expect(wrapper.text()).toContain('siempre rige el precio base del combo');
    });

    it('el empleado no ve acciones de edición ni de tarifas', async () => {
      await montar('empleado');
      expect(botonPorTexto('Editar combo')).toBeUndefined();
      expect(botonPorTexto('Nueva tarifa')).toBeUndefined();
      expect(botonAria('Eliminar la tarifa Los sábados')).toBeNull();
      expect(wrapper.text()).toContain('Probar el precio'); // el cotizador sí
    });
  });

  describe('tarifas: alta', () => {
    beforeEach(async () => {
      await montar();
      await clic(botonPorTexto('Nueva tarifa'));
    });

    it('exige un día o un rango de fechas, y un precio', async () => {
      await clic(botonActivo('Crear tarifa'));
      expect(textoPantalla()).toContain('Elegí un día de la semana, un rango de fechas, o ambos');
      expect(textoPantalla()).toContain('Campo obligatorio');
      expect(api.crearTarifa).not.toHaveBeenCalled();
    });

    it('por fechas: sin «hasta» es un solo día; envía solo lo definido', async () => {
      vi.mocked(api.crearTarifa).mockResolvedValue(tarifa());
      await clic(document.querySelector<HTMLInputElement>('.v-overlay--active input[type="checkbox"]'));
      await escribir('Desde el día', '2027-12-25');
      await escribir('Precio base', '2500.5');
      await clic(botonActivo('Crear tarifa'));

      expect(api.crearTarifa).toHaveBeenCalledWith(1, {
        fechaDesde: '2027-12-25', fechaHasta: '2027-12-25', precioBase: 2500.5, prioridad: 0,
      });
      expect(genericosStore().textoSnack).toBe('Tarifa creada.');
      expect(api.listarTarifas).toHaveBeenCalledTimes(2);
    });

    it('«hasta» anterior a «desde» se rechaza', async () => {
      await clic(document.querySelector<HTMLInputElement>('.v-overlay--active input[type="checkbox"]'));
      await escribir('Desde el día', '2027-01-20');
      await escribir('Hasta el día', '2027-01-10');
      await escribir('Precio base', '100');
      await clic(botonActivo('Crear tarifa'));
      expect(textoPantalla()).toContain('No puede ser anterior al día de inicio');
      expect(api.crearTarifa).not.toHaveBeenCalled();
    });

    it('si la API rechaza, muestra el motivo', async () => {
      vi.mocked(api.crearTarifa).mockRejectedValue(new ApiError(409, 'Ya existe una tarifa igual'));
      await clic(document.querySelector<HTMLInputElement>('.v-overlay--active input[type="checkbox"]'));
      await escribir('Desde el día', '2027-12-25');
      await escribir('Precio base', '100');
      await clic(botonActivo('Crear tarifa'));
      expect(textoPantalla()).toContain('Ya existe una tarifa igual');
    });
  });

  describe('tarifas: edición, estado y baja', () => {
    it('carga los datos; quitar las fechas de una tarifa de temporada envía null', async () => {
      await montar('propietario', [tarifa({ diaSemana: 6, fechaDesde: '2027-01-01', fechaHasta: '2027-01-31' })]);
      vi.mocked(api.actualizarTarifa).mockResolvedValue(tarifa());
      await clic(botonAria('Editar la tarifa Los sábados del 01/01/2027 al 31/01/2027'));
      expect(campo('Desde el día').element.value).toBe('2027-01-01');
      expect(campo('Hasta el día').element.value).toBe('2027-01-31');
      expect(campo('Precio base').element.value).toBe('1500');

      await clic(document.querySelector<HTMLInputElement>('.v-overlay--active input[type="checkbox"]')); // apaga «limitar fechas»
      await clic(botonActivo('Guardar cambios'));
      expect(api.actualizarTarifa).toHaveBeenCalledWith(1, 5, expect.objectContaining({ fechaDesde: null, fechaHasta: null, diaSemana: 6, salonId: null }));
    });

    it('desactivar y activar', async () => {
      await montar();
      vi.mocked(api.actualizarTarifa).mockResolvedValue(tarifa());
      await clic(botonAria('Desactivar la tarifa Los sábados'));
      expect(api.actualizarTarifa).toHaveBeenCalledWith(1, 5, { inhabilitado: true });
      expect(genericosStore().textoSnack).toBe('Tarifa desactivada.');
    });

    it('eliminar pide confirmación y aclara qué pasa con las reservas', async () => {
      await montar();
      vi.mocked(api.eliminarTarifa).mockResolvedValue(undefined);
      await clic(botonAria('Eliminar la tarifa Los sábados'));
      expect(textoPantalla()).toContain('Las reservas ya hechas conservan el precio');
      expect(api.eliminarTarifa).not.toHaveBeenCalled();
      await clic(botonActivo('Eliminar'));
      expect(api.eliminarTarifa).toHaveBeenCalledWith(1, 5);
      expect(genericosStore().textoSnack).toBe('Tarifa eliminada.');
    });

    it('un error al eliminar se avisa', async () => {
      await montar();
      vi.mocked(api.eliminarTarifa).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Eliminar la tarifa Los sábados'));
      await clic(botonActivo('Eliminar'));
      expect(genericosStore().colorSnack).toBe('error');
    });
  });

  describe('cotizador', () => {
    const consultar = async (invitados = '25') => {
      await escribir('Fecha del evento', '2027-03-06');
      await escribir('Invitados', invitados);
      await clic(botonPorTexto('Calcular'));
    };

    it('exige salón y fecha antes de consultar', async () => {
      await montar();
      await clic(botonPorTexto('Calcular'));
      expect(wrapper.text()).toContain('Elegí una fecha');
      expect(api.cotizarCombo).not.toHaveBeenCalled();
    });

    it('con un solo salón activo ya viene elegido; muestra la tarifa aplicada y el desglose', async () => {
      await montar('propietario', [tarifa()], { ...COMBO, salones: [COMBO.salones[0]] });
      vi.mocked(api.cotizarCombo).mockResolvedValue(cotizacion());
      await consultar();
      expect(api.cotizarCombo).toHaveBeenCalledWith(1, { salonId: 1, fecha: '2027-03-06', invitados: 25 });
      expect(wrapper.find('[data-testid="origen-precio"]').text()).toBe('Tarifa aplicada: Los sábados');
      expect(wrapper.find('[data-testid="detalle-excedente"]').text()).toMatch(/5 personas sobre las 20 incluidas/);
      expect(wrapper.find('[data-testid="total-cotizacion"]').text()).toMatch(/1\.562,50/);
    });

    it('sin tarifa aplicable indica que es el precio del combo y que no hay excedente', async () => {
      await montar('propietario', [], { ...COMBO, salones: [COMBO.salones[0]] });
      vi.mocked(api.cotizarCombo).mockResolvedValue(
        cotizacion({ invitados: 10, precioBase: { importe: '1000.00', origen: 'combo', tarifaId: null }, excedente: { personas: 0, precioPorPersona: '12.50', importe: '0.00' }, total: '1000.00' }),
      );
      await consultar('10');
      expect(wrapper.find('[data-testid="origen-precio"]').text()).toBe('Precio base del combo');
      expect(wrapper.find('[data-testid="detalle-excedente"]').text()).toBe('Dentro de los 20 invitados incluidos');
    });

    it('muestra el error de la API y no deja un resultado viejo', async () => {
      await montar('propietario', [tarifa()], { ...COMBO, salones: [COMBO.salones[0]] });
      vi.mocked(api.cotizarCombo).mockResolvedValueOnce(cotizacion());
      await consultar();
      expect(wrapper.find('[data-testid="resultado-cotizacion"]').exists()).toBe(true);

      vi.mocked(api.cotizarCombo).mockRejectedValueOnce(new ApiError(400, 'El combo no se ofrece en ese salón'));
      await clic(botonPorTexto('Calcular'));
      expect(wrapper.text()).toContain('El combo no se ofrece en ese salón');
      expect(wrapper.find('[data-testid="resultado-cotizacion"]').exists()).toBe(false);
    });
  });
});
