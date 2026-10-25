import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { Alimento, Perfil, RolCodigo } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, textoPantalla } from '@/test/ayudas';
import AlimentosView from '../AlimentosView.vue';

vi.mock('@/api/catalogos');

const alimento = (id: number, nombre: string, tipo: 'comida' | 'bebida', inhabilitado = false): Alimento => ({
  id, nombre, tipo, inhabilitado, creadoEn: '', actualizadoEn: '',
});
const PIZZA = alimento(1, 'Pizza', 'comida');
const GASEOSA = alimento(2, 'Gaseosa', 'bebida');

let wrapper: VueWrapper;

async function montar(lista: Alimento[] = [PIZZA, GASEOSA], rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarAlimentos).mockResolvedValue(lista);
  wrapper = mount(AlimentosView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
  await flushPromises();
}

const filas = () => wrapper.findAll('tbody tr').filter((f) => !f.text().includes('Todavía no hay'));

describe('AlimentosView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  it('lista con su tipo y estado; sin alimentos, explica para qué sirven', async () => {
    await montar();
    expect(wrapper.text()).toContain('Pizza');
    expect(wrapper.text()).toContain('Comida');
    expect(wrapper.text()).toContain('Gaseosa');
    expect(wrapper.text()).toContain('Bebida');
    expect(wrapper.text()).toContain('Activo');
    wrapper.unmount();
    await montar([]);
    expect(wrapper.text()).toContain('ingredientes con los que armás tus menús');
  });

  it('el filtro Comidas / Bebidas se aplica en pantalla, sin volver a pedir a la API', async () => {
    await montar();
    expect(filas()).toHaveLength(2);
    await clic([...wrapper.findAll('button')].find((b) => b.text() === 'Bebidas')!.element);
    expect(filas()).toHaveLength(1);
    expect(wrapper.text()).toContain('Gaseosa');
    expect(wrapper.text()).not.toContain('Pizza');
    await clic([...wrapper.findAll('button')].find((b) => b.text() === 'Bebidas')!.element); // lo destilda
    expect(filas()).toHaveLength(2);
    expect(api.listarAlimentos).toHaveBeenCalledTimes(1);
  });

  it('«Mostrar dados de baja» pide con ese filtro', async () => {
    await montar();
    await clic(wrapper.find('input[type="checkbox"]').element);
    expect(api.listarAlimentos).toHaveBeenLastCalledWith(true);
  });

  it('error de carga con reintento', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.mocked(api.listarAlimentos).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
    wrapper = mount(AlimentosView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('No se pudo conectar');
    vi.mocked(api.listarAlimentos).mockResolvedValueOnce([PIZZA]);
    await clic(botonPorTexto('Reintentar'));
    expect(wrapper.text()).toContain('Pizza');
  });

  it('el empleado solo consulta', async () => {
    await montar([PIZZA], 'empleado');
    expect(botonPorTexto('Nuevo alimento')).toBeUndefined();
    expect(botonAria('Editar Pizza')).toBeNull();
    expect(botonAria('Dar de baja Pizza')).toBeNull();
  });

  describe('alta y edición', () => {
    it('alta: nombre obligatorio; por defecto es una comida; envía datos limpios', async () => {
      await montar();
      vi.mocked(api.crearAlimento).mockResolvedValue(PIZZA);
      await clic(botonPorTexto('Nuevo alimento'));

      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('Campo obligatorio');
      expect(api.crearAlimento).not.toHaveBeenCalled();

      await escribir('Nombre', '  Empanadas  ');
      await clic(botonActivo('Agregar'));
      expect(api.crearAlimento).toHaveBeenCalledWith({ nombre: 'Empanadas', tipo: 'comida' });
      expect(genericosStore().textoSnack).toBe('«Empanadas» fue agregado.');
      expect(api.listarAlimentos).toHaveBeenCalledTimes(2);
    });

    it('alta de una bebida', async () => {
      await montar();
      vi.mocked(api.crearAlimento).mockResolvedValue(GASEOSA);
      await clic(botonPorTexto('Nuevo alimento'));
      await escribir('Nombre', 'Jugo');
      await clic(document.querySelector('.v-overlay--active input[type="radio"][value="bebida"]'));
      await clic(botonActivo('Agregar'));
      expect(api.crearAlimento).toHaveBeenCalledWith({ nombre: 'Jugo', tipo: 'bebida' });
    });

    it('edición: carga los datos y guarda; un error de la API se muestra en el diálogo', async () => {
      await montar();
      vi.mocked(api.actualizarAlimento).mockRejectedValueOnce(new ApiError(400, 'tipo debe ser uno de estos valores: comida, bebida'));
      await clic(botonAria('Editar Gaseosa'));
      expect(campo('Nombre').element.value).toBe('Gaseosa');
      expect(document.querySelector<HTMLInputElement>('.v-overlay--active input[type="radio"][value="bebida"]')!.checked).toBe(true);

      await clic(botonActivo('Guardar cambios'));
      expect(textoPantalla()).toContain('tipo debe ser uno de estos valores');

      vi.mocked(api.actualizarAlimento).mockResolvedValueOnce(GASEOSA);
      await escribir('Nombre', 'Gaseosa light');
      await clic(botonActivo('Guardar cambios'));
      expect(api.actualizarAlimento).toHaveBeenLastCalledWith(2, { nombre: 'Gaseosa light', tipo: 'bebida' });
    });
  });

  describe('baja y reactivación', () => {
    it('dar de baja con confirmación', async () => {
      await montar();
      vi.mocked(api.actualizarAlimento).mockResolvedValue(PIZZA);
      await clic(botonAria('Dar de baja Pizza'));
      expect(textoPantalla()).toContain('dejará de ofrecerse para reservas nuevas');
      expect(api.actualizarAlimento).not.toHaveBeenCalled();
      await clic(botonActivo('Dar de baja'));
      expect(api.actualizarAlimento).toHaveBeenCalledWith(1, { inhabilitado: true });
      expect(genericosStore().textoSnack).toBe('«Pizza» fue dado de baja.');
    });

    it('reactivar', async () => {
      await montar([alimento(1, 'Pizza', 'comida', true)]);
      vi.mocked(api.actualizarAlimento).mockResolvedValue(PIZZA);
      await clic(botonAria('Reactivar Pizza'));
      await clic(botonActivo('Reactivar'));
      expect(api.actualizarAlimento).toHaveBeenCalledWith(1, { inhabilitado: false });
    });

    it('si falla, se avisa con un error', async () => {
      await montar();
      vi.mocked(api.actualizarAlimento).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Dar de baja Pizza'));
      await clic(botonActivo('Dar de baja'));
      expect(genericosStore().colorSnack).toBe('error');
    });
  });
});
