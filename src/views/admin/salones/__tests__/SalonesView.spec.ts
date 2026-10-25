import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as api from '@/api/salones';
import type { Perfil, RolCodigo, Salon } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import {
  botonActivo, botonAria, botonPorTexto, campo, clic, escribir, routerDePrueba, textoPantalla,
} from '@/test/ayudas';
import SalonesView from '../SalonesView.vue';

vi.mock('@/api/salones');

const salon = (extra: Partial<Salon> = {}): Salon => ({
  id: 1, nombre: 'Salón Arcoíris', descripcion: 'El más grande', capacidad: 80, esDefault: true,
  minutosLimpieza: 30, inhabilitado: false, creadoEn: '', actualizadoEn: '', ...extra,
});
const PRINCIPAL = salon();
const SEGUNDO = salon({ id: 2, nombre: 'Salón Luna', descripcion: null, capacidad: null, esDefault: false, minutosLimpieza: 0 });

let wrapper: VueWrapper;

async function montar(lista: Salon[] = [PRINCIPAL, SEGUNDO], rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarSalones).mockResolvedValue(lista);
  const router = await routerDePrueba();
  wrapper = mount(SalonesView, { global: { plugins: [vuetify, pinia, router] }, attachTo: document.body });
  await flushPromises();
}

describe('SalonesView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('listado', () => {
    it('muestra cada salón con su capacidad, limpieza y marca el principal', async () => {
      await montar();
      const texto = wrapper.text();
      expect(texto).toContain('Salón Arcoíris');
      expect(texto).toContain('Principal');
      expect(texto).toContain('Hasta 80 personas');
      expect(texto).toContain('30 min de limpieza');
      expect(texto).toContain('El más grande');
      expect(texto).toContain('Salón Luna');
      expect(texto).toContain('Sin margen de limpieza');
      expect(texto).toContain('Sin descripción');
    });

    it('sin salones invita a crear el primero', async () => {
      await montar([]);
      expect(wrapper.text()).toContain('Todavía no hay salones');
      expect(wrapper.text()).toContain('Creá el primero');
    });

    it('si falla la carga muestra el error y permite reintentar', async () => {
      const pinia = createPinia();
      setActivePinia(pinia);
      vi.mocked(api.listarSalones).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      wrapper = mount(SalonesView, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');
      expect(wrapper.text()).not.toContain('Todavía no hay salones'); // el error no se confunde con «vacío»

      vi.mocked(api.listarSalones).mockResolvedValueOnce([PRINCIPAL]);
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).toContain('Salón Arcoíris');
    });

    it('«Mostrar dados de baja» vuelve a pedir el listado con ese filtro', async () => {
      await montar();
      expect(api.listarSalones).toHaveBeenLastCalledWith(false);
      await clic(wrapper.find('input[type="checkbox"]').element);
      expect(api.listarSalones).toHaveBeenLastCalledWith(true);
    });

    it('un salón de baja se ve marcado', async () => {
      await montar([PRINCIPAL, salon({ id: 3, nombre: 'Salón Viejo', esDefault: false, inhabilitado: true })]);
      expect(wrapper.text()).toContain('De baja');
      expect(botonAria('Reactivar Salón Viejo')).toBeTruthy();
    });
  });

  describe('empleado (solo consulta)', () => {
    it('no ve ninguna acción de edición, pero sí puede ir a los horarios', async () => {
      await montar([PRINCIPAL, SEGUNDO], 'empleado');
      expect(botonPorTexto('Nuevo salón')).toBeUndefined();
      expect(botonAria('Editar Salón Luna')).toBeNull();
      expect(botonAria('Dar de baja Salón Luna')).toBeNull();
      expect(botonAria('Marcar Salón Luna como principal')).toBeNull();
      expect(wrapper.findAll('a').some((a) => a.text().includes('Horarios'))).toBe(true);
    });

    it('con la lista vacía no le sugiere crear nada', async () => {
      await montar([], 'empleado');
      expect(wrapper.text()).toContain('Todavía no hay salones');
      expect(wrapper.text()).not.toContain('Creá el primero');
    });
  });

  describe('alta', () => {
    beforeEach(async () => {
      await montar();
      await clic(botonPorTexto('Nuevo salón'));
    });

    it('nombre obligatorio y números válidos: avisa y no llama a la API', async () => {
      await clic(botonActivo('Crear salón'));
      expect(textoPantalla()).toContain('Campo obligatorio');

      await escribir('Nombre del salón', 'Salón Nuevo');
      await escribir('Capacidad máxima', '0');
      await escribir('Limpieza entre eventos', '-5');
      await clic(botonActivo('Crear salón'));
      expect(textoPantalla()).toContain('Un número entero entre 1 y 5000');
      expect(textoPantalla()).toContain('Un número entero de minutos entre 0 y 1440');
      expect(api.crearSalon).not.toHaveBeenCalled();
    });

    it('éxito: envía datos limpios con números reales y ofrece los combos por defecto', async () => {
      vi.mocked(api.crearSalon).mockResolvedValue(salon({ id: 9, nombre: 'Salón Nuevo' }));
      await escribir('Nombre del salón', '  Salón Nuevo  ');
      await escribir('Descripción', ' Con pileta ');
      await escribir('Capacidad máxima', '120');
      await escribir('Limpieza entre eventos', '45');

      await clic(botonActivo('Crear salón'));

      expect(api.crearSalon).toHaveBeenCalledWith({
        nombre: 'Salón Nuevo', descripcion: 'Con pileta', capacidad: 120, minutosLimpieza: 45, ofrecerCombos: true,
      });
      expect(genericosStore().textoSnack).toContain('Salón «Salón Nuevo» creado');
      expect(api.listarSalones).toHaveBeenCalledTimes(2); // carga inicial + recarga
    });

    it('sin capacidad ni descripción no las envía; y se puede decidir no ofrecer los combos', async () => {
      vi.mocked(api.crearSalon).mockResolvedValue(salon());
      await escribir('Nombre del salón', 'Mínimo');
      await clic(document.querySelector('.v-overlay--active input[type="checkbox"]'));
      await clic(botonActivo('Crear salón'));

      expect(api.crearSalon).toHaveBeenCalledWith({ nombre: 'Mínimo', minutosLimpieza: 0, ofrecerCombos: false });
    });

    it('si la API rechaza, muestra el motivo y conserva lo escrito', async () => {
      vi.mocked(api.crearSalon).mockRejectedValue(new ApiError(400, 'capacidad no puede ser mayor que 5000'));
      await escribir('Nombre del salón', 'Salón X');
      await clic(botonActivo('Crear salón'));
      expect(textoPantalla()).toContain('capacidad no puede ser mayor que 5000');
      expect(campo('Nombre del salón').element.value).toBe('Salón X');
    });
  });

  describe('edición', () => {
    it('carga los datos actuales, no ofrece «combos», y guarda los cambios', async () => {
      await montar();
      vi.mocked(api.actualizarSalon).mockResolvedValue(salon({ nombre: 'Arcoíris Grande' }));
      await clic(botonAria('Editar Salón Arcoíris'));

      expect(campo('Nombre del salón').element.value).toBe('Salón Arcoíris');
      expect(campo('Capacidad máxima').element.value).toBe('80');
      expect(campo('Limpieza entre eventos').element.value).toBe('30');
      expect(textoPantalla()).not.toContain('Ofrecer en este salón');

      await escribir('Nombre del salón', 'Arcoíris Grande');
      await clic(botonActivo('Guardar cambios'));

      expect(api.actualizarSalon).toHaveBeenCalledWith(1, {
        nombre: 'Arcoíris Grande', descripcion: 'El más grande', capacidad: 80, minutosLimpieza: 30,
      });
      expect(vi.mocked(api.actualizarSalon).mock.calls[0][1]).not.toHaveProperty('ofrecerCombos');
      expect(genericosStore().textoSnack).toContain('Se guardaron los cambios');
    });
  });

  describe('salón principal y bajas', () => {
    it('marcar otro como principal', async () => {
      await montar();
      vi.mocked(api.actualizarSalon).mockResolvedValue(salon({ id: 2, esDefault: true }));
      await clic(botonAria('Marcar Salón Luna como principal'));
      expect(api.actualizarSalon).toHaveBeenCalledWith(2, { esDefault: true });
      expect(genericosStore().textoSnack).toContain('es ahora el salón principal');
      expect(botonAria('Marcar Salón Arcoíris como principal')).toBeNull(); // el principal no tiene ese botón
    });

    it('el principal NO se puede dar de baja mientras haya otros salones activos', async () => {
      await montar();
      expect(botonAria('Dar de baja Salón Arcoíris')!.disabled).toBe(true);
      expect(botonAria('Dar de baja Salón Luna')!.disabled).toBe(false);
    });

    it('si es el único activo, sí se puede dar de baja', async () => {
      await montar([PRINCIPAL, salon({ id: 2, nombre: 'Salón Viejo', esDefault: false, inhabilitado: true })]);
      expect(botonAria('Dar de baja Salón Arcoíris')!.disabled).toBe(false);
    });

    it('dar de baja pide confirmación, avisa del efecto, ejecuta y recarga', async () => {
      await montar();
      vi.mocked(api.actualizarSalon).mockResolvedValue(salon({ id: 2, inhabilitado: true }));
      await clic(botonAria('Dar de baja Salón Luna'));
      expect(textoPantalla()).toContain('dejará de aparecer para reservas nuevas');
      expect(api.actualizarSalon).not.toHaveBeenCalled();

      await clic(botonActivo('Dar de baja'));
      expect(api.actualizarSalon).toHaveBeenCalledWith(2, { inhabilitado: true });
      expect(genericosStore().textoSnack).toContain('fue dado de baja');
      expect(api.listarSalones).toHaveBeenCalledTimes(2);
    });

    it('cancelar no cambia nada', async () => {
      await montar();
      await clic(botonAria('Dar de baja Salón Luna'));
      await clic(botonActivo('Cancelar'));
      expect(api.actualizarSalon).not.toHaveBeenCalled();
    });

    it('reactivar un salón de baja', async () => {
      await montar([PRINCIPAL, salon({ id: 3, nombre: 'Salón Viejo', esDefault: false, inhabilitado: true })]);
      vi.mocked(api.actualizarSalon).mockResolvedValue(salon({ id: 3 }));
      await clic(botonAria('Reactivar Salón Viejo'));
      await clic(botonActivo('Reactivar'));
      expect(api.actualizarSalon).toHaveBeenCalledWith(3, { inhabilitado: false });
      expect(genericosStore().textoSnack).toContain('fue reactivado');
    });

    it('si la API rechaza la baja, se avisa con un error', async () => {
      await montar();
      vi.mocked(api.actualizarSalon).mockRejectedValue(new ApiError(400, 'Marque otro salón como principal antes de inhabilitar éste'));
      await clic(botonAria('Dar de baja Salón Luna'));
      await clic(botonActivo('Dar de baja'));
      expect(genericosStore().colorSnack).toBe('error');
      expect(genericosStore().textoSnack).toContain('Marque otro salón como principal');
    });
  });
});
