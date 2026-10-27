import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as apiLanding from '@/api/landing';
import * as apiMarca from '@/api/marca';
import type { LandingConfig, MarcaEmpresa, Perfil, RolCodigo } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonAria, botonPorTexto, campo, clic, escribir, routerDePrueba } from '@/test/ayudas';
import MiPaginaView from '../MiPaginaView.vue';

vi.mock('@/api/landing');
vi.mock('@/api/marca');

const LANDING: LandingConfig = {
  encabezado: 'foto',
  secciones: [
    { tipo: 'salones', visible: true }, { tipo: 'galeria', visible: false }, { tipo: 'nosotros', visible: true },
    { tipo: 'preguntas', visible: false }, { tipo: 'ubicacion', visible: false }, { tipo: 'contacto', visible: true },
  ],
  preguntas: [],
  mostrarMapa: false,
};
const landing = (extra: Partial<LandingConfig> = {}): LandingConfig => ({ ...LANDING, ...extra });
const conSecciones = (visibles: string[], orden?: string[]): LandingConfig['secciones'] =>
  (orden ?? LANDING.secciones.map((s) => s.tipo)).map((tipo) => ({ tipo: tipo as LandingConfig['secciones'][number]['tipo'], visible: visibles.includes(tipo) }));

const MARCA = {
  slug: 'los-pinos', nombre: 'Los Pinos', sobreNosotros: 'Hace 10 años', direccion: 'Calle 1 123', telefono: '11 5555', email: 'hola@pinos.com', redes: null,
} as MarcaEmpresa;
const marca = (extra: Partial<MarcaEmpresa> = {}): MarcaEmpresa => ({ ...MARCA, ...extra });

let wrapper: VueWrapper;

async function montar(datos: LandingConfig = LANDING, rol: RolCodigo = 'propietario', datosMarca: MarcaEmpresa | Error = MARCA) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'los-pinos', nombre: 'Los Pinos', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  useSesionStore().usuario = perfil;
  vi.mocked(apiLanding.obtenerLanding).mockResolvedValue(datos);
  if (datosMarca instanceof Error) vi.mocked(apiMarca.obtenerMarca).mockRejectedValue(datosMarca);
  else vi.mocked(apiMarca.obtenerMarca).mockResolvedValue(datosMarca);
  wrapper = mount(MiPaginaView, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

const guardar = () => clic(botonPorTexto('Guardar cambios'));
const enviado = () => vi.mocked(apiLanding.actualizarLanding).mock.calls[0]?.[0];
const interruptor = (titulo: string) => document.querySelector<HTMLInputElement>(`input[aria-label="Mostrar ${titulo}"]`)!;
const orden = () => [...document.querySelectorAll('[data-testid^="seccion-"]')].map((el) => el.getAttribute('data-testid')!.replace('seccion-', ''));
const radio = (valor: string) => document.querySelector<HTMLInputElement>(`input[type="radio"][value="${valor}"]`)!;

describe('MiPaginaView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('carga', () => {
    it('muestra las seis secciones en el orden guardado, con su estado', async () => {
      await montar();
      expect(orden()).toEqual(['salones', 'galeria', 'nosotros', 'preguntas', 'ubicacion', 'contacto']);
      expect(interruptor('Galería de fotos').checked).toBe(false);
      expect(interruptor('Sobre nosotros').checked).toBe(true);
      expect(radio('foto').checked).toBe(true);
    });

    it('la sección «Salones» no se puede apagar', async () => {
      await montar();
      expect(interruptor('Salones').disabled).toBe(true);
      expect(interruptor('Salones').checked).toBe(true);
    });

    it('si falla la carga muestra el motivo y permite reintentar', async () => {
      vi.mocked(apiLanding.obtenerLanding).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      vi.mocked(apiMarca.obtenerMarca).mockResolvedValue(MARCA);
      wrapper = mount(MiPaginaView, { global: { plugins: [vuetify, createPinia(), await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');
      vi.mocked(apiLanding.obtenerLanding).mockResolvedValueOnce(LANDING);
      await clic(botonPorTexto('Reintentar'));
      expect(orden()).toHaveLength(6);
    });

    it('enlaza a la página pública de la empresa', async () => {
      await montar();
      expect(wrapper.find('a[href$="/los-pinos"]').exists()).toBe(true);
    });
  });

  describe('guardar', () => {
    it('sin cambios no se puede guardar; al editar aparece el aviso', async () => {
      await montar();
      expect((botonPorTexto('Guardar cambios') as HTMLButtonElement).disabled).toBe(true);
      expect(wrapper.find('[data-testid="sin-guardar"]').exists()).toBe(false);
      await clic(interruptor('Galería de fotos'));
      expect((botonPorTexto('Guardar cambios') as HTMLButtonElement).disabled).toBe(false);
      expect(wrapper.find('[data-testid="sin-guardar"]').exists()).toBe(true);
    });

    it('prender una sección envía la lista completa de secciones y nada más', async () => {
      await montar();
      vi.mocked(apiLanding.actualizarLanding).mockResolvedValue(landing({ secciones: conSecciones(['salones', 'galeria', 'nosotros', 'contacto']) }));
      await clic(interruptor('Galería de fotos'));
      await guardar();
      expect(enviado()).toEqual({ secciones: conSecciones(['salones', 'galeria', 'nosotros', 'contacto']) });
      expect(genericosStore().textoSnack).toContain('Se guardaron los cambios de tu página');
    });

    it('el encabezado y el mapa viajan solos si son lo único que cambió', async () => {
      await montar();
      vi.mocked(apiLanding.actualizarLanding).mockResolvedValue(landing({ encabezado: 'color', mostrarMapa: true }));
      await clic(radio('color'));
      await clic(document.querySelector<HTMLInputElement>('input[type="checkbox"][aria-label="Mostrar el mapa"], .v-switch input[type="checkbox"]:not([aria-label])'));
      await guardar();
      expect(enviado()).toEqual({ encabezado: 'color', mostrarMapa: true });
    });

    it('después de guardar, la pantalla queda con lo que devolvió la API (ya sin cambios pendientes)', async () => {
      await montar();
      vi.mocked(apiLanding.actualizarLanding).mockResolvedValue(landing({ encabezado: 'color' }));
      await clic(radio('color'));
      await guardar();
      expect(radio('color').checked).toBe(true);
      expect((botonPorTexto('Guardar cambios') as HTMLButtonElement).disabled).toBe(true);
    });

    it('un error de la API se muestra y no se pierde lo editado', async () => {
      await montar();
      vi.mocked(apiLanding.actualizarLanding).mockRejectedValue(new ApiError(400, 'Hay secciones repetidas.'));
      await clic(radio('color'));
      await guardar();
      expect(wrapper.text()).toContain('Hay secciones repetidas.');
      expect(radio('color').checked).toBe(true);
    });

    it('descartar vuelve a lo guardado', async () => {
      await montar();
      await clic(radio('color'));
      await clic(interruptor('Galería de fotos'));
      await clic(botonPorTexto('Descartar'));
      expect(radio('foto').checked).toBe(true);
      expect(interruptor('Galería de fotos').checked).toBe(false);
      expect(apiLanding.actualizarLanding).not.toHaveBeenCalled();
    });
  });

  describe('orden de las secciones', () => {
    it('las flechas suben y bajan, y el nuevo orden se envía', async () => {
      await montar();
      vi.mocked(apiLanding.actualizarLanding).mockResolvedValue(LANDING);
      await clic(botonAria('Subir Contacto'));
      await clic(botonAria('Bajar Salones'));
      expect(orden()).toEqual(['galeria', 'salones', 'nosotros', 'preguntas', 'contacto', 'ubicacion']);
      await guardar();
      expect(enviado()!.secciones!.map((s) => s.tipo)).toEqual(['galeria', 'salones', 'nosotros', 'preguntas', 'contacto', 'ubicacion']);
    });

    it('la primera no sube y la última no baja', async () => {
      await montar();
      expect(botonAria('Subir Salones')!.disabled).toBe(true);
      expect(botonAria('Bajar Contacto')!.disabled).toBe(true);
      expect(botonAria('Subir Contacto')!.disabled).toBe(false);
    });

    it('volver al orden original deja de contar como cambio', async () => {
      await montar();
      await clic(botonAria('Bajar Salones'));
      await clic(botonAria('Subir Salones'));
      expect(wrapper.find('[data-testid="sin-guardar"]').exists()).toBe(false);
    });
  });

  describe('preguntas frecuentes', () => {
    it('agregar, escribir y guardar: se envían recortadas', async () => {
      await montar();
      vi.mocked(apiLanding.actualizarLanding).mockResolvedValue(landing({ preguntas: [{ pregunta: '¿Hay estacionamiento?', respuesta: 'Sí' }] }));
      expect(wrapper.find('[data-testid="sin-preguntas"]').exists()).toBe(true);
      await clic(botonPorTexto('Agregar una pregunta'));
      await escribir('Pregunta 1', '  ¿Hay estacionamiento?  ');
      await escribir('Respuesta 1', ' Sí ');
      await guardar();
      expect(enviado()).toEqual({ preguntas: [{ pregunta: '¿Hay estacionamiento?', respuesta: 'Sí' }] });
    });

    it('una pregunta a medio completar no se envía', async () => {
      await montar();
      await clic(botonPorTexto('Agregar una pregunta'));
      await escribir('Pregunta 1', '¿Hay estacionamiento?');
      await guardar();
      expect(wrapper.text()).toContain('Campo obligatorio');
      await escribir('Pregunta 1', 'ab');
      await escribir('Respuesta 1', 'Sí');
      await guardar();
      expect(document.body.textContent).toContain('al menos 3 caracteres');
      expect(apiLanding.actualizarLanding).not.toHaveBeenCalled();
    });

    it('se pueden quitar y reordenar', async () => {
      await montar(landing({ preguntas: [{ pregunta: 'Uno?', respuesta: 'a' }, { pregunta: 'Dos?', respuesta: 'b' }, { pregunta: 'Tres?', respuesta: 'c' }] }));
      vi.mocked(apiLanding.actualizarLanding).mockResolvedValue(LANDING);
      await clic(botonAria('Subir la pregunta 3'));
      await clic(botonAria('Quitar la pregunta 1'));
      await guardar();
      expect(enviado()).toEqual({ preguntas: [{ pregunta: 'Tres?', respuesta: 'c' }, { pregunta: 'Dos?', respuesta: 'b' }] });
    });

    it('quitar todas envía una lista vacía', async () => {
      await montar(landing({ preguntas: [{ pregunta: 'Uno?', respuesta: 'a' }] }));
      vi.mocked(apiLanding.actualizarLanding).mockResolvedValue(LANDING);
      await clic(botonAria('Quitar la pregunta 1'));
      await guardar();
      expect(enviado()).toEqual({ preguntas: [] });
    });

    it('el máximo es 10: después no deja agregar', async () => {
      const diez = Array.from({ length: 10 }, (_, i) => ({ pregunta: `Pregunta ${i}?`, respuesta: 'r' }));
      await montar(landing({ preguntas: diez }));
      expect((botonPorTexto('Agregar una pregunta') as HTMLButtonElement).disabled).toBe(true);
      expect(wrapper.text()).toContain('Llegaste al máximo');
      await clic(botonAria('Quitar la pregunta 10'));
      expect((botonPorTexto('Agregar una pregunta') as HTMLButtonElement).disabled).toBe(false);
    });

    it('lo que se escribe se muestra como texto, nunca como HTML', async () => {
      await montar(landing({ preguntas: [{ pregunta: '<b>negrita</b>?', respuesta: '<img src=x>' }] }));
      expect(campo('Pregunta 1').element.value).toBe('<b>negrita</b>?');
      expect(document.querySelector('img[src="x"]')).toBeNull();
    });
  });

  describe('avisos de secciones vacías', () => {
    const vacia = (tipo: string) => wrapper.find(`[data-testid="vacia-${tipo}"]`).exists();

    it('«Sobre nosotros» prendida pero sin texto en Marca avisa que no se va a mostrar', async () => {
      await montar(LANDING, 'propietario', marca({ sobreNosotros: null }));
      expect(vacia('nosotros')).toBe(true);
    });

    it('con el contenido cargado no avisa', async () => {
      await montar();
      expect(vacia('nosotros')).toBe(false);
      expect(vacia('contacto')).toBe(false);
    });

    it('una sección apagada no avisa, aunque esté vacía', async () => {
      await montar(landing({ secciones: conSecciones(['salones', 'contacto']) }), 'propietario', marca({ sobreNosotros: null }));
      expect(vacia('nosotros')).toBe(false);
    });

    it('«Contacto» sin teléfono, email ni redes avisa; con una sola red ya no', async () => {
      await montar(LANDING, 'propietario', marca({ telefono: null, email: null, redes: null }));
      expect(vacia('contacto')).toBe(true);
      wrapper.unmount();
      document.body.innerHTML = '';
      await montar(LANDING, 'propietario', marca({ telefono: null, email: null, redes: { instagram: 'https://instagram.com/x' } }));
      expect(vacia('contacto')).toBe(false);
    });

    it('«Preguntas» prendida y sin preguntas avisa; al escribir una, deja de avisar', async () => {
      await montar(landing({ secciones: conSecciones(['salones', 'preguntas']) }));
      expect(vacia('preguntas')).toBe(true);
      await clic(botonPorTexto('Agregar una pregunta'));
      await escribir('Pregunta 1', '¿Hay estacionamiento?');
      await escribir('Respuesta 1', 'Sí');
      expect(vacia('preguntas')).toBe(false);
    });

    it('sin dirección en Marca explica cómo arreglarlo, y avisa en la sección Ubicación si está prendida', async () => {
      await montar(landing({ secciones: conSecciones(['salones', 'ubicacion']) }), 'propietario', marca({ direccion: '   ' }));
      expect(wrapper.find('[data-testid="sin-direccion"]').text()).toContain('cargala en Marca');
      expect(vacia('ubicacion')).toBe(true);
    });

    it('con dirección no muestra ese aviso', async () => {
      await montar();
      expect(wrapper.find('[data-testid="sin-direccion"]').exists()).toBe(false);
    });

    it('si falla la carga de Marca, la pantalla funciona igual y no inventa avisos', async () => {
      await montar(landing({ secciones: conSecciones(['salones', 'nosotros', 'ubicacion', 'contacto']) }), 'propietario', new ApiError(500, 'Error del servidor'));
      expect(orden()).toHaveLength(6);
      expect(vacia('nosotros')).toBe(false);
      expect(wrapper.find('[data-testid="sin-direccion"]').exists()).toBe(false);
    });
  });

  describe('permisos', () => {
    it('quien no es dueño ve todo pero no puede editar ni guardar', async () => {
      await montar(LANDING, 'empleado');
      expect(interruptor('Sobre nosotros').disabled).toBe(true);
      expect(radio('color').disabled).toBe(true);
      expect(botonPorTexto('Guardar cambios')).toBeUndefined();
      expect(botonPorTexto('Agregar una pregunta')).toBeUndefined();
      expect(botonAria('Subir Contacto')).toBeNull();
    });
  });
});
