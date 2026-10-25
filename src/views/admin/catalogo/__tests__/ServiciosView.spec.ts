import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { Perfil, RolCodigo, Servicio } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, textoPantalla } from '@/test/ayudas';
import ServiciosView from '../ServiciosView.vue';

vi.mock('@/api/catalogos');

const servicio = (extra: Partial<Servicio> = {}): Servicio => ({
  id: 5, nombre: 'Video invitación', descripcion: 'Con fotos del cumpleañero', precio: '12000.00', precioPor: 'fijo',
  inhabilitado: false, creadoEn: '', actualizadoEn: '', ...extra,
});

let wrapper: VueWrapper;

async function montar(lista: Servicio[] = [servicio()], rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarServicios).mockResolvedValue(lista);
  wrapper = mount(ServiciosView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
  await flushPromises();
}

describe('ServiciosView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  it('lista con el precio formateado y cómo se cobra', async () => {
    await montar([servicio(), servicio({ id: 6, nombre: 'Mozos', descripcion: null, precio: '3500.50', precioPor: 'persona' })]);
    const texto = wrapper.text();
    expect(texto).toContain('Video invitación');
    expect(texto).toContain('Con fotos del cumpleañero');
    expect(texto).toMatch(/12\.000,00/);
    expect(texto).toContain('precio fijo');
    expect(texto).toMatch(/3\.500,50/);
    expect(texto).toContain('por persona');
  });

  it('sin servicios lo explica; el empleado solo consulta', async () => {
    await montar([], 'empleado');
    expect(wrapper.text()).toContain('mozos, video invitación, decoración');
    expect(botonPorTexto('Nuevo servicio')).toBeUndefined();
  });

  it('error de carga con reintento', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.mocked(api.listarServicios).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
    wrapper = mount(ServiciosView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('No se pudo conectar');
    vi.mocked(api.listarServicios).mockResolvedValueOnce([servicio()]);
    await clic(botonPorTexto('Reintentar'));
    expect(wrapper.text()).toContain('Video invitación');
  });

  describe('alta', () => {
    beforeEach(async () => {
      await montar();
      await clic(botonPorTexto('Nuevo servicio'));
    });

    it('nombre y precio son obligatorios; el importe se valida', async () => {
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('Campo obligatorio');

      await escribir('Nombre', 'Animador');
      await escribir('Precio', '-5');
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('Un importe positivo con hasta 2 decimales');
      expect(api.crearServicio).not.toHaveBeenCalled();
    });

    it('por defecto es precio fijo; envía el importe como número', async () => {
      vi.mocked(api.crearServicio).mockResolvedValue(servicio());
      await escribir('Nombre', '  Animador  ');
      await escribir('Precio', '25000.5');
      await clic(botonActivo('Agregar'));

      expect(api.crearServicio).toHaveBeenCalledWith({ nombre: 'Animador', descripcion: undefined, precio: 25000.5, precioPor: 'fijo' });
      expect(genericosStore().textoSnack).toBe('«Animador» fue agregado.');
      expect(api.listarServicios).toHaveBeenCalledTimes(2);
    });

    it('se puede cobrar por persona', async () => {
      vi.mocked(api.crearServicio).mockResolvedValue(servicio());
      await escribir('Nombre', 'Mozos');
      await escribir('Precio', '3500');
      await clic(document.querySelector('.v-overlay--active input[type="radio"][value="persona"]'));
      await clic(botonActivo('Agregar'));
      expect(api.crearServicio).toHaveBeenCalledWith(expect.objectContaining({ precio: 3500, precioPor: 'persona' }));
    });

    it('si la API rechaza, muestra el motivo y conserva lo escrito', async () => {
      vi.mocked(api.crearServicio).mockRejectedValue(new ApiError(400, 'precio debe ser un número válido'));
      await escribir('Nombre', 'Animador');
      await escribir('Precio', '100');
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('precio debe ser un número válido');
      expect(campo('Nombre').element.value).toBe('Animador');
    });
  });

  describe('edición, baja y reactivación', () => {
    it('edita cargando los datos actuales', async () => {
      await montar();
      vi.mocked(api.actualizarServicio).mockResolvedValue(servicio());
      await clic(botonAria('Editar Video invitación'));
      expect(campo('Precio').element.value).toBe('12000');
      await escribir('Precio', '15000');
      await clic(botonActivo('Guardar cambios'));
      expect(api.actualizarServicio).toHaveBeenCalledWith(5, {
        nombre: 'Video invitación', descripcion: 'Con fotos del cumpleañero', precio: 15000, precioPor: 'fijo',
      });
    });

    it('dar de baja y reactivar', async () => {
      await montar();
      vi.mocked(api.actualizarServicio).mockResolvedValue(servicio());
      await clic(botonAria('Dar de baja Video invitación'));
      await clic(botonActivo('Dar de baja'));
      expect(api.actualizarServicio).toHaveBeenCalledWith(5, { inhabilitado: true });
      expect(genericosStore().textoSnack).toBe('«Video invitación» fue dado de baja.');

      wrapper.unmount();
      await montar([servicio({ inhabilitado: true })]);
      await clic(botonAria('Reactivar Video invitación'));
      await clic(botonActivo('Reactivar'));
      expect(api.actualizarServicio).toHaveBeenLastCalledWith(5, { inhabilitado: false });
    });

    it('si la baja falla, se avisa con un error', async () => {
      await montar();
      vi.mocked(api.actualizarServicio).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Dar de baja Video invitación'));
      await clic(botonActivo('Dar de baja'));
      expect(genericosStore().colorSnack).toBe('error');
    });
  });
});
