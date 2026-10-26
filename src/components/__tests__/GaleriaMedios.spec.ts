import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/medios';
import { ApiError } from '@/api/http';
import type { Medio, TipoMedio } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { botonActivo, botonAria, campo, clic, escribir, textoPantalla } from '@/test/ayudas';
import GaleriaMedios from '../GaleriaMedios.vue';

// Se conservan las constantes reales (tope, tamaño, tipos) y se simulan solo las llamadas a la API
vi.mock('@/api/medios', async (original) => ({
  ...(await original<typeof import('@/api/medios')>()),
  listarMedios: vi.fn(),
  subirMedio: vi.fn(),
  actualizarMedio: vi.fn(),
  ordenarMedios: vi.fn(),
  eliminarMedio: vi.fn(),
}));

const foto = (id: number, extra: Partial<Medio> = {}): Medio => ({
  id, orden: id, esPortada: id === 1, alt: null, url: `https://assets.test/f${id}.webp`, mime: 'image/webp', bytes: 1000, ...extra,
});

let wrapper: VueWrapper;

async function montar(lista: Medio[] = [foto(1), foto(2), foto(3)], editable = true, tipo: TipoMedio = 'salones') {
  setActivePinia(createPinia());
  vi.mocked(api.listarMedios).mockResolvedValue(lista);
  wrapper = mount(GaleriaMedios, { props: { tipo, id: 7, editable }, global: { plugins: [vuetify] }, attachTo: document.body });
  await flushPromises();
}

async function elegirArchivos(archivos: File[]) {
  const input = wrapper.find<HTMLInputElement>('[data-testid="entrada-fotos"]').element;
  Object.defineProperty(input, 'files', { value: archivos, configurable: true });
  input.dispatchEvent(new Event('change'));
  await flushPromises();
}
const archivo = (nombre = 'foto.png', tipo = 'image/png', bytes = 1000) => {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
};
const ids = () => wrapper.findAll('[data-testid^="foto-"]').map((el) => Number(el.attributes('data-testid')!.slice(5)));

describe('GaleriaMedios', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('lectura', () => {
    it('carga las fotos de ese elemento y las muestra con su contador y la principal marcada', async () => {
      await montar([foto(1), foto(2, { alt: 'Vista del patio' })]);
      expect(api.listarMedios).toHaveBeenCalledWith('salones', 7);
      expect(ids()).toEqual([1, 2]);
      expect(wrapper.find('[data-testid="contador-fotos"]').text()).toBe('2 de 10');
      expect(wrapper.find('[data-testid="foto-1"]').text()).toContain('Principal');
      expect(wrapper.find('[data-testid="foto-2"]').text()).not.toContain('Principal');
      const imagenes = wrapper.findAll('img');
      expect(imagenes[0].attributes('src')).toBe('https://assets.test/f1.webp');
      expect(imagenes[0].attributes('alt')).toBe('Foto 1'); // sin descripción: texto genérico
      expect(imagenes[1].attributes('alt')).toBe('Vista del patio');
    });

    it('el tope depende del tipo: 10 salones, 5 combos e instalaciones', async () => {
      await montar([], true, 'combos');
      expect(wrapper.find('[data-testid="contador-fotos"]').text()).toBe('0 de 5');
    });

    it('sin fotos lo dice', async () => {
      await montar([]);
      expect(wrapper.find('[data-testid="sin-fotos"]').exists()).toBe(true);
    });

    it('de solo lectura (empleado) no ofrece ninguna acción', async () => {
      await montar([foto(1), foto(2)], false);
      expect(wrapper.text()).not.toContain('Agregar fotos');
      expect(wrapper.find('[data-testid="entrada-fotos"]').exists()).toBe(false);
      expect(botonAria('Borrar la foto 1')).toBeNull();
      expect(botonAria('Mover la foto 1 después')).toBeNull();
      expect(ids()).toEqual([1, 2]);
    });

    it('si falla la carga muestra el motivo', async () => {
      setActivePinia(createPinia());
      vi.mocked(api.listarMedios).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      wrapper = mount(GaleriaMedios, { props: { tipo: 'salones', id: 7, editable: true }, global: { plugins: [vuetify] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se encontró lo que busca.');
    });
  });

  describe('subida', () => {
    it('sube cada archivo elegido y lo agrega a la lista', async () => {
      await montar([foto(1)]);
      vi.mocked(api.subirMedio).mockResolvedValueOnce(foto(2)).mockResolvedValueOnce(foto(3));
      const a = archivo('a.png');
      const b = archivo('b.jpg', 'image/jpeg');
      await elegirArchivos([a, b]);
      expect(api.subirMedio).toHaveBeenNthCalledWith(1, 'salones', 7, a);
      expect(api.subirMedio).toHaveBeenNthCalledWith(2, 'salones', 7, b);
      expect(ids()).toEqual([1, 2, 3]);
      expect(wrapper.find('[data-testid="contador-fotos"]').text()).toBe('3 de 10');
    });

    it('rechaza sin molestar a la API lo que no es JPG/PNG/WebP o pesa más de 8 MB, y sube el resto', async () => {
      await montar([]);
      vi.mocked(api.subirMedio).mockResolvedValue(foto(1));
      await elegirArchivos([archivo('doc.pdf', 'application/pdf'), archivo('enorme.png', 'image/png', 9 * 1024 * 1024), archivo('ok.webp', 'image/webp')]);
      expect(api.subirMedio).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).toContain('«doc.pdf»: solo se aceptan JPG, PNG o WebP');
      expect(wrapper.text()).toContain('«enorme.png»: supera los 8 MB');
      expect(ids()).toEqual([1]);
    });

    it('un error de la API se informa con el nombre del archivo y no frena a los demás', async () => {
      await montar([]);
      vi.mocked(api.subirMedio)
        .mockRejectedValueOnce(new ApiError(400, 'El archivo no es una imagen válida. Se aceptan JPG, PNG o WebP'))
        .mockResolvedValueOnce(foto(1));
      await elegirArchivos([archivo('rota.png'), archivo('buena.png')]);
      expect(wrapper.text()).toContain('«rota.png»: El archivo no es una imagen válida');
      expect(ids()).toEqual([1]);
    });

    it('al llegar al tope bloquea el botón y no sube de más', async () => {
      await montar(Array.from({ length: 5 }, (_, i) => foto(i + 1)), true, 'combos');
      const boton = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Agregar fotos'))!;
      expect(boton.disabled).toBe(true);
      await elegirArchivos([archivo('extra.png')]); // por si lo fuerzan
      expect(api.subirMedio).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('Se alcanzó el máximo de 5 fotos');
    });

    it('en una subida múltiple respeta el tope sobre la marcha', async () => {
      await montar(Array.from({ length: 4 }, (_, i) => foto(i + 1)), true, 'instalaciones');
      vi.mocked(api.subirMedio).mockResolvedValue(foto(5));
      await elegirArchivos([archivo('a.png'), archivo('b.png')]);
      expect(api.subirMedio).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).toContain('no se subió «b.png»');
    });
  });

  describe('principal y orden', () => {
    it('hacer principal: avisa a la API y mueve la marca', async () => {
      await montar();
      vi.mocked(api.actualizarMedio).mockResolvedValue(foto(2));
      await clic(botonAria('Hacer principal la foto 2'));
      expect(api.actualizarMedio).toHaveBeenCalledWith(2, { esPortada: true });
      expect(wrapper.find('[data-testid="foto-2"]').text()).toContain('Principal');
      expect(wrapper.find('[data-testid="foto-1"]').text()).not.toContain('Principal');
      expect(botonAria('Hacer principal la foto 2')).toBeNull(); // la principal ya no ofrece la acción
    });

    it('mover: envía el orden completo y muestra lo que devuelve la API', async () => {
      await montar();
      vi.mocked(api.ordenarMedios).mockResolvedValue([foto(2), foto(1), foto(3)]);
      await clic(botonAria('Mover la foto 1 después'));
      expect(api.ordenarMedios).toHaveBeenCalledWith('salones', 7, [2, 1, 3]);
      expect(ids()).toEqual([2, 1, 3]);
    });

    it('la primera no se mueve hacia atrás ni la última hacia adelante', async () => {
      await montar();
      expect(botonAria('Mover la foto 1 antes')!.disabled).toBe(true);
      expect(botonAria('Mover la foto 3 después')!.disabled).toBe(true);
    });

    it('si una acción falla, avisa y vuelve a mostrar lo que realmente hay guardado', async () => {
      await montar();
      vi.mocked(api.ordenarMedios).mockRejectedValue(new ApiError(400, 'Tenés que indicar todas las fotos de este elemento, cada una una sola vez'));
      vi.mocked(api.listarMedios).mockResolvedValue([foto(1), foto(2)]); // alguien borró la 3 mientras tanto
      await clic(botonAria('Mover la foto 1 después'));
      expect(wrapper.text()).toContain('Tenés que indicar todas las fotos');
      expect(ids()).toEqual([1, 2]);
    });
  });

  describe('texto descriptivo', () => {
    it('lo guarda (sin espacios sobrantes)', async () => {
      await montar([foto(1, { alt: 'Viejo' })]);
      vi.mocked(api.actualizarMedio).mockResolvedValue(foto(1, { alt: 'Salón con mesas' }));
      await clic(botonAria('Describir la foto 1'));
      expect(campo('Descripción de la foto').element.value).toBe('Viejo');
      await escribir('Descripción de la foto', '  Salón con mesas  ');
      await clic(botonActivo('Guardar'));
      expect(api.actualizarMedio).toHaveBeenCalledWith(1, { alt: 'Salón con mesas' });
      expect(wrapper.find('[data-testid="foto-1"]').text()).toContain('Salón con mesas');
    });

    it('vaciarlo lo QUITA (null), no lo ignora', async () => {
      await montar([foto(1, { alt: 'Viejo' })]);
      vi.mocked(api.actualizarMedio).mockResolvedValue(foto(1));
      await clic(botonAria('Describir la foto 1'));
      await escribir('Descripción de la foto', '');
      await clic(botonActivo('Guardar'));
      expect(api.actualizarMedio).toHaveBeenCalledWith(1, { alt: null });
    });

    it('no permite más de 255 caracteres', async () => {
      await montar([foto(1)]);
      await clic(botonAria('Describir la foto 1'));
      await escribir('Descripción de la foto', 'x'.repeat(256));
      expect((botonActivo('Guardar') as HTMLButtonElement).disabled).toBe(true);
      expect(textoPantalla()).toContain('255');
    });
  });

  describe('borrado', () => {
    it('pide confirmación, borra y vuelve a leer la lista (la principal pudo cambiar)', async () => {
      await montar();
      vi.mocked(api.eliminarMedio).mockResolvedValue(undefined);
      await clic(botonAria('Borrar la foto 1'));
      expect(textoPantalla()).toContain('se elimina definitivamente');
      expect(api.eliminarMedio).not.toHaveBeenCalled();

      vi.mocked(api.listarMedios).mockResolvedValue([foto(2, { esPortada: true }), foto(3)]);
      await clic(botonActivo('Borrar'));
      expect(api.eliminarMedio).toHaveBeenCalledWith(1);
      expect(ids()).toEqual([2, 3]);
      expect(wrapper.find('[data-testid="foto-2"]').text()).toContain('Principal');
    });

    it('si falla, muestra el motivo y conserva la lista', async () => {
      await montar();
      vi.mocked(api.eliminarMedio).mockRejectedValue(new ApiError(404, 'No se encontró lo que busca.'));
      await clic(botonAria('Borrar la foto 2'));
      await clic(botonActivo('Borrar'));
      expect(wrapper.text()).toContain('No se encontró lo que busca.');
      expect(ids()).toEqual([1, 2, 3]);
    });
  });
});
