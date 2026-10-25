import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VAutocomplete } from 'vuetify/components';
import * as api from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { Alimento, Menu, Perfil, RolCodigo } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, textoPantalla } from '@/test/ayudas';
import MenusView from '../MenusView.vue';

vi.mock('@/api/catalogos');

const alimento = (id: number, nombre: string, tipo: 'comida' | 'bebida', inhabilitado = false): Alimento => ({
  id, nombre, tipo, inhabilitado, creadoEn: '', actualizadoEn: '',
});
const PIZZA = alimento(1, 'Pizza', 'comida');
const GASEOSA = alimento(2, 'Gaseosa', 'bebida');
const SANGUCHE = alimento(3, 'Sánguche', 'comida', true); // de baja

const menu = (extra: Partial<Menu> = {}): Menu => ({
  id: 10, nombre: 'Menú infantil', descripcion: 'Para los chicos', publico: 'ninos', precio: '1500.50', precioPor: 'persona',
  inhabilitado: false, creadoEn: '', actualizadoEn: '', alimentos: [PIZZA, GASEOSA], ...extra,
});

let wrapper: VueWrapper;

async function montar(menus: Menu[] = [menu()], rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarMenus).mockResolvedValue(menus);
  vi.mocked(api.listarAlimentos).mockResolvedValue([PIZZA, GASEOSA]);
  wrapper = mount(MenusView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
  await flushPromises();
}

const autocompletarAlimentos = () => wrapper.findAllComponents(VAutocomplete).at(-1)!;

describe('MenusView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('listado', () => {
    it('muestra el menú con su público, su precio formateado, cómo se cobra y qué incluye', async () => {
      await montar();
      const texto = wrapper.text();
      expect(texto).toContain('Menú infantil');
      expect(texto).toContain('Para los chicos');
      expect(texto).toContain('Niños');
      expect(texto).toMatch(/1\.500,50/);
      expect(texto).toContain('por persona');
      expect(texto).toContain('Pizza');
      expect(texto).toContain('Gaseosa');
      expect(texto).toContain('Activo');
    });

    it('un menú de precio fijo y un alimento de baja dentro del menú se ven diferenciados', async () => {
      await montar([menu({ precioPor: 'fijo', alimentos: [PIZZA, SANGUCHE] })]);
      expect(wrapper.text()).toContain('precio fijo');
      const chipBaja = wrapper.findAll('.v-chip').find((c) => c.text().includes('Sánguche'))!;
      expect(chipBaja.classes()).toContain('text-decoration-line-through');
    });

    it('un menú sin alimentos lo aclara; sin menús, lo dice', async () => {
      await montar([menu({ alimentos: [] })]);
      expect(wrapper.text()).toContain('Sin alimentos');
      wrapper.unmount();
      await montar([]);
      expect(wrapper.text()).toContain('Todavía no hay menús');
    });

    it('error de carga con reintento', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      vi.mocked(api.listarMenus).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      wrapper = mount(MenusView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');
      vi.mocked(api.listarMenus).mockResolvedValueOnce([menu()]);
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).toContain('Menú infantil');
    });

    it('«Mostrar dados de baja» vuelve a pedir con ese filtro', async () => {
      await montar();
      expect(api.listarMenus).toHaveBeenLastCalledWith(false);
      await clic(wrapper.find('input[type="checkbox"]').element);
      expect(api.listarMenus).toHaveBeenLastCalledWith(true);
    });

    it('el empleado solo consulta', async () => {
      await montar([menu()], 'empleado');
      expect(wrapper.text()).toContain('Menú infantil');
      expect(botonPorTexto('Nuevo menú')).toBeUndefined();
      expect(botonAria('Editar Menú infantil')).toBeNull();
      expect(botonAria('Dar de baja Menú infantil')).toBeNull();
    });
  });

  describe('alta', () => {
    beforeEach(async () => {
      await montar();
      await clic(botonPorTexto('Nuevo menú'));
    });

    it('al abrir carga los alimentos disponibles', () => {
      expect(api.listarAlimentos).toHaveBeenCalledWith(false);
      const items = autocompletarAlimentos().props('items') as { titulo: string }[];
      expect(items.map((i) => i.titulo)).toEqual(['Pizza · comida', 'Gaseosa · bebida']);
    });

    it('valida nombre, precio obligatorio y formato de importe; no llama a la API', async () => {
      await clic(botonActivo('Crear menú'));
      expect(textoPantalla()).toContain('Campo obligatorio');

      await escribir('Nombre del menú', 'Parrilla');
      for (const malo of ['10.123', '-5', '1e5']) {
        await escribir('Precio', malo);
        await clic(botonActivo('Crear menú'));
        expect(textoPantalla()).toContain('Un importe positivo con hasta 2 decimales');
      }
      expect(api.crearMenu).not.toHaveBeenCalled();
    });

    it('éxito: precio numérico, valores por defecto, alimentos elegidos; avisa y recarga', async () => {
      vi.mocked(api.crearMenu).mockResolvedValue(menu());
      await escribir('Nombre del menú', '  Parrilla libre  ');
      await escribir('Precio', '3500.5');
      await autocompletarAlimentos().setValue([1, 2]);

      await clic(botonActivo('Crear menú'));

      expect(api.crearMenu).toHaveBeenCalledWith({
        nombre: 'Parrilla libre', descripcion: undefined, publico: 'todos', precio: 3500.5, precioPor: 'persona', alimentoIds: [1, 2],
      });
      expect(genericosStore().textoSnack).toContain('Parrilla libre');
      expect(api.listarMenus).toHaveBeenCalledTimes(2);
    });

    it('sin alimentos elegidos no envía la lista', async () => {
      vi.mocked(api.crearMenu).mockResolvedValue(menu());
      await escribir('Nombre del menú', 'Solo bebidas');
      await escribir('Precio', '100');
      await clic(botonActivo('Crear menú'));
      expect(vi.mocked(api.crearMenu).mock.calls[0][0]).not.toHaveProperty('alimentoIds');
    });

    it('si la API rechaza, muestra el motivo y conserva lo escrito', async () => {
      vi.mocked(api.crearMenu).mockRejectedValue(new ApiError(400, 'Alguno de los alimentos indicados no existe'));
      await escribir('Nombre del menú', 'Parrilla');
      await escribir('Precio', '100');
      await clic(botonActivo('Crear menú'));
      expect(textoPantalla()).toContain('Alguno de los alimentos indicados no existe');
      expect(campo('Nombre del menú').element.value).toBe('Parrilla');
    });
  });

  describe('alta sin alimentos cargados', () => {
    it('avisa que se puede guardar igual y sumarlos después', async () => {
      await montar();
      vi.mocked(api.listarAlimentos).mockResolvedValue([]);
      await clic(botonPorTexto('Nuevo menú'));
      expect(textoPantalla()).toContain('Todavía no cargaste alimentos');
    });
  });

  describe('edición', () => {
    it('carga los datos actuales; un alimento de baja del menú figura como opción para poder quitarlo', async () => {
      await montar([menu({ alimentos: [PIZZA, SANGUCHE] })]);
      await clic(botonAria('Editar Menú infantil'));

      expect(campo('Nombre del menú').element.value).toBe('Menú infantil');
      expect(campo('Precio').element.value).toBe('1500.5'); // sin ceros de más para editar
      const items = autocompletarAlimentos().props('items') as { id: number; titulo: string }[];
      expect(items.find((i) => i.id === 3)!.titulo).toBe('Sánguche · comida (de baja)');
      expect(autocompletarAlimentos().props('modelValue')).toEqual([1, 3]);
    });

    it('si no se tocan los alimentos, NO se envían (la API reemplaza el conjunto)', async () => {
      await montar();
      vi.mocked(api.actualizarMenu).mockResolvedValue(menu());
      await clic(botonAria('Editar Menú infantil'));
      await escribir('Precio', '1800');
      await clic(botonActivo('Guardar cambios'));

      const [id, cambios] = vi.mocked(api.actualizarMenu).mock.calls[0];
      expect(id).toBe(10);
      expect(cambios).toMatchObject({ nombre: 'Menú infantil', precio: 1800, publico: 'ninos', precioPor: 'persona' });
      expect(cambios).not.toHaveProperty('alimentoIds');
      expect(genericosStore().textoSnack).toContain('Se guardaron los cambios');
    });

    it('si se cambian los alimentos, se envía el conjunto completo', async () => {
      await montar();
      vi.mocked(api.actualizarMenu).mockResolvedValue(menu());
      await clic(botonAria('Editar Menú infantil'));
      await autocompletarAlimentos().setValue([1]); // quita la gaseosa
      await clic(botonActivo('Guardar cambios'));
      expect(vi.mocked(api.actualizarMenu).mock.calls[0][1]).toMatchObject({ alimentoIds: [1] });
    });

    it('se puede vaciar el menú (lista vacía) y se envía []', async () => {
      await montar();
      vi.mocked(api.actualizarMenu).mockResolvedValue(menu({ alimentos: [] }));
      await clic(botonAria('Editar Menú infantil'));
      await autocompletarAlimentos().setValue([]);
      await clic(botonActivo('Guardar cambios'));
      expect(vi.mocked(api.actualizarMenu).mock.calls[0][1]).toMatchObject({ alimentoIds: [] });
    });
  });

  describe('baja y reactivación', () => {
    it('dar de baja: confirma con un texto claro, ejecuta y recarga', async () => {
      await montar();
      vi.mocked(api.actualizarMenu).mockResolvedValue(menu({ inhabilitado: true }));
      await clic(botonAria('Dar de baja Menú infantil'));

      expect(textoPantalla()).toContain('dejará de ofrecerse para reservas nuevas');
      expect(textoPantalla()).toContain('podés reactivarlo');
      expect(api.actualizarMenu).not.toHaveBeenCalled();

      await clic(botonActivo('Dar de baja'));
      expect(api.actualizarMenu).toHaveBeenCalledWith(10, { inhabilitado: true });
      expect(genericosStore().textoSnack).toBe('«Menú infantil» fue dado de baja.');
      expect(api.listarMenus).toHaveBeenCalledTimes(2);
    });

    it('reactivar', async () => {
      await montar([menu({ inhabilitado: true })]);
      vi.mocked(api.actualizarMenu).mockResolvedValue(menu());
      await clic(botonAria('Reactivar Menú infantil'));
      await clic(botonActivo('Reactivar'));
      expect(api.actualizarMenu).toHaveBeenCalledWith(10, { inhabilitado: false });
      expect(genericosStore().textoSnack).toBe('«Menú infantil» fue reactivado.');
    });

    it('cancelar no cambia nada, y un error se avisa', async () => {
      await montar();
      await clic(botonAria('Dar de baja Menú infantil'));
      await clic(botonActivo('Cancelar'));
      expect(api.actualizarMenu).not.toHaveBeenCalled();

      vi.mocked(api.actualizarMenu).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Dar de baja Menú infantil'));
      await clic(botonActivo('Dar de baja'));
      expect(genericosStore().colorSnack).toBe('error');
    });
  });
});
