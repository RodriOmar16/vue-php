import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as api from '@/api/salones';
import type { Franja, Perfil, RolCodigo, Salon } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonActivo, botonAria, botonPorTexto, clic, escribir, routerDePrueba, textoPantalla } from '@/test/ayudas';
import HorariosSalonView from '../HorariosSalonView.vue';

vi.mock('@/api/salones');

const SALON: Salon = {
  id: 3, nombre: 'Salón Arcoíris', descripcion: null, capacidad: null, esDefault: true,
  minutosLimpieza: 0, inhabilitado: false, creadoEn: '', actualizadoEn: '',
};
const franja = (id: number, diaSemana: number, horaInicio: string, horaFin: string): Franja => ({ id, salonId: 3, diaSemana, horaInicio, horaFin });
const SABADO = franja(10, 6, '15:00', '22:00');

let wrapper: VueWrapper;

async function montar(franjas: Franja[] = [SABADO], rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.obtenerSalon).mockResolvedValue(SALON);
  vi.mocked(api.listarFranjas).mockResolvedValue(franjas);
  wrapper = mount(HorariosSalonView, {
    props: { id: 3 },
    global: { plugins: [vuetify, pinia, await routerDePrueba()] },
    attachTo: document.body,
  });
  await flushPromises();
}

const chipDia = (nombre: string) =>
  [...document.querySelectorAll<HTMLElement>('.v-overlay--active .v-chip')].find((c) => c.textContent?.includes(nombre));
const seleccionado = (nombre: string) => chipDia(nombre)?.classList.contains('text-primary') ?? false;

describe('HorariosSalonView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('lectura', () => {
    it('muestra los 7 días: los horarios cargados y «Cerrado» en los demás', async () => {
      await montar([SABADO, franja(11, 7, '20:00', '02:00')]);
      expect(wrapper.text()).toContain('Horarios de Salón Arcoíris');
      for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
        expect(wrapper.text()).toContain(dia);
      }
      expect(wrapper.find('[data-testid="dia-6"]').text()).toContain('15:00 a 22:00 (7 h)');
      expect(wrapper.find('[data-testid="dia-7"]').text()).toContain('20:00 a 02:00 del día siguiente (6 h)');
      expect(wrapper.find('[data-testid="dia-1"]').text()).toContain('Cerrado');
      expect(wrapper.find('[data-testid="dia-6"]').text()).not.toContain('Cerrado');
    });

    it('si falla la carga muestra el error, sin mostrar los días como «Cerrado», y permite reintentar', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      vi.mocked(api.obtenerSalon).mockRejectedValueOnce(new ApiError(404, 'No se encontró lo que busca.'));
      vi.mocked(api.listarFranjas).mockResolvedValue([]);
      wrapper = mount(HorariosSalonView, { props: { id: 3 }, global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se encontró lo que busca.');
      expect(wrapper.text()).not.toContain('Cerrado');

      vi.mocked(api.obtenerSalon).mockResolvedValueOnce(SALON);
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).toContain('Cerrado');
    });

    it('el empleado solo consulta: no ve agregar, editar ni quitar', async () => {
      await montar([SABADO], 'empleado');
      expect(wrapper.text()).toContain('15:00 a 22:00');
      expect(botonPorTexto('Agregar')).toBeUndefined();
      expect(botonAria('Editar el horario del Sábado 15:00')).toBeNull();
      expect(botonAria('Quitar el horario del Sábado 15:00')).toBeNull();
    });
  });

  describe('agregar', () => {
    it('el día del botón viene tildado; completa y guarda, y refresca la lista', async () => {
      await montar();
      vi.mocked(api.crearFranja).mockResolvedValue(franja(20, 5, '16:00', '23:00'));
      await clic(botonAria('Agregar un horario el Viernes'));

      expect(seleccionado('Viernes')).toBe(true);
      expect(seleccionado('Sábado')).toBe(false);
      await escribir('Desde', '16:00');
      await escribir('Hasta', '23:00');
      expect(textoPantalla()).toContain('Dura 7 h.');

      await clic(botonActivo('Agregar'));

      expect(api.crearFranja).toHaveBeenCalledTimes(1);
      expect(api.crearFranja).toHaveBeenCalledWith(3, { diaSemana: 5, horaInicio: '16:00', horaFin: '23:00' });
      expect(genericosStore().textoSnack).toBe('Horarios actualizados.');
      expect(api.listarFranjas).toHaveBeenCalledTimes(2);
    });

    it('avisa cuando el horario termina al día siguiente', async () => {
      await montar([]);
      await clic(botonAria('Agregar un horario el Sábado'));
      await escribir('Desde', '20:00');
      await escribir('Hasta', '02:00');
      expect(textoPantalla()).toContain('Dura 6 h y termina al día siguiente.');
    });

    it('se puede cargar el mismo horario en varios días de una vez (en orden)', async () => {
      await montar([]);
      vi.mocked(api.crearFranja).mockResolvedValue(franja(1, 1, '15:00', '22:00'));
      await clic(botonAria('Agregar un horario el Sábado'));
      await clic(chipDia('Domingo'));
      await clic(chipDia('Viernes'));
      await escribir('Desde', '15:00');
      await escribir('Hasta', '22:00');

      await clic(botonActivo('Agregar'));

      expect(vi.mocked(api.crearFranja).mock.calls.map((c) => c[1].diaSemana)).toEqual([5, 6, 7]);
      expect(vi.mocked(api.crearFranja).mock.calls.every((c) => c[1].horaInicio === '15:00' && c[1].horaFin === '22:00')).toBe(true);
    });

    it('si un día choca, los demás igual se guardan y el diálogo queda con solo el que falló', async () => {
      await montar([]);
      vi.mocked(api.crearFranja)
        .mockResolvedValueOnce(franja(1, 5, '15:00', '22:00'))
        .mockRejectedValueOnce(new ApiError(409, 'La franja se superpone con otra del mismo salón'));
      await clic(botonAria('Agregar un horario el Viernes'));
      await clic(chipDia('Sábado'));
      await escribir('Desde', '15:00');
      await escribir('Hasta', '22:00');

      await clic(botonActivo('Agregar'));

      expect(textoPantalla()).toContain('Sábado: La franja se superpone con otra del mismo salón');
      expect(textoPantalla()).not.toContain('Viernes: La franja'); // el viernes salió bien
      expect(seleccionado('Sábado')).toBe(true);
      expect(seleccionado('Viernes')).toBe(false); // para reintentar solo el que falló
      expect(api.listarFranjas).toHaveBeenCalledTimes(2); // la lista se refrescó con el viernes ya guardado
    });

    it('valida: ningún día, horas vacías e iguales', async () => {
      await montar([]);
      await clic(botonPorTexto('Agregar')); // el primer «Agregar» de la lista (lunes)
      await clic(chipDia('Lunes')); // destilda el lunes
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('Elegí al menos un día');
      expect(textoPantalla()).toContain('Indicá una hora');

      await clic(chipDia('Lunes'));
      await escribir('Desde', '15:00');
      await escribir('Hasta', '15:00');
      await clic(botonActivo('Agregar'));
      expect(textoPantalla()).toContain('no pueden ser iguales');
      expect(api.crearFranja).not.toHaveBeenCalled();
    });
  });

  describe('editar y quitar', () => {
    it('editar cambia las horas del mismo día', async () => {
      await montar();
      vi.mocked(api.actualizarFranja).mockResolvedValue(franja(10, 6, '14:00', '22:00'));
      await clic(botonAria('Editar el horario del Sábado 15:00'));

      expect(textoPantalla()).toContain('Editar horario');
      expect(document.querySelector('.v-overlay--active .v-chip')).toBeNull(); // no se elige día al editar
      await escribir('Desde', '14:00');
      await clic(botonActivo('Guardar'));

      expect(api.actualizarFranja).toHaveBeenCalledWith(3, 10, { horaInicio: '14:00', horaFin: '22:00' });
      expect(api.listarFranjas).toHaveBeenCalledTimes(2);
    });

    it('si la API rechaza la edición, muestra el motivo y no cierra', async () => {
      await montar();
      vi.mocked(api.actualizarFranja).mockRejectedValue(new ApiError(409, 'La franja se superpone con otra del mismo salón'));
      await clic(botonAria('Editar el horario del Sábado 15:00'));
      await escribir('Desde', '14:00');
      await clic(botonActivo('Guardar'));
      expect(textoPantalla()).toContain('La franja se superpone');
    });

    it('quitar pide confirmación, nombra el día y las horas, y recién ahí elimina', async () => {
      await montar();
      vi.mocked(api.eliminarFranja).mockResolvedValue(undefined);
      await clic(botonAria('Quitar el horario del Sábado 15:00'));

      expect(textoPantalla()).toContain('Se quitará el horario del Sábado');
      expect(textoPantalla()).toContain('15:00 a 22:00 (7 h)');
      expect(api.eliminarFranja).not.toHaveBeenCalled();

      await clic(botonActivo('Quitar'));
      expect(api.eliminarFranja).toHaveBeenCalledWith(3, 10);
      expect(genericosStore().textoSnack).toBe('Horario quitado.');
      expect(api.listarFranjas).toHaveBeenCalledTimes(2);
    });

    it('cancelar no elimina', async () => {
      await montar();
      await clic(botonAria('Quitar el horario del Sábado 15:00'));
      await clic(botonActivo('Cancelar'));
      expect(api.eliminarFranja).not.toHaveBeenCalled();
    });
  });
});
