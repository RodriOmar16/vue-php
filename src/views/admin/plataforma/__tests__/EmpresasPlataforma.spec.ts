import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as api from '@/api/plataforma';
import type { EmpresaPlataforma, RespuestaAltaEmpresa } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import EmpresasPlataforma from '../EmpresasPlataforma.vue';

vi.mock('@/api/plataforma');

const empresa = (extra: Partial<EmpresaPlataforma> = {}): EmpresaPlataforma => ({
  id: 1, slug: 'los-pinos', nombre: 'Salón Los Pinos', direccion: null, telefono: null, email: null,
  zonaHoraria: 'America/Argentina/Buenos_Aires', inhabilitado: false, creadoEn: '2026-10-25T00:00:00Z',
  _count: { usuarios: 2, salones: 1 },
  ...extra,
});

let wrapper: VueWrapper;

async function montar(empresas: EmpresaPlataforma[] = [empresa()]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  vi.mocked(api.listarEmpresas).mockResolvedValue(empresas);
  wrapper = mount(EmpresasPlataforma, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
  await flushPromises();
  return wrapper;
}

// ---- ayudas para interactuar con la pantalla y con los diálogos (que Vuetify monta en <body>) ----
const botones = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
const boton = (texto: string) => botones().find((b) => b.textContent?.includes(texto));
/** Botón dentro del diálogo abierto en este momento (los diálogos cerrados siguen en el DOM). */
const botonActivo = (texto: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.v-overlay--active button')].find((b) => b.textContent?.includes(texto));
const hayDialogoActivo = (selector = '') => document.querySelector(`.v-overlay--active ${selector}`.trim()) !== null;
const botonAria = (etiqueta: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${etiqueta}"]`);
const clic = async (el: Element | null | undefined) => {
  expect(el, 'no se encontró el botón').toBeTruthy();
  (el as HTMLElement).click();
  await flushPromises();
};
const campo = (etiqueta: string): DOMWrapper<HTMLInputElement> => {
  const etiquetas = [...document.querySelectorAll('label[for]')];
  const label = etiquetas.find((l) => l.textContent?.trim().startsWith(etiqueta));
  if (!label) {
    const existentes = etiquetas.map((l) => l.textContent?.trim()).join(' | ');
    throw new Error(`No hay un campo «${etiqueta}». Etiquetas presentes: ${existentes}`);
  }
  const input = document.getElementById(label.getAttribute('for')!) as HTMLInputElement | null;
  if (!input) throw new Error(`La etiqueta «${etiqueta}» apunta a un input que no existe (${label.getAttribute('for')})`);
  return new DOMWrapper(input);
};
const escribir = async (etiqueta: string, valor: string) => {
  await campo(etiqueta).setValue(valor);
  await flushPromises();
};
const textoPantalla = () => document.body.textContent ?? '';

async function llenarAlta(extra: Partial<Record<string, string>> = {}) {
  await escribir('Nombre', extra.nombre ?? 'Salón Arcoíris');
  await escribir('Nombre y apellido', extra.dueno ?? 'María Pérez');
  await escribir('Email', extra.email ?? 'maria@arcoiris.com');
}

const respuestaAlta: RespuestaAltaEmpresa = {
  empresa: { id: 9, slug: 'salon-arcoiris', nombre: 'Salón Arcoíris', direccion: null, telefono: null, email: null, zonaHoraria: 'America/Argentina/Buenos_Aires', inhabilitado: false, creadoEn: '' },
  salon: { id: 1, nombre: 'Salón principal', esDefault: true },
  dueno: { id: 5, nombre: 'María Pérez', email: 'maria@arcoiris.com', username: 'maria', rol: 'propietario', debeCambiarPassword: true },
  passwordTemporal: 'Ab3dEf7hJk9mNp',
};

describe('EmpresasPlataforma', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('listado', () => {
    it('muestra las empresas con su slug, estado y cantidades', async () => {
      await montar([
        empresa(),
        empresa({ id: 2, nombre: 'Casa Azul', slug: 'casa-azul', inhabilitado: true, _count: { usuarios: 5, salones: 3 } }),
      ]);
      const texto = wrapper.text();
      expect(texto).toContain('Salón Los Pinos');
      expect(texto).toContain('/los-pinos');
      expect(texto).toContain('Activa');
      expect(texto).toContain('Casa Azul');
      expect(texto).toContain('Suspendida');
    });

    it('sin empresas invita a crear la primera', async () => {
      await montar([]);
      expect(wrapper.text()).toContain('Todavía no hay empresas');
    });

    it('si falla la carga muestra el error y permite reintentar', async () => {
      vi.mocked(api.listarEmpresas).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      const pinia = createPinia();
      setActivePinia(pinia);
      wrapper = mount(EmpresasPlataforma, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');

      vi.mocked(api.listarEmpresas).mockResolvedValueOnce([empresa()]);
      await clic(boton('Reintentar'));
      expect(wrapper.text()).toContain('Salón Los Pinos');
      expect(wrapper.text()).not.toContain('No se pudo conectar');
    });
  });

  describe('alta de empresa', () => {
    beforeEach(async () => {
      await montar();
      await clic(boton('Nueva empresa'));
    });

    it('el slug y el usuario se sugieren solos mientras no los toques', async () => {
      await escribir('Nombre', 'Salón Los Álamos');
      expect(campo('Slug').element.value).toBe('salon-los-alamos');
      await escribir('Email', 'Ana.Gomez@correo.com');
      expect(campo('Nombre de usuario').element.value).toBe('ana.gomez');

      await escribir('Slug', 'mi-slug');
      await escribir('Nombre', 'Otro nombre distinto'); // ya no pisa el slug que escribiste
      expect(campo('Slug').element.value).toBe('mi-slug');
    });

    it('con el formulario vacío pide los datos y no llama a la API', async () => {
      await clic(botonActivo('Crear empresa'));
      expect(textoPantalla()).toContain('Campo obligatorio');
      expect(api.crearEmpresa).not.toHaveBeenCalled();
    });

    it('valida slug reservado, formato del slug, email y usuario', async () => {
      await llenarAlta();
      await escribir('Slug', 'admin');
      await clic(botonActivo('Crear empresa'));
      expect(textoPantalla()).toContain('Ese slug está reservado');

      await escribir('Slug', 'Con Espacios');
      await escribir('Email', 'no-es-email');
      await escribir('Nombre de usuario', 'Mal Usuario');
      await clic(botonActivo('Crear empresa'));
      expect(textoPantalla()).toContain('Solo minúsculas, números y guiones simples');
      expect(textoPantalla()).toContain('Ingresá un email válido');
      expect(textoPantalla()).toContain('Solo minúsculas, números, punto, guion y guion bajo');
      expect(api.crearEmpresa).not.toHaveBeenCalled();
    });

    it('éxito: envía los datos limpios, muestra la clave temporal UNA vez, avisa y recarga la lista', async () => {
      vi.mocked(api.crearEmpresa).mockResolvedValue(respuestaAlta);
      await llenarAlta({ nombre: '  Salón Arcoíris  ', email: ' maria@arcoiris.com ' });
      await escribir('Nombre del primer salón', '  Salón Uno ');

      await clic(botonActivo('Crear empresa'));

      expect(api.crearEmpresa).toHaveBeenCalledWith({
        nombre: 'Salón Arcoíris',
        slug: 'salon-arcoiris',
        zonaHoraria: 'America/Argentina/Buenos_Aires',
        nombreSalon: 'Salón Uno',
        dueno: { nombre: 'María Pérez', email: 'maria@arcoiris.com', username: 'maria' },
      });
      expect(api.listarEmpresas).toHaveBeenCalledTimes(2); // carga inicial + recarga
      expect(genericosStore().textoSnack).toContain('Salón Arcoíris');
      // el diálogo de la clave
      const claveVisible = (document.querySelector('[data-testid="clave-temporal"] input') as HTMLInputElement).value;
      expect(claveVisible).toBe('Ab3dEf7hJk9mNp');
      expect(textoPantalla()).toContain('María Pérez (maria@arcoiris.com)');
      expect(textoPantalla()).toContain('no se vuelve a mostrar');

      await clic(botonActivo('Ya la anoté'));
      expect(hayDialogoActivo('[data-testid="clave-temporal"]')).toBe(false);
    });

    it('no envía el nombre del salón si se deja vacío', async () => {
      vi.mocked(api.crearEmpresa).mockResolvedValue(respuestaAlta);
      await llenarAlta();
      await clic(botonActivo('Crear empresa'));
      expect(vi.mocked(api.crearEmpresa).mock.calls[0][0]).not.toHaveProperty('nombreSalon');
    });

    it('si la API rechaza (p. ej. slug repetido) muestra el motivo y deja el diálogo abierto con lo escrito', async () => {
      vi.mocked(api.crearEmpresa).mockRejectedValue(new ApiError(409, 'Ya existe una empresa con ese slug, o un usuario con ese email o nombre de usuario'));
      await llenarAlta();
      await clic(botonActivo('Crear empresa'));

      expect(textoPantalla()).toContain('Ya existe una empresa con ese slug');
      expect(campo('Nombre de usuario').element.value).toBe('maria'); // no se perdió lo escrito
      expect(document.querySelector('[data-testid="clave-temporal"]')).toBeNull();
    });

    it('cancelar cierra sin llamar a la API, y al reabrir el formulario está limpio', async () => {
      await escribir('Nombre', 'Algo escrito');
      await clic(botonActivo('Cancelar'));
      await vi.waitFor(() => expect(botonActivo('Crear empresa')).toBeUndefined());
      expect(api.crearEmpresa).not.toHaveBeenCalled();

      await clic(boton('Nueva empresa'));
      expect(campo('Nombre').element.value).toBe('');
    });
  });

  describe('suspender y reactivar', () => {
    it('suspender pide confirmación, avisa del efecto, ejecuta y recarga', async () => {
      await montar();
      vi.mocked(api.actualizarEmpresa).mockResolvedValue(empresa({ inhabilitado: true }));

      await clic(botonAria('Suspender Salón Los Pinos'));
      expect(textoPantalla()).toContain('pierden el acceso al instante');
      expect(api.actualizarEmpresa).not.toHaveBeenCalled(); // todavía no confirmó

      await clic(botonActivo('Suspender'));
      expect(api.actualizarEmpresa).toHaveBeenCalledWith(1, { inhabilitado: true });
      expect(api.listarEmpresas).toHaveBeenCalledTimes(2);
      expect(genericosStore().textoSnack).toContain('fue suspendida');
    });

    it('cancelar no cambia nada', async () => {
      await montar();
      await clic(botonAria('Suspender Salón Los Pinos'));
      await clic(botonActivo('Cancelar'));
      expect(api.actualizarEmpresa).not.toHaveBeenCalled();
    });

    it('una empresa suspendida se reactiva', async () => {
      await montar([empresa({ inhabilitado: true })]);
      vi.mocked(api.actualizarEmpresa).mockResolvedValue(empresa());
      await clic(botonAria('Reactivar Salón Los Pinos'));
      await clic(botonActivo('Reactivar'));
      expect(api.actualizarEmpresa).toHaveBeenCalledWith(1, { inhabilitado: false });
      expect(genericosStore().textoSnack).toContain('fue reactivada');
    });

    it('si falla, avisa con un error y no recarga', async () => {
      await montar();
      vi.mocked(api.actualizarEmpresa).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Suspender Salón Los Pinos'));
      await clic(botonActivo('Suspender'));
      expect(genericosStore().colorSnack).toBe('error');
      expect(genericosStore().textoSnack).toContain('No se encontró');
    });
  });

  describe('resetear la clave del dueño', () => {
    const confirmarReset = () =>
      clic(botonActivo('Generar clave temporal'));

    it('con un único dueño: confirma, genera la clave y la muestra', async () => {
      await montar();
      vi.mocked(api.resetearDueno).mockResolvedValue({ dueno: { id: 5, nombre: 'María Pérez', email: 'maria@x.com' }, passwordTemporal: 'ClaveNueva1234' });

      await clic(botonAria('Resetear la clave del dueño de Salón Los Pinos'));
      expect(textoPantalla()).toContain('La que usa hoy dejará de funcionar');
      await confirmarReset();

      expect(api.resetearDueno).toHaveBeenCalledWith(1, undefined);
      expect((document.querySelector('[data-testid="clave-temporal"] input') as HTMLInputElement).value).toBe('ClaveNueva1234');
      expect(textoPantalla()).toContain('María Pérez (maria@x.com)');
    });

    it('con varios dueños: pide elegir a cuál y recién entonces genera la clave', async () => {
      await montar();
      const duenos = [{ id: 5, nombre: 'María', email: 'maria@x.com' }, { id: 8, nombre: 'Pedro', email: 'pedro@x.com' }];
      vi.mocked(api.resetearDueno)
        .mockRejectedValueOnce(new ApiError(400, 'La empresa tiene varios dueños: indique cuál con usuarioId', undefined, { duenos }))
        .mockResolvedValueOnce({ dueno: duenos[1], passwordTemporal: 'ParaPedro12345' });

      await clic(botonAria('Resetear la clave del dueño de Salón Los Pinos'));
      await confirmarReset();

      expect(textoPantalla()).toContain('tiene varios dueños');
      expect(textoPantalla()).toContain('Pedro (pedro@x.com)');
      const generar = botonActivo('Generar clave temporal') as HTMLButtonElement;
      expect(generar.disabled).toBe(true); // hasta elegir uno

      await clic([...document.querySelectorAll('.v-overlay--active input[type="radio"]')][1]);
      await clic(botonActivo('Generar clave temporal'));

      expect(api.resetearDueno).toHaveBeenLastCalledWith(1, 8);
      expect((document.querySelector('[data-testid="clave-temporal"] input') as HTMLInputElement).value).toBe('ParaPedro12345');
    });

    it('otro error (sin dueño activo, sin conexión...) se avisa y no abre ningún diálogo de clave', async () => {
      await montar();
      vi.mocked(api.resetearDueno).mockRejectedValue(new ApiError(404, 'No se encontró un dueño activo para resetear'));
      await clic(botonAria('Resetear la clave del dueño de Salón Los Pinos'));
      await confirmarReset();

      expect(genericosStore().colorSnack).toBe('error');
      expect(genericosStore().textoSnack).toContain('No se encontró un dueño activo');
      expect(document.querySelector('[data-testid="clave-temporal"]')).toBeNull();
    });
  });
});
