import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/equipo';
import { ApiError } from '@/api/http';
import type { Perfil, UsuarioEquipo } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import EquipoView from '../EquipoView.vue';

vi.mock('@/api/equipo');

const persona = (extra: Partial<UsuarioEquipo> = {}): UsuarioEquipo => ({
  id: 1, nombre: 'María Pérez', username: 'maria', email: 'maria@salon.com', rol: 'propietario',
  inhabilitado: false, debeCambiarPassword: false, creadoEn: '2026-10-25T00:00:00Z',
  ...extra,
});
const YO = persona(); // quien usa el panel
const EMPLEADO = persona({ id: 2, nombre: 'Juan Gómez', username: 'juan', email: 'juan@salon.com', rol: 'empleado' });

let wrapper: VueWrapper;

async function montar(equipo: UsuarioEquipo[] = [YO, EMPLEADO]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: YO.id, nombre: YO.nombre, username: YO.username, email: YO.email, rol: 'propietario',
    debeCambiarPassword: false, empresa: { id: 1, slug: 'demo', nombre: 'Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(api.listarEquipo).mockResolvedValue(equipo);
  wrapper = mount(EquipoView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
  await flushPromises();
}

// ---- ayudas (los diálogos de Vuetify se montan en <body>) ----
const botonAria = (etiqueta: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${etiqueta}"]`);
const botonActivo = (texto: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.v-overlay--active button')].find((b) => b.textContent?.includes(texto));
const clic = async (el: Element | null | undefined) => {
  expect(el, 'no se encontró el elemento').toBeTruthy();
  (el as HTMLElement).click();
  await flushPromises();
};
const campo = (etiqueta: string): DOMWrapper<HTMLInputElement> => {
  const etiquetas = [...document.querySelectorAll('label[for]')];
  const label = etiquetas.find((l) => l.textContent?.trim().startsWith(etiqueta));
  if (!label) throw new Error(`No hay un campo «${etiqueta}». Etiquetas: ${etiquetas.map((l) => l.textContent?.trim()).join(' | ')}`);
  return new DOMWrapper(document.getElementById(label.getAttribute('for')!) as HTMLInputElement);
};
const escribir = async (etiqueta: string, valor: string) => {
  await campo(etiqueta).setValue(valor);
  await flushPromises();
};
const textoPantalla = () => document.body.textContent ?? '';
const radio = (valor: string) => document.querySelector<HTMLInputElement>(`.v-overlay--active input[type="radio"][value="${valor}"]`);

describe('EquipoView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('listado', () => {
    it('muestra a cada persona con su rol y estado, y marca cuál sos vos', async () => {
      await montar([YO, EMPLEADO, persona({ id: 3, nombre: 'Ana Nueva', username: 'ana', email: 'ana@salon.com', rol: 'empleado', debeCambiarPassword: true }),
        persona({ id: 4, nombre: 'Baja Total', username: 'baja', email: 'baja@salon.com', inhabilitado: true })]);
      const texto = wrapper.text();
      expect(texto).toContain('María Pérez');
      expect(texto).toContain('Vos');
      expect(texto).toContain('maria@salon.com · @maria');
      expect(texto).toContain('Dueño');
      expect(texto).toContain('Empleado');
      expect(texto).toContain('Activo');
      expect(texto).toContain('Aún no ingresó'); // clave temporal sin cambiar
      expect(texto).toContain('De baja');
    });

    it('«Mostrar dados de baja» vuelve a pedir el listado con ese filtro', async () => {
      await montar();
      expect(api.listarEquipo).toHaveBeenLastCalledWith(false);
      await clic(wrapper.find('input[type="checkbox"]').element);
      expect(api.listarEquipo).toHaveBeenLastCalledWith(true);
    });

    it('si falla la carga muestra el error y permite reintentar', async () => {
      vi.mocked(api.listarEquipo).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      const pinia = createPinia();
      setActivePinia(pinia);
      wrapper = mount(EquipoView, { global: { plugins: [vuetify, pinia] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');

      vi.mocked(api.listarEquipo).mockResolvedValueOnce([EMPLEADO]);
      await clic([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar')));
      expect(wrapper.text()).toContain('Juan Gómez');
    });
  });

  describe('protecciones sobre uno mismo (la API también las exige)', () => {
    it('no podés darte de baja ni resetearte la clave', async () => {
      await montar();
      expect(botonAria('Dar de baja a María Pérez')!.disabled).toBe(true);
      expect(botonAria('Resetear la clave de María Pérez')!.disabled).toBe(true);
      expect(botonAria('Dar de baja a Juan Gómez')!.disabled).toBe(false);
      expect(botonAria('Resetear la clave de Juan Gómez')!.disabled).toBe(false);
    });

    it('a una persona de baja no se le resetea la clave', async () => {
      await montar([YO, persona({ id: 4, nombre: 'Baja Total', inhabilitado: true })]);
      expect(botonAria('Resetear la clave de Baja Total')!.disabled).toBe(true);
      expect(botonAria('Reactivar a Baja Total')).toBeTruthy();
    });
  });

  describe('alta', () => {
    beforeEach(async () => {
      await montar();
      await clic([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Nueva persona')));
    });

    it('sugiere el usuario a partir del email, hasta que lo edites', async () => {
      await escribir('Email', 'Ana.Gomez@correo.com');
      expect(campo('Nombre de usuario').element.value).toBe('ana.gomez');
      await escribir('Nombre de usuario', 'ana');
      await escribir('Email', 'otro@correo.com');
      expect(campo('Nombre de usuario').element.value).toBe('ana');
    });

    it('por defecto el rol es Empleado (el de menos permisos)', async () => {
      expect(radio('empleado')!.checked).toBe(true);
      expect(radio('propietario')!.checked).toBe(false);
    });

    it('vacío o con datos inválidos: avisa y no llama a la API', async () => {
      await clic(botonActivo('Crear'));
      expect(textoPantalla()).toContain('Campo obligatorio');

      await escribir('Nombre y apellido', 'Pedro');
      await escribir('Email', 'no-es-email');
      await escribir('Nombre de usuario', 'Mal Usuario');
      await clic(botonActivo('Crear'));
      expect(textoPantalla()).toContain('Ingresá un email válido');
      expect(textoPantalla()).toContain('Solo minúsculas, números, punto, guion y guion bajo');
      expect(api.crearUsuario).not.toHaveBeenCalled();
    });

    it('éxito: envía datos limpios, muestra la clave temporal una vez, avisa y recarga', async () => {
      vi.mocked(api.crearUsuario).mockResolvedValue({ usuario: persona({ id: 9, nombre: 'Pedro Díaz', email: 'pedro@salon.com', rol: 'propietario' }), passwordTemporal: 'Zx4cVb8nMq2wEr' });
      await escribir('Nombre y apellido', '  Pedro Díaz  ');
      await escribir('Email', ' pedro@salon.com ');
      await clic(radio('propietario'));

      await clic(botonActivo('Crear'));

      expect(api.crearUsuario).toHaveBeenCalledWith({ nombre: 'Pedro Díaz', email: 'pedro@salon.com', username: 'pedro', rol: 'propietario' });
      expect((document.querySelector('[data-testid="clave-temporal"] input') as HTMLInputElement).value).toBe('Zx4cVb8nMq2wEr');
      expect(textoPantalla()).toContain('Pedro Díaz (pedro@salon.com)');
      expect(genericosStore().textoSnack).toContain('Pedro Díaz');
      expect(api.listarEquipo).toHaveBeenCalledTimes(2);
    });

    it('si la API rechaza (email repetido) muestra el motivo y conserva lo escrito', async () => {
      vi.mocked(api.crearUsuario).mockRejectedValue(new ApiError(409, 'Ya existe un usuario con ese email o nombre de usuario'));
      await escribir('Nombre y apellido', 'Pedro');
      await escribir('Email', 'juan@salon.com');
      await clic(botonActivo('Crear'));

      expect(textoPantalla()).toContain('Ya existe un usuario con ese email');
      expect(campo('Email').element.value).toBe('juan@salon.com');
      expect(document.querySelector('[data-testid="clave-temporal"]')).toBeNull();
    });
  });

  describe('edición', () => {
    it('cambia nombre y rol enviando solo lo que cambió, sin pedir email ni usuario', async () => {
      await montar();
      vi.mocked(api.actualizarUsuario).mockResolvedValue({ ...EMPLEADO, nombre: 'Juan Carlos Gómez', rol: 'propietario' });
      await clic(botonAria('Editar a Juan Gómez'));

      expect(textoPantalla()).toContain('juan@salon.com · @juan');
      expect(() => campo('Email')).toThrow(); // el email no se edita
      await escribir('Nombre y apellido', 'Juan Carlos Gómez');
      await clic(radio('propietario'));
      await clic(botonActivo('Guardar cambios'));

      expect(api.actualizarUsuario).toHaveBeenCalledWith(2, { nombre: 'Juan Carlos Gómez', rol: 'propietario' });
      expect(genericosStore().textoSnack).toContain('Juan Carlos Gómez');
    });

    it('si no cambió nada, cierra sin llamar a la API', async () => {
      await montar();
      await clic(botonAria('Editar a Juan Gómez'));
      await clic(botonActivo('Guardar cambios'));
      expect(api.actualizarUsuario).not.toHaveBeenCalled();
    });

    it('al editarte a vos mismo el rol está bloqueado, pero el nombre se puede cambiar', async () => {
      await montar();
      vi.mocked(api.actualizarUsuario).mockResolvedValue({ ...YO, nombre: 'María P.' });
      await clic(botonAria('Editar a María Pérez'));

      expect(radio('empleado')!.disabled).toBe(true);
      expect(radio('propietario')!.disabled).toBe(true);
      expect(textoPantalla()).toContain('No podés cambiar tu propio rol');
      await escribir('Nombre y apellido', 'María P.');
      await clic(botonActivo('Guardar cambios'));
      expect(api.actualizarUsuario).toHaveBeenCalledWith(1, { nombre: 'María P.' });
    });

    it('un error de la API (p. ej. «debe conservar al menos un dueño») se muestra en el diálogo', async () => {
      await montar();
      vi.mocked(api.actualizarUsuario).mockRejectedValue(new ApiError(400, 'La empresa debe conservar al menos un dueño activo'));
      await clic(botonAria('Editar a Juan Gómez'));
      await escribir('Nombre y apellido', 'Otro nombre');
      await clic(botonActivo('Guardar cambios'));
      expect(textoPantalla()).toContain('La empresa debe conservar al menos un dueño activo');
    });
  });

  describe('baja y reactivación', () => {
    it('dar de baja pide confirmación, avisa del efecto, ejecuta y recarga', async () => {
      await montar();
      vi.mocked(api.actualizarUsuario).mockResolvedValue({ ...EMPLEADO, inhabilitado: true });
      await clic(botonAria('Dar de baja a Juan Gómez'));

      expect(textoPantalla()).toContain('perderá el acceso al instante');
      expect(api.actualizarUsuario).not.toHaveBeenCalled();
      await clic(botonActivo('Dar de baja'));

      expect(api.actualizarUsuario).toHaveBeenCalledWith(2, { inhabilitado: true });
      expect(api.listarEquipo).toHaveBeenCalledTimes(2);
      expect(genericosStore().textoSnack).toContain('fue dado de baja');
    });

    it('cancelar no cambia nada', async () => {
      await montar();
      await clic(botonAria('Dar de baja a Juan Gómez'));
      await clic(botonActivo('Cancelar'));
      expect(api.actualizarUsuario).not.toHaveBeenCalled();
    });

    it('reactivar a alguien de baja', async () => {
      await montar([YO, persona({ id: 4, nombre: 'Baja Total', inhabilitado: true })]);
      vi.mocked(api.actualizarUsuario).mockResolvedValue(persona({ id: 4 }));
      await clic(botonAria('Reactivar a Baja Total'));
      await clic(botonActivo('Reactivar'));
      expect(api.actualizarUsuario).toHaveBeenCalledWith(4, { inhabilitado: false });
      expect(genericosStore().textoSnack).toContain('fue reactivado');
    });

    it('si falla, avisa con un error', async () => {
      await montar();
      vi.mocked(api.actualizarUsuario).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Dar de baja a Juan Gómez'));
      await clic(botonActivo('Dar de baja'));
      expect(genericosStore().colorSnack).toBe('error');
    });
  });

  describe('resetear clave', () => {
    it('confirma, genera la clave temporal, la muestra y recarga el listado', async () => {
      await montar();
      vi.mocked(api.resetearPasswordUsuario).mockResolvedValue({ passwordTemporal: 'NuevaTemp12345' });
      await clic(botonAria('Resetear la clave de Juan Gómez'));
      expect(textoPantalla()).toContain('La actual dejará de funcionar');

      await clic(botonActivo('Generar clave temporal'));

      expect(api.resetearPasswordUsuario).toHaveBeenCalledWith(2);
      expect((document.querySelector('[data-testid="clave-temporal"] input') as HTMLInputElement).value).toBe('NuevaTemp12345');
      expect(textoPantalla()).toContain('Juan Gómez (juan@salon.com)');
      expect(api.listarEquipo).toHaveBeenCalledTimes(2);
    });

    it('si falla no abre el diálogo de la clave y avisa', async () => {
      await montar();
      vi.mocked(api.resetearPasswordUsuario).mockRejectedValue(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      await clic(botonAria('Resetear la clave de Juan Gómez'));
      await clic(botonActivo('Generar clave temporal'));
      expect(document.querySelector('[data-testid="clave-temporal"]')).toBeNull();
      expect(genericosStore().colorSnack).toBe('error');
    });
  });
});
