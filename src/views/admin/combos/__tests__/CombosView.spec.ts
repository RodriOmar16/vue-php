import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VAutocomplete } from 'vuetify/components';
import * as apiCatalogos from '@/api/catalogos';
import * as api from '@/api/combos';
import { ApiError } from '@/api/http';
import * as apiSalones from '@/api/salones';
import type { Combo, Instalacion, Menu, Perfil, RolCodigo, Salon, Servicio } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, routerDePrueba, textoPantalla } from '@/test/ayudas';
import CombosView from '../CombosView.vue';

vi.mock('@/api/combos');
vi.mock('@/api/catalogos');
vi.mock('@/api/salones');

const salon = (id: number, nombre: string, inhabilitado = false): Salon => ({
  id, nombre, descripcion: null, capacidad: null, esDefault: id === 1, minutosLimpieza: 0, inhabilitado, creadoEn: '', actualizadoEn: '',
});
const menu = (id: number, nombre: string): Menu => ({
  id, nombre, descripcion: null, publico: 'todos', precio: '1500.00', precioPor: 'persona', inhabilitado: false, creadoEn: '', actualizadoEn: '', alimentos: [],
});
const instalacion = (id: number, nombre: string): Instalacion => ({
  id, nombre, descripcion: null, precio: '0.00', edadMin: null, edadMax: null, inhabilitado: false, creadoEn: '', actualizadoEn: '',
});
const servicio = (id: number, nombre: string): Servicio => ({
  id, nombre, descripcion: null, precio: '500.00', precioPor: 'fijo', inhabilitado: false, creadoEn: '', actualizadoEn: '',
});

const S1 = salon(1, 'Salón Arcoíris');
const S2 = salon(2, 'Salón Luna');
const M1 = menu(10, 'Menú infantil');
const M2 = menu(11, 'Menú parrilla');
const I1 = instalacion(20, 'Pelotero');
const I2 = instalacion(21, 'Cama elástica');
const V1 = servicio(30, 'Mozos');

const combo = (extra: Partial<Combo> = {}): Combo => ({
  id: 1, nombre: 'Combo Plus', descripcion: 'El más completo', precioBase: '1000.00', maxPersonas: 20, precioAdicionalPersona: '12.50',
  cantidadHoras: 4, precioHoraExtra: '300.00', observaciones: null, inhabilitado: false, creadoEn: '', actualizadoEn: '',
  salones: [{ id: 1, nombre: 'Salón Arcoíris', inhabilitado: false }],
  menus: [{ id: 10, nombre: 'Menú infantil', publico: 'todos', precio: '1500.00', precioPor: 'persona', inhabilitado: false, recargo: null }],
  instalaciones: [{ id: 20, nombre: 'Pelotero', precio: '0.00', inhabilitado: false }],
  servicios: [{ id: 30, nombre: 'Mozos', precio: '500.00', precioPor: 'fijo', inhabilitado: false }],
  ...extra,
});

let wrapper: VueWrapper;

async function montar(combos: Combo[] = [combo()], rol: RolCodigo = 'propietario', salones: Salon[] = [S1, S2]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarCombos).mockResolvedValue(combos);
  vi.mocked(apiSalones.listarSalones).mockResolvedValue(salones);
  vi.mocked(apiCatalogos.listarMenus).mockResolvedValue([M1, M2]);
  vi.mocked(apiCatalogos.listarInstalaciones).mockResolvedValue([I1, I2]);
  vi.mocked(apiCatalogos.listarServicios).mockResolvedValue([V1]);
  wrapper = mount(CombosView, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

const autocompletar = (i: number) => wrapper.findAllComponents(VAutocomplete)[i]; // 0 menús, 1 instalaciones, 2 servicios
const casilla = (etiqueta: string) => campo(etiqueta);

async function llenarBasicos(extra: Record<string, string> = {}) {
  await escribir('Nombre del combo', extra.nombre ?? 'Combo Nuevo');
  await escribir('Precio base', extra.precio ?? '1000');
  await escribir('Invitados incluidos', extra.personas ?? '20');
  await escribir('Duración incluida', extra.horas ?? '4');
}

describe('CombosView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('listado', () => {
    it('muestra precio, capacidad, duración, salones y cuánto incluye', async () => {
      await montar();
      const texto = wrapper.text();
      expect(texto).toContain('Combo Plus');
      expect(texto).toContain('El más completo');
      expect(texto).toMatch(/1\.000,00/);
      expect(texto).toContain('hasta 20 personas · 4 h');
      expect(texto).toContain('Salón Arcoíris');
      expect(texto).toContain('1 menú · 1 instalación · 1 servicio');
      expect(texto).toContain('Activo');
    });

    it('pluraliza lo que incluye y avisa si no se ofrece en ningún salón', async () => {
      await montar([combo({ salones: [], menus: [], instalaciones: [combo().instalaciones[0], { id: 21, nombre: 'Cama', precio: '0.00', inhabilitado: false }], servicios: [] })]);
      expect(wrapper.text()).toContain('Ningún salón');
      expect(wrapper.text()).toContain('0 menús · 2 instalaciones · 0 servicios');
    });

    it('el nombre y «Ver detalle» llevan al detalle del combo', async () => {
      await montar();
      const enlaces = wrapper.findAll('a').map((a) => a.attributes('href'));
      expect(enlaces.filter((h) => h === '/admin/combos/1').length).toBeGreaterThanOrEqual(2);
    });

    it('sin combos lo dice; error de carga con reintento; filtro de bajas', async () => {
      await montar([]);
      expect(wrapper.text()).toContain('Todavía no hay combos');
      wrapper.unmount();

      const pinia = createPinia();
      setActivePinia(pinia);
      vi.mocked(api.listarCombos).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      wrapper = mount(CombosView, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');
      vi.mocked(api.listarCombos).mockResolvedValueOnce([combo()]);
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).toContain('Combo Plus');

      await clic(wrapper.find('input[type="checkbox"]').element);
      expect(api.listarCombos).toHaveBeenLastCalledWith(true);
    });

    it('el empleado consulta (incluido el detalle) pero no ve acciones de edición', async () => {
      await montar([combo()], 'empleado');
      expect(botonPorTexto('Nuevo combo')).toBeUndefined();
      expect(botonAria('Editar Combo Plus')).toBeNull();
      expect(botonAria('Dar de baja Combo Plus')).toBeNull();
      expect(document.querySelector('a[aria-label="Ver el detalle de Combo Plus"]')).toBeTruthy(); // es un enlace, no un botón
    });
  });

  describe('alta', () => {
    beforeEach(async () => {
      await montar();
      await clic(botonPorTexto('Nuevo combo'));
    });

    it('al abrir carga salones y catálogo, y deja tildados todos los salones activos', async () => {
      expect(apiSalones.listarSalones).toHaveBeenCalledWith(false);
      expect(apiCatalogos.listarMenus).toHaveBeenCalledWith(false);
      expect(apiCatalogos.listarInstalaciones).toHaveBeenCalledWith(false);
      expect(apiCatalogos.listarServicios).toHaveBeenCalledWith(false);
      expect(casilla('Salón Arcoíris').element.checked).toBe(true);
      expect(casilla('Salón Luna').element.checked).toBe(true);
    });

    it('valida los obligatorios, los rangos y los importes; no llama a la API', async () => {
      await clic(botonActivo('Crear combo'));
      expect(textoPantalla()).toContain('Campo obligatorio');

      await llenarBasicos({ precio: '10.123', personas: '0', horas: '49' });
      await escribir('Precio por invitado extra', '-3');
      await clic(botonActivo('Crear combo'));
      expect(textoPantalla()).toContain('Un importe positivo con hasta 2 decimales');
      expect(textoPantalla()).toContain('Un número entero entre 1 y 5000');
      expect(textoPantalla()).toContain('Un número entero entre 1 y 48');
      expect(api.crearCombo).not.toHaveBeenCalled();
    });

    it('lo mínimo: envía números reales, 0 por defecto en extras y los salones tildados', async () => {
      vi.mocked(api.crearCombo).mockResolvedValue(combo());
      await llenarBasicos({ nombre: '  Combo Nuevo  ', precio: '1500.5' });
      await clic(botonActivo('Crear combo'));

      expect(api.crearCombo).toHaveBeenCalledWith({
        nombre: 'Combo Nuevo', precioBase: 1500.5, maxPersonas: 20, precioAdicionalPersona: 0, cantidadHoras: 4, precioHoraExtra: 0, salonIds: [1, 2],
      });
      expect(genericosStore().textoSnack).toBe('«Combo Nuevo» fue agregado.');
      expect(api.listarCombos).toHaveBeenCalledTimes(2);
    });

    it('con todo: extras, salones elegidos, menús con recargo, instalaciones y servicios', async () => {
      vi.mocked(api.crearCombo).mockResolvedValue(combo());
      await llenarBasicos();
      await escribir('Descripción', ' Todo incluido ');
      await escribir('Precio por invitado extra', '12.5');
      await escribir('Precio de cada hora extra', '300');
      await escribir('Observaciones', ' Traer decoración propia ');
      await casilla('Salón Luna').setValue(false);

      await autocompletar(0).setValue([10, 11]);
      await flushPromises();
      await escribir('Recargo · Menú parrilla', '250.5');
      await autocompletar(1).setValue([20, 21]);
      await autocompletar(2).setValue([30]);
      await clic(botonActivo('Crear combo'));

      expect(api.crearCombo).toHaveBeenCalledWith({
        nombre: 'Combo Nuevo', descripcion: 'Todo incluido', observaciones: 'Traer decoración propia',
        precioBase: 1000, maxPersonas: 20, precioAdicionalPersona: 12.5, cantidadHoras: 4, precioHoraExtra: 300,
        salonIds: [1],
        menus: [{ menuId: 10 }, { menuId: 11, recargo: 250.5 }], // el primero sin recargo no lo envía
        instalacionIds: [20, 21],
        servicioIds: [30],
      });
    });

    it('un recargo mal escrito se valida', async () => {
      await llenarBasicos();
      await autocompletar(0).setValue([10]);
      await flushPromises();
      await escribir('Recargo · Menú infantil', '1.999');
      await clic(botonActivo('Crear combo'));
      expect(textoPantalla()).toContain('Un importe positivo con hasta 2 decimales');
      expect(api.crearCombo).not.toHaveBeenCalled();
    });

    it('si la API rechaza, muestra el motivo y conserva lo escrito', async () => {
      vi.mocked(api.crearCombo).mockRejectedValue(new ApiError(400, 'Algún salón, menú, instalación o servicio indicado no existe, o no puede quitarse porque está en uso'));
      await llenarBasicos();
      await clic(botonActivo('Crear combo'));
      expect(textoPantalla()).toContain('no existe, o no puede quitarse');
      expect(campo('Nombre del combo').element.value).toBe('Combo Nuevo');
    });
  });

  describe('alta sin salones cargados', () => {
    it('avisa que se puede guardar igual y asignar después', async () => {
      await montar([combo()], 'propietario', []);
      await clic(botonPorTexto('Nuevo combo'));
      expect(textoPantalla()).toContain('Todavía no cargaste salones');
    });
  });

  describe('edición', () => {
    it('carga los datos actuales (importes sin ceros de más)', async () => {
      await montar();
      await clic(botonAria('Editar Combo Plus'));
      expect(campo('Nombre del combo').element.value).toBe('Combo Plus');
      expect(campo('Precio base').element.value).toBe('1000');
      expect(campo('Precio por invitado extra').element.value).toBe('12.5');
      expect(campo('Precio de cada hora extra').element.value).toBe('300');
      expect(campo('Invitados incluidos').element.value).toBe('20');
      expect(campo('Duración incluida').element.value).toBe('4');
      expect(casilla('Salón Arcoíris').element.checked).toBe(true);
      expect(casilla('Salón Luna').element.checked).toBe(false);
      expect(autocompletar(0).props('modelValue')).toEqual([10]);
    });

    it('si no se tocan las listas, NO se envían (la API reemplaza cada conjunto)', async () => {
      await montar();
      vi.mocked(api.actualizarCombo).mockResolvedValue(combo());
      await clic(botonAria('Editar Combo Plus'));
      await escribir('Precio base', '1200');
      await clic(botonActivo('Guardar cambios'));

      const [id, cambios] = vi.mocked(api.actualizarCombo).mock.calls[0];
      expect(id).toBe(1);
      expect(cambios).toMatchObject({ nombre: 'Combo Plus', precioBase: 1200, maxPersonas: 20, cantidadHoras: 4 });
      for (const lista of ['salonIds', 'menus', 'instalacionIds', 'servicioIds']) expect(cambios).not.toHaveProperty(lista);
    });

    it('si se cambia una lista, se envía solo esa', async () => {
      await montar();
      vi.mocked(api.actualizarCombo).mockResolvedValue(combo());
      await clic(botonAria('Editar Combo Plus'));
      await casilla('Salón Luna').setValue(true);
      await autocompletar(1).setValue([20, 21]);
      await clic(botonActivo('Guardar cambios'));

      const cambios = vi.mocked(api.actualizarCombo).mock.calls[0][1];
      expect(cambios).toMatchObject({ salonIds: [1, 2], instalacionIds: [20, 21] });
      expect(cambios).not.toHaveProperty('menus');
      expect(cambios).not.toHaveProperty('servicioIds');
    });

    it('cambiar solo el recargo de un menú ya incluido cuenta como cambio de menús', async () => {
      await montar();
      vi.mocked(api.actualizarCombo).mockResolvedValue(combo());
      await clic(botonAria('Editar Combo Plus'));
      await escribir('Recargo · Menú infantil', '99');
      await clic(botonActivo('Guardar cambios'));
      expect(vi.mocked(api.actualizarCombo).mock.calls[0][1]).toMatchObject({ menus: [{ menuId: 10, recargo: 99 }] });
    });

    it('lo que el combo ya tenía y está de baja se ve como «(de baja)» y se puede quitar', async () => {
      await montar([combo({ instalaciones: [{ id: 22, nombre: 'Tobogán', precio: '0.00', inhabilitado: true }] })]);
      vi.mocked(api.actualizarCombo).mockResolvedValue(combo());
      await clic(botonAria('Editar Combo Plus'));
      const items = autocompletar(1).props('items') as { id: number; titulo: string }[];
      expect(items.find((i) => i.id === 22)!.titulo).toBe('Tobogán (de baja)');
      await autocompletar(1).setValue([]);
      await clic(botonActivo('Guardar cambios'));
      expect(vi.mocked(api.actualizarCombo).mock.calls[0][1]).toMatchObject({ instalacionIds: [] });
    });
  });

  describe('baja y reactivación', () => {
    it('dar de baja: confirma, ejecuta y recarga', async () => {
      await montar();
      vi.mocked(api.actualizarCombo).mockResolvedValue(combo({ inhabilitado: true }));
      await clic(botonAria('Dar de baja Combo Plus'));
      expect(textoPantalla()).toContain('dejará de ofrecerse para reservas nuevas');
      expect(api.actualizarCombo).not.toHaveBeenCalled();
      await clic(botonActivo('Dar de baja'));
      expect(api.actualizarCombo).toHaveBeenCalledWith(1, { inhabilitado: true });
      expect(genericosStore().textoSnack).toBe('«Combo Plus» fue dado de baja.');
    });

    it('reactivar, y un error se avisa', async () => {
      await montar([combo({ inhabilitado: true })]);
      vi.mocked(api.actualizarCombo).mockResolvedValueOnce(combo());
      await clic(botonAria('Reactivar Combo Plus'));
      await clic(botonActivo('Reactivar'));
      expect(api.actualizarCombo).toHaveBeenCalledWith(1, { inhabilitado: false });

      vi.mocked(api.actualizarCombo).mockRejectedValueOnce(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Reactivar Combo Plus'));
      await clic(botonActivo('Reactivar'));
      expect(genericosStore().colorSnack).toBe('error');
    });
  });
});
