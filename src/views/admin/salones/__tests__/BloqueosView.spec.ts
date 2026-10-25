import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VSelect } from 'vuetify/components';
import * as apiBloqueos from '@/api/bloqueos';
import { ApiError } from '@/api/http';
import * as apiSalones from '@/api/salones';
import type { Bloqueo, Perfil, RolCodigo, Salon } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, routerDePrueba, textoPantalla } from '@/test/ayudas';
import { localAIso } from '@/utils/zonaHoraria';
import BloqueosView from '../BloqueosView.vue';

vi.mock('@/api/bloqueos');
vi.mock('@/api/salones');

const BA = 'America/Argentina/Buenos_Aires';
const salon = (id: number, nombre: string, inhabilitado = false): Salon => ({
  id, nombre, descripcion: null, capacidad: null, esDefault: id === 1, minutosLimpieza: 0, inhabilitado, creadoEn: '', actualizadoEn: '',
});
const SALONES = [salon(1, 'Salón Arcoíris'), salon(2, 'Salón Luna'), salon(3, 'Salón Viejo', true)];

/** Cierre de días completos en hora de Buenos Aires: del `desde` (inclusive) al `ultimo` (inclusive). */
const diasCompletos = (id: number, desde: string, ultimo: string, salonId: number | null, motivo: string | null): Bloqueo => ({
  id,
  salonId,
  desde: localAIso(`${desde}T00:00`, BA),
  hasta: localAIso(`${new Date(Date.parse(`${ultimo}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)}T00:00`, BA),
  motivo,
});
const FERIADO = diasCompletos(1, '2027-12-25', '2027-12-25', null, 'Navidad');
const PINTURA = diasCompletos(2, '2027-03-10', '2027-03-12', 2, 'Pintura');

let wrapper: VueWrapper;

async function montar(bloqueos: Bloqueo[] = [FERIADO, PINTURA], rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: BA },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(apiSalones.listarSalones).mockResolvedValue(SALONES);
  vi.mocked(apiBloqueos.listarBloqueos).mockResolvedValue(bloqueos);
  wrapper = mount(BloqueosView, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

const interruptorDias = () => document.querySelector<HTMLInputElement>('.v-overlay--active input[type="checkbox"]');

describe('BloqueosView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('listado', () => {
    it('describe cada cierre en la hora del salón, con su alcance y motivo', async () => {
      await montar();
      const texto = wrapper.text();
      expect(texto).toContain('Todos los salones');
      expect(texto).toContain('25/12/2027 · todo el día');
      expect(texto).toContain('Navidad');
      expect(texto).toContain('Salón Luna'); // nombre del salón, no su id
      expect(texto).toContain('10/03/2027');
      expect(texto).toContain('12/03/2027'); // el último día incluido, no el de la medianoche siguiente
      expect(texto).toContain('todos los días');
    });

    it('sin cierres lo dice', async () => {
      await montar([]);
      expect(wrapper.text()).toContain('No hay cierres cargados');
    });

    it('por defecto pide solo los que todavía no terminaron; «Incluir pasados» los pide todos', async () => {
      await montar();
      const primera = vi.mocked(apiBloqueos.listarBloqueos).mock.calls[0][0]!;
      expect(typeof primera.desde).toBe('string');
      expect(primera).not.toHaveProperty('salonId');

      await clic(wrapper.findAll('input[type="checkbox"]')[0].element);
      const ultima = vi.mocked(apiBloqueos.listarBloqueos).mock.calls.at(-1)![0]!;
      expect(ultima).not.toHaveProperty('desde');
    });

    it('filtrar por salón envía su id', async () => {
      await montar();
      await wrapper.findComponent(VSelect).setValue(2);
      await flushPromises();
      expect(vi.mocked(apiBloqueos.listarBloqueos).mock.calls.at(-1)![0]).toMatchObject({ salonId: 2 });
    });

    it('si falla la carga muestra el error y permite reintentar', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      vi.mocked(apiSalones.listarSalones).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      vi.mocked(apiBloqueos.listarBloqueos).mockResolvedValue([]);
      wrapper = mount(BloqueosView, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');

      vi.mocked(apiSalones.listarSalones).mockResolvedValueOnce(SALONES);
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).not.toContain('No se pudo conectar');
    });

    it('el empleado solo consulta', async () => {
      await montar([FERIADO], 'empleado');
      expect(wrapper.text()).toContain('Navidad');
      expect(botonPorTexto('Nuevo cierre')).toBeUndefined();
      expect(botonAria('Editar el cierre Navidad')).toBeNull();
      expect(botonAria('Quitar el cierre Navidad')).toBeNull();
    });
  });

  describe('alta', () => {
    beforeEach(async () => {
      await montar();
      await clic(botonPorTexto('Nuevo cierre'));
    });

    it('un día completo: guarda de las 00:00 a las 00:00 del día siguiente en hora de Buenos Aires', async () => {
      vi.mocked(apiBloqueos.crearBloqueo).mockResolvedValue(FERIADO);
      await escribir('Desde el día', '2027-12-31');
      await escribir('Motivo', '  Fin de año ');
      await clic(botonActivo('Crear cierre'));

      expect(apiBloqueos.crearBloqueo).toHaveBeenCalledWith({
        salonId: null,
        desde: '2027-12-31T03:00:00.000Z', // 00:00 en Buenos Aires
        hasta: '2028-01-01T03:00:00.000Z', // 00:00 del día siguiente
        motivo: 'Fin de año',
      });
      expect(genericosStore().textoSnack).toBe('Cierre creado.');
      expect(apiBloqueos.listarBloqueos).toHaveBeenCalledTimes(2);
    });

    it('varios días: «hasta» es inclusive', async () => {
      vi.mocked(apiBloqueos.crearBloqueo).mockResolvedValue(PINTURA);
      await escribir('Desde el día', '2027-12-31');
      await escribir('Hasta el día', '2028-01-02');
      await clic(botonActivo('Crear cierre'));

      const datos = vi.mocked(apiBloqueos.crearBloqueo).mock.calls[0][0];
      expect(datos.desde).toBe('2027-12-31T03:00:00.000Z');
      expect(datos.hasta).toBe('2028-01-03T03:00:00.000Z'); // hasta el inicio del 03/01: incluye el 02/01 completo
      expect(datos.motivo).toBeUndefined(); // sin motivo no se envía vacío
    });

    it('con horas puntuales usa la hora de la empresa, no la del navegador', async () => {
      vi.mocked(apiBloqueos.crearBloqueo).mockResolvedValue(FERIADO);
      await clic(interruptorDias()); // apaga «Días completos»
      await escribir('Desde', '2027-12-31T18:00');
      await escribir('Hasta', '2028-01-01T02:00');
      await clic(botonActivo('Crear cierre'));

      expect(apiBloqueos.crearBloqueo).toHaveBeenCalledWith(
        expect.objectContaining({ desde: '2027-12-31T21:00:00.000Z', hasta: '2028-01-01T05:00:00.000Z' }),
      );
    });

    it('valida: obligatorio, y que el fin no sea anterior al inicio', async () => {
      await clic(botonActivo('Crear cierre'));
      expect(textoPantalla()).toContain('Campo obligatorio');

      await escribir('Desde el día', '2027-12-31');
      await escribir('Hasta el día', '2027-12-30');
      await clic(botonActivo('Crear cierre'));
      expect(textoPantalla()).toContain('No puede ser anterior al día de inicio');

      await clic(interruptorDias());
      await escribir('Desde', '2027-12-31T18:00');
      await escribir('Hasta', '2027-12-31T17:00');
      await clic(botonActivo('Crear cierre'));
      expect(textoPantalla()).toContain('Debe ser posterior al inicio');
      expect(apiBloqueos.crearBloqueo).not.toHaveBeenCalled();
    });

    it('si la API rechaza, muestra el motivo y conserva lo escrito', async () => {
      vi.mocked(apiBloqueos.crearBloqueo).mockRejectedValue(new ApiError(400, 'El salón indicado no existe'));
      await escribir('Desde el día', '2027-12-31');
      await clic(botonActivo('Crear cierre'));
      expect(textoPantalla()).toContain('El salón indicado no existe');
      expect(campo('Desde el día').element.value).toBe('2027-12-31');
    });

    it('el selector ofrece «Todos» y los salones activos (no los de baja)', async () => {
      const opciones = wrapper.findAllComponents(VSelect).at(-1)!.props('items') as { titulo: string }[];
      expect(opciones.map((o) => o.titulo)).toEqual(['Todos los salones', 'Salón Arcoíris', 'Salón Luna']);
    });
  });

  describe('edición y baja', () => {
    it('al editar un cierre de días completos se vuelve a mostrar como fechas', async () => {
      await montar();
      vi.mocked(apiBloqueos.actualizarBloqueo).mockResolvedValue(PINTURA);
      await clic(botonAria('Editar el cierre Pintura'));

      expect(interruptorDias()!.checked).toBe(true);
      expect(campo('Desde el día').element.value).toBe('2027-03-10');
      expect(campo('Hasta el día').element.value).toBe('2027-03-12'); // el último día, no la medianoche siguiente

      await escribir('Motivo', 'Pintura y arreglos');
      await clic(botonActivo('Guardar cambios'));

      expect(apiBloqueos.actualizarBloqueo).toHaveBeenCalledWith(2, {
        salonId: 2, desde: PINTURA.desde, hasta: PINTURA.hasta, motivo: 'Pintura y arreglos',
      });
    });

    it('un cierre con horas puntuales se edita con fecha y hora', async () => {
      const puntual: Bloqueo = { id: 5, salonId: null, desde: localAIso('2027-06-01T18:00', BA), hasta: localAIso('2027-06-01T23:30', BA), motivo: 'Evento propio' };
      await montar([puntual]);
      await clic(botonAria('Editar el cierre Evento propio'));
      expect(interruptorDias()!.checked).toBe(false);
      expect(campo('Desde').element.value).toBe('2027-06-01T18:00');
      expect(campo('Hasta').element.value).toBe('2027-06-01T23:30');
    });

    it('quitar pide confirmación, describe el cierre y recién ahí elimina', async () => {
      await montar();
      vi.mocked(apiBloqueos.eliminarBloqueo).mockResolvedValue(undefined);
      await clic(botonAria('Quitar el cierre Navidad'));

      expect(textoPantalla()).toContain('Se quitará el cierre');
      expect(textoPantalla()).toContain('25/12/2027');
      expect(textoPantalla()).toContain('volverán a poder reservarse');
      expect(apiBloqueos.eliminarBloqueo).not.toHaveBeenCalled();

      await clic(botonActivo('Quitar'));
      expect(apiBloqueos.eliminarBloqueo).toHaveBeenCalledWith(1);
      expect(genericosStore().textoSnack).toBe('Cierre quitado.');
      expect(apiBloqueos.listarBloqueos).toHaveBeenCalledTimes(2);
    });

    it('si la baja falla se avisa con un error', async () => {
      await montar();
      vi.mocked(apiBloqueos.eliminarBloqueo).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Quitar el cierre Navidad'));
      await clic(botonActivo('Quitar'));
      expect(genericosStore().colorSnack).toBe('error');
    });
  });
});
