import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiMedios from '@/api/medios';
import * as api from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { Instalacion, Perfil, RolCodigo } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, textoPantalla } from '@/test/ayudas';
import InstalacionesView from '../InstalacionesView.vue';

vi.mock('@/api/catalogos');
vi.mock('@/api/medios');

const instalacion = (extra: Partial<Instalacion> = {}): Instalacion => ({
  id: 7, nombre: 'Cama elástica', descripcion: 'Con red de seguridad', precio: '2500.00', edadMin: 4, edadMax: 12,
  inhabilitado: false, creadoEn: '', actualizadoEn: '', ...extra,
});
const PELOTERO = instalacion({ id: 8, nombre: 'Pelotero', descripcion: null, precio: '0.00', edadMin: null, edadMax: null });

let wrapper: VueWrapper;

const modo = (valor: 'atp' | 'limite') => document.querySelector<HTMLInputElement>('.v-overlay--active input[type="radio"][value="' + valor + '"]');

async function montar(lista: Instalacion[] = [instalacion(), PELOTERO], rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarInstalaciones).mockResolvedValue(lista);
  vi.mocked(apiMedios.listarMedios).mockResolvedValue([]);
  wrapper = mount(InstalacionesView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
  await flushPromises();
}

describe('InstalacionesView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('listado', () => {
    it('muestra edades en palabras y el precio (o «Sin cargo»)', async () => {
      await montar();
      const texto = wrapper.text();
      expect(texto).toContain('Cama elástica');
      expect(texto).toContain('Con red de seguridad');
      expect(texto).toContain('De 4 a 12 años');
      expect(texto).toMatch(/2\.500,00/);
      expect(texto).toContain('Pelotero');
      expect(texto).toContain('Apto para todo público (ATP)');
      expect(texto).toContain('Sin cargo');
    });

    it('sin instalaciones, lo explica; el empleado no ve acciones', async () => {
      await montar([], 'empleado');
      expect(wrapper.text()).toContain('juegos y atracciones');
      expect(botonPorTexto('Nueva instalación')).toBeUndefined();
    });

    it('las de baja se ven como tales y el texto de la confirmación es femenino', async () => {
      await montar();
      vi.mocked(api.actualizarInstalacion).mockResolvedValue(PELOTERO);
      await clic(botonAria('Dar de baja Pelotero'));
      expect(textoPantalla()).toContain('podés reactivarla cuando quieras');
      await clic(botonActivo('Dar de baja'));
      expect(api.actualizarInstalacion).toHaveBeenCalledWith(8, { inhabilitado: true });
      expect(genericosStore().textoSnack).toBe('«Pelotero» fue dada de baja.');
    });

    it('reactivar (en femenino)', async () => {
      await montar([instalacion({ inhabilitado: true })]);
      vi.mocked(api.actualizarInstalacion).mockResolvedValue(instalacion());
      await clic(botonAria('Reactivar Cama elástica'));
      await clic(botonActivo('Reactivar'));
      expect(genericosStore().textoSnack).toBe('«Cama elástica» fue reactivada.');
    });

    it('error de carga con reintento', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      vi.mocked(api.listarInstalaciones).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      wrapper = mount(InstalacionesView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');
      vi.mocked(api.listarInstalaciones).mockResolvedValueOnce([PELOTERO]);
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).toContain('Pelotero');
    });
  });

  describe('alta', () => {
    beforeEach(async () => {
      await montar();
      await clic(botonPorTexto('Nueva instalación'));
    });

    it('por defecto es «Apto para todo público (ATP)» y no pide edades', () => {
      expect(modo('atp')!.checked).toBe(true);
      expect(modo('limite')!.checked).toBe(false);
      expect(textoPantalla()).not.toContain('Edad mínima');
    });

    it('al elegir «Con límite de edad» aparecen los campos de edad', async () => {
      await clic(modo('limite'));
      expect(textoPantalla()).toContain('Edad mínima');
      expect(textoPantalla()).toContain('Edad máxima');
      expect(textoPantalla()).toContain('solo la mínima, solo la máxima, o las dos');
    });

    it('si escribió edades pero vuelve a ATP, no se envían', async () => {
      vi.mocked(api.crearInstalacion).mockResolvedValue(PELOTERO);
      await escribir('Nombre', 'Mesa de ping pong');
      await clic(modo('limite'));
      await escribir('Edad mínima', '8');
      await clic(modo('atp'));
      await clic(botonActivo('Agregar'));
      const datos = vi.mocked(api.crearInstalacion).mock.calls[0][0];
      expect(datos.edadMin).toBeUndefined();
      expect(datos.edadMax).toBeUndefined();
    });

    it('lo mínimo (solo el nombre): precio 0 y sin edades ni descripción', async () => {
      vi.mocked(api.crearInstalacion).mockResolvedValue(PELOTERO);
      await escribir('Nombre', 'Metegol');
      await clic(botonActivo('Agregar'));

      const datos = vi.mocked(api.crearInstalacion).mock.calls[0][0];
      expect(datos).toMatchObject({ nombre: 'Metegol', precio: 0 });
      expect(datos.edadMin).toBeUndefined();
      expect(datos.edadMax).toBeUndefined();
      expect(datos.descripcion).toBeUndefined();
      expect(genericosStore().textoSnack).toBe('«Metegol» fue agregada.');
    });

    it('completo: descripción, precio con decimales y rango de edades como números', async () => {
      vi.mocked(api.crearInstalacion).mockResolvedValue(PELOTERO);
      await escribir('Nombre', 'Toro mecánico');
      await escribir('Descripción', ' Solo mayores ');
      await escribir('Precio como adicional', '3500.75');
      await clic(modo('limite'));
      await escribir('Edad mínima', '10');
      await escribir('Edad máxima', '99');
      await clic(botonActivo('Agregar'));

      expect(api.crearInstalacion).toHaveBeenCalledWith({
        nombre: 'Toro mecánico', descripcion: 'Solo mayores', precio: 3500.75, edadMin: 10, edadMax: 99,
      });
    });

    it('valida nombre, importe y edades (incluido «máxima menor que mínima»)', async () => {
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('Campo obligatorio');

      await escribir('Nombre', 'X');
      await escribir('Precio como adicional', '10.123');
      await clic(modo('limite'));
      await escribir('Edad mínima', '12');
      await escribir('Edad máxima', '4');
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('Un importe positivo con hasta 2 decimales');
      expect(textoPantalla()).toContain('No puede ser menor que la edad mínima');

      await escribir('Precio como adicional', '10');
      await escribir('Edad máxima', '500');
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('Un número entero entre 0 y 120');
      expect(api.crearInstalacion).not.toHaveBeenCalled();
    });

    it('si la API rechaza, muestra el motivo y conserva lo escrito', async () => {
      vi.mocked(api.crearInstalacion).mockRejectedValue(new ApiError(400, 'edadMax no puede ser menor que edadMin'));
      await escribir('Nombre', 'X');
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('edadMax no puede ser menor que edadMin');
      expect(campo('Nombre').element.value).toBe('X');
    });
  });

  describe('edición', () => {
    it('carga los datos actuales y guarda los cambios', async () => {
      await montar();
      vi.mocked(api.actualizarInstalacion).mockResolvedValue(instalacion());
      await clic(botonAria('Editar Cama elástica'));

      expect(campo('Nombre').element.value).toBe('Cama elástica');
      expect(campo('Precio como adicional').element.value).toBe('2500');
      expect(campo('Edad mínima').element.value).toBe('4');
      expect(campo('Edad máxima').element.value).toBe('12');

      await escribir('Precio como adicional', '3000');
      await clic(botonActivo('Guardar cambios'));
      expect(api.actualizarInstalacion).toHaveBeenCalledWith(7, {
        nombre: 'Cama elástica', descripcion: 'Con red de seguridad', precio: 3000, edadMin: 4, edadMax: 12,
      });
    });

    it('elegir «Apto para todo público» QUITA las edades (se envía null, no se ignora)', async () => {
      await montar();
      vi.mocked(api.actualizarInstalacion).mockResolvedValue(instalacion({ edadMin: null, edadMax: null }));
      await clic(botonAria('Editar Cama elástica'));
      await clic(modo('atp'));
      expect(textoPantalla()).not.toContain('Edad mínima'); // los campos de edad desaparecen
      await clic(botonActivo('Guardar cambios'));

      const cambios = vi.mocked(api.actualizarInstalacion).mock.calls[0][1];
      expect(cambios.edadMin).toBeNull();
      expect(cambios.edadMax).toBeNull();
    });

    it('una instalación con edades se abre en «Con límite de edad»; una sin edades, en ATP', async () => {
      await montar();
      await clic(botonAria('Editar Cama elástica'));
      expect(modo('limite')!.checked).toBe(true);
      await clic(botonActivo('Cancelar'));
      await clic(botonAria('Editar Pelotero'));
      expect(modo('atp')!.checked).toBe(true);
      expect(textoPantalla()).not.toContain('Edad mínima');
    });

    it('en «Con límite de edad» no se puede dejar todo vacío', async () => {
      await montar();
      await clic(botonAria('Editar Cama elástica'));
      await escribir('Edad mínima', '');
      await escribir('Edad máxima', '');
      await clic(botonActivo('Guardar cambios'));
      expect(textoPantalla()).toContain('Indicá al menos una edad');
      expect(api.actualizarInstalacion).not.toHaveBeenCalled();
    });

    it('se puede poner solo la edad mínima, o solo la máxima', async () => {
      await montar();
      vi.mocked(api.actualizarInstalacion).mockResolvedValue(PELOTERO);
      await clic(botonAria('Editar Pelotero'));
      await clic(modo('limite'));
      await escribir('Edad mínima', '6');
      await clic(botonActivo('Guardar cambios'));
      const cambios = vi.mocked(api.actualizarInstalacion).mock.calls[0][1];
      expect(cambios.edadMin).toBe(6);
      expect(cambios.edadMax).toBeUndefined(); // nunca tuvo máxima y no se pidió
    });

    it('si nunca tuvo edades y siguen vacías, no se mandan', async () => {
      await montar();
      vi.mocked(api.actualizarInstalacion).mockResolvedValue(PELOTERO);
      await clic(botonAria('Editar Pelotero'));
      await clic(botonActivo('Guardar cambios'));
      const cambios = vi.mocked(api.actualizarInstalacion).mock.calls[0][1];
      expect(cambios.edadMin).toBeUndefined();
      expect(cambios.edadMax).toBeUndefined();
      expect(cambios.precio).toBe(0);
    });
  });
});
