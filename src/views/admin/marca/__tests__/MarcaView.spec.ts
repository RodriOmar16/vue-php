import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as api from '@/api/marca';
import type { MarcaEmpresa, Perfil, RolCodigo } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { botonPorTexto, campo, clic, escribir, routerDePrueba } from '@/test/ayudas';
import MarcaView from '../MarcaView.vue';

// Se conservan las constantes reales (tope, tipos) y se simulan solo las llamadas a la API
vi.mock('@/api/marca', async (original) => ({
  ...(await original<typeof import('@/api/marca')>()),
  obtenerMarca: vi.fn(),
  actualizarMarca: vi.fn(),
  subirLogo: vi.fn(),
  quitarLogo: vi.fn(),
}));

const MARCA: MarcaEmpresa = {
  slug: 'los-pinos', nombre: 'Los Pinos', colorPrimario: '#1e3a8a', colorSecundario: null, tituloHero: 'Tu fiesta',
  textoHero: null, sobreNosotros: 'Hace 10 años', direccion: 'Calle 1', telefono: '11 5555', email: 'hola@pinos.com',
  redes: { instagram: 'https://instagram.com/pinos' }, datosTransferencia: null, politicaCancelacionCliente: 'ninguno', diasLimiteCancelacionCliente: 1, logoUrl: null,
};
const marca = (extra: Partial<MarcaEmpresa> = {}): MarcaEmpresa => ({ ...MARCA, ...extra });

let wrapper: VueWrapper;
let cargarPerfil: ReturnType<typeof vi.fn>;

async function montar(datos: MarcaEmpresa = MARCA, rol: RolCodigo = 'propietario') {
  const pinia = createPinia();
  setActivePinia(pinia);
  const sesion = useSesionStore();
  const perfil: Perfil = {
    id: 1, nombre: 'María', username: 'maria', email: 'm@x.com', rol, debeCambiarPassword: false,
    empresa: { id: 1, slug: 'los-pinos', nombre: 'Los Pinos', zonaHoraria: 'America/Argentina/Buenos_Aires' },
  };
  sesion.usuario = perfil;
  cargarPerfil = vi.fn().mockResolvedValue(undefined);
  sesion.cargarPerfil = cargarPerfil as unknown as typeof sesion.cargarPerfil;
  vi.mocked(api.obtenerMarca).mockResolvedValue(datos);
  wrapper = mount(MarcaView, { global: { plugins: [vuetify, pinia, await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

const guardar = () => clic(botonPorTexto('Guardar cambios'));
const enviado = () => vi.mocked(api.actualizarMarca).mock.calls[0]?.[0];
const archivo = (nombre = 'logo.png', tipo = 'image/png', bytes = 1000) => {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
};
async function elegirLogo(f: File) {
  const input = wrapper.find<HTMLInputElement>('[data-testid="entrada-logo"]').element;
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  input.dispatchEvent(new Event('change'));
  await flushPromises();
}

describe('MarcaView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });
  afterEach(() => wrapper?.unmount());

  describe('cancelación del cliente', () => {
    const radio = (valor: string) => document.querySelector<HTMLInputElement>(`input[type="radio"][value="${valor}"]`);

    it('muestra la política guardada: por defecto no se devuelve nada, con 1 día de plazo', async () => {
      await montar();
      expect(radio('ninguno')!.checked).toBe(true);
      expect(campo('Días antes del evento hasta los que puede cancelar').element.value).toBe('1');
      expect(wrapper.text()).toContain('pendiente');
    });

    it('envía solo la política cuando solo cambia esa', async () => {
      await montar();
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca({ politicaCancelacionCliente: 'sena' }));
      await clic(radio('sena'));
      await guardar();
      expect(enviado()).toEqual({ politicaCancelacionCliente: 'sena' });
    });

    it('envía los días como número, junto con la política si también cambió', async () => {
      await montar(marca({ politicaCancelacionCliente: 'sena', diasLimiteCancelacionCliente: 2 }));
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca());
      await clic(radio('todo'));
      await escribir('Días antes del evento hasta los que puede cancelar', '7');
      await guardar();
      expect(enviado()).toEqual({ politicaCancelacionCliente: 'todo', diasLimiteCancelacionCliente: 7 });
    });

    it.each(['0', '366', '1.5', ''])('rechaza %j como cantidad de días y no envía nada', async (valor) => {
      await montar();
      await escribir('Días antes del evento hasta los que puede cancelar', valor);
      await guardar();
      expect(api.actualizarMarca).not.toHaveBeenCalled();
    });

    it('el empleado la ve pero no la puede cambiar', async () => {
      await montar(marca(), 'empleado');
      expect(radio('sena')!.disabled).toBe(true);
      expect(campo('Días antes del evento hasta los que puede cancelar').element.disabled).toBe(true);
    });
  });

  describe('carga', () => {
    it('muestra lo guardado, la vista previa y el enlace a la página pública', async () => {
      await montar();
      expect(campo('Nombre comercial').element.value).toBe('Los Pinos');
      expect(campo('Color principal').element.value).toBe('#1e3a8a');
      expect(campo('Color de acento').element.value).toBe('');
      expect(campo('Título de la portada').element.value).toBe('Tu fiesta');
      expect(campo('Dirección').element.value).toBe('Calle 1');
      expect(campo('Email de contacto').element.value).toBe('hola@pinos.com');
      expect(campo('Instagram').element.value).toBe('https://instagram.com/pinos');
      expect(campo('Facebook').element.value).toBe('');
      expect(wrapper.find('[data-testid="vista-previa"]').text()).toContain('Tu fiesta');
      expect(wrapper.find('a[href="http://localhost:3001/los-pinos"]').exists()).toBe(true);
    });

    it('si falla la carga muestra el motivo y permite reintentar', async () => {
      setActivePinia(createPinia());
      vi.mocked(api.obtenerMarca).mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.'));
      wrapper = mount(MarcaView, { global: { plugins: [vuetify, createPinia(), await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se pudo conectar');
      vi.mocked(api.obtenerMarca).mockResolvedValueOnce(MARCA);
      await clic(botonPorTexto('Reintentar'));
      expect(campo('Nombre comercial').element.value).toBe('Los Pinos');
    });

    it('el empleado ve todo pero no puede editar', async () => {
      await montar(MARCA, 'empleado');
      expect(campo('Nombre comercial').element.disabled).toBe(true);
      expect(botonPorTexto('Guardar cambios')).toBeUndefined();
      expect(botonPorTexto('Subir logo')).toBeUndefined();
      expect(botonPorTexto('Cambiar logo')).toBeUndefined();
    });
  });

  describe('guardado', () => {
    it('sin cambios no se puede guardar; al editar aparece el aviso de cambios sin guardar', async () => {
      await montar();
      expect((botonPorTexto('Guardar cambios') as HTMLButtonElement).disabled).toBe(true);
      expect(wrapper.find('[data-testid="sin-guardar"]').exists()).toBe(false);
      await escribir('Dirección', 'Calle 2');
      expect((botonPorTexto('Guardar cambios') as HTMLButtonElement).disabled).toBe(false);
      expect(wrapper.find('[data-testid="sin-guardar"]').exists()).toBe(true);
    });

    it('envía SOLO lo que cambió, avisa y refresca el nombre de la empresa en el panel', async () => {
      await montar();
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca({ nombre: 'Los Pinos II', direccion: 'Calle 2' }));
      await escribir('Nombre comercial', '  Los Pinos II  ');
      await escribir('Dirección', 'Calle 2');
      await guardar();
      expect(enviado()).toEqual({ nombre: 'Los Pinos II', direccion: 'Calle 2' });
      expect(genericosStore().textoSnack).toBe('Se guardaron los cambios de tu marca.');
      expect(cargarPerfil).toHaveBeenCalled();
      expect(campo('Dirección').element.value).toBe('Calle 2');
      expect((botonPorTexto('Guardar cambios') as HTMLButtonElement).disabled).toBe(true); // ya no hay cambios
    });

    it('vaciar un campo que tenía valor envía null (la API lo interpreta como «quitar»)', async () => {
      await montar();
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca({ tituloHero: null, telefono: null, colorPrimario: null }));
      await escribir('Título de la portada', '');
      await escribir('Teléfono', '   ');
      await escribir('Color principal', '');
      await guardar();
      expect(enviado()).toEqual({ tituloHero: null, telefono: null, colorPrimario: null });
    });

    it('los colores se envían en minúsculas', async () => {
      await montar();
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca());
      await escribir('Color de acento', '#AABBCC');
      await guardar();
      expect(enviado()).toEqual({ colorSecundario: '#aabbcc' });
    });

    it('redes: si cambia una se envían todas juntas; si se vacían todas, null', async () => {
      await montar();
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca());
      await escribir('Facebook', 'https://facebook.com/pinos');
      await guardar();
      expect(enviado()).toEqual({ redes: { instagram: 'https://instagram.com/pinos', facebook: 'https://facebook.com/pinos' } });

      vi.mocked(api.actualizarMarca).mockClear();
      await escribir('Instagram', '');
      await escribir('Facebook', '');
      await guardar();
      expect(vi.mocked(api.actualizarMarca).mock.calls[0][0]).toEqual({ redes: null });
    });

    it('descartar vuelve a lo guardado', async () => {
      await montar();
      await escribir('Nombre comercial', 'Otro nombre');
      await escribir('Instagram', 'https://otra.com');
      await clic(botonPorTexto('Descartar'));
      expect(campo('Nombre comercial').element.value).toBe('Los Pinos');
      expect(campo('Instagram').element.value).toBe('https://instagram.com/pinos');
      expect(wrapper.find('[data-testid="sin-guardar"]').exists()).toBe(false);
    });
  });

  describe('cobro de la seña por transferencia', () => {
    const BANCO = { titular: 'Los Pinos SRL', banco: 'Banco Provincia', cbu: '0140000000000000000001', alias: 'los.pinos' };

    it('muestra los datos guardados', async () => {
      await montar(marca({ datosTransferencia: BANCO }));
      expect(campo('Titular de la cuenta').element.value).toBe('Los Pinos SRL');
      expect(campo('Banco').element.value).toBe('Banco Provincia');
      expect(campo('CBU o CVU').element.value).toBe('0140000000000000000001');
      expect(campo('Alias').element.value).toBe('los.pinos');
      expect(campo('CUIT / CUIL (opcional)').element.value).toBe('');
    });

    it('al cargarlos por primera vez envía todos juntos, sin espacios sobrantes ni campos vacíos', async () => {
      await montar();
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca({ datosTransferencia: BANCO }));
      await escribir('Titular de la cuenta', '  Los Pinos SRL ');
      await escribir('Alias', 'los.pinos');
      await guardar();
      expect(enviado()).toEqual({ datosTransferencia: { titular: 'Los Pinos SRL', alias: 'los.pinos' } });
    });

    it('si cambia un solo dato, igualmente se envía el conjunto completo (la API los reemplaza juntos)', async () => {
      await montar(marca({ datosTransferencia: BANCO }));
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca({ datosTransferencia: { ...BANCO, alias: 'nuevo.alias' } }));
      await escribir('Alias', 'nuevo.alias');
      await guardar();
      expect(enviado()).toEqual({ datosTransferencia: { ...BANCO, alias: 'nuevo.alias' } });
    });

    it('vaciar todos los datos los QUITA (null)', async () => {
      await montar(marca({ datosTransferencia: { alias: 'los.pinos' } }));
      vi.mocked(api.actualizarMarca).mockResolvedValue(marca());
      await escribir('Alias', '');
      await guardar();
      expect(enviado()).toEqual({ datosTransferencia: null });
    });

    it.each([
      ['CBU o CVU', '123', 'tiene 22 números'],
      ['CBU o CVU', '01400000000000000000ab', 'tiene 22 números'],
      ['Alias', 'a', 'Entre 6 y 20 caracteres'],
      ['Alias', 'tiene espacios', 'Entre 6 y 20 caracteres'],
      ['CUIT / CUIL (opcional)', '123', 'CUIT de 11 números'],
    ])('%s = «%s» no se acepta', async (etiqueta, valor, mensaje) => {
      await montar();
      await escribir('Alias', 'alias.valido');
      await escribir(etiqueta, valor);
      await guardar();
      expect(document.body.textContent).toContain(mensaje);
      expect(api.actualizarMarca).not.toHaveBeenCalled();
    });

    it('si se carga cualquier dato bancario, hace falta el CBU o el alias', async () => {
      await montar();
      await escribir('Titular de la cuenta', 'Los Pinos SRL');
      await guardar();
      expect(document.body.textContent).toContain('Indicá el CBU o el alias');
      expect(api.actualizarMarca).not.toHaveBeenCalled();
    });

    it('el empleado los ve pero no los puede editar', async () => {
      await montar(marca({ datosTransferencia: BANCO }), 'empleado');
      expect(campo('Alias').element.disabled).toBe(true);
      expect(campo('Alias').element.value).toBe('los.pinos');
    });
  });

  describe('validaciones (no llaman a la API)', () => {
    it.each([
      ['Color principal', 'azul', 'Un color de 6 dígitos'],
      ['Color de acento', '#12345', 'Un color de 6 dígitos'],
      ['Email de contacto', 'no-es-email', 'Ingresá un email válido'],
      ['Instagram', 'instagram.com/pinos', 'Un enlace que empiece con https://'],
      ['Sitio web', 'javascript:alert(1)', 'Un enlace que empiece con https://'],
      ['Nombre comercial', '', 'Campo obligatorio'],
    ])('%s = «%s»', async (etiqueta, valor, mensaje) => {
      await montar();
      await escribir(etiqueta, valor);
      await guardar();
      expect(document.body.textContent).toContain(mensaje);
      expect(api.actualizarMarca).not.toHaveBeenCalled();
    });
  });

  it('si la API rechaza, muestra el motivo y conserva lo escrito', async () => {
    await montar();
    vi.mocked(api.actualizarMarca).mockRejectedValue(new ApiError(400, 'colorPrimario debe ser un color hexadecimal de 6 dígitos'));
    await escribir('Dirección', 'Calle 9');
    await guardar();
    expect(wrapper.text()).toContain('colorPrimario debe ser un color');
    expect(campo('Dirección').element.value).toBe('Calle 9');
    expect(cargarPerfil).not.toHaveBeenCalled();
  });

  describe('vista previa', () => {
    const portada = () => wrapper.find<HTMLElement>('[data-testid="vista-previa"]').element;

    it('toma el color que se escribe y elige un texto legible sobre él', async () => {
      await montar(marca({ colorPrimario: null }));
      expect(portada().style.backgroundColor).toBe('rgb(124, 58, 237)'); // el violeta por defecto
      await escribir('Color principal', '#ffffff');
      expect(portada().style.backgroundColor).toBe('rgb(255, 255, 255)');
      expect(portada().style.color).toBe('rgb(28, 25, 23)'); // fondo claro -> texto oscuro
      await escribir('Color principal', '#000000');
      expect(portada().style.color).toBe('rgb(255, 255, 255)'); // fondo oscuro -> texto blanco
    });

    it('un color a medio escribir no rompe la vista previa (usa el de por defecto)', async () => {
      await montar();
      await escribir('Color principal', '#12');
      expect(portada().style.backgroundColor).toBe('rgb(124, 58, 237)');
    });

    it('refleja el título y el nombre mientras se escribe, con textos de ejemplo si están vacíos', async () => {
      await montar(marca({ tituloHero: null }));
      expect(portada().textContent).toContain('Festejá en Los Pinos');
      await escribir('Título de la portada', 'Cumpleaños de ensueño');
      expect(portada().textContent).toContain('Cumpleaños de ensueño');
    });
  });

  describe('logo', () => {
    it('sube el logo al instante sin perder lo que se está escribiendo', async () => {
      await montar();
      vi.mocked(api.subirLogo).mockResolvedValue(marca({ logoUrl: 'https://assets.test/logo.webp' }));
      await escribir('Dirección', 'Calle en edición');
      const f = archivo();
      await elegirLogo(f);
      expect(api.subirLogo).toHaveBeenCalledWith(f);
      expect(wrapper.find('img[src="https://assets.test/logo.webp"]').exists()).toBe(true);
      expect(genericosStore().textoSnack).toBe('Logo actualizado.');
      expect(campo('Dirección').element.value).toBe('Calle en edición');
      expect(botonPorTexto('Cambiar logo')).toBeTruthy();
    });

    it('rechaza sin molestar a la API lo que no es JPG/PNG/WebP o pesa más de 5 MB', async () => {
      await montar();
      await elegirLogo(archivo('logo.gif', 'image/gif'));
      expect(wrapper.text()).toContain('JPG, PNG o WebP');
      await elegirLogo(archivo('enorme.png', 'image/png', 6 * 1024 * 1024));
      expect(wrapper.text()).toContain('supera los 5 MB');
      expect(api.subirLogo).not.toHaveBeenCalled();
    });

    it('un error de la API al subir se muestra', async () => {
      await montar();
      vi.mocked(api.subirLogo).mockRejectedValue(new ApiError(400, 'El archivo no es una imagen válida. Se aceptan JPG, PNG o WebP'));
      await elegirLogo(archivo());
      expect(wrapper.text()).toContain('no es una imagen válida');
    });

    it('quitar el logo', async () => {
      await montar(marca({ logoUrl: 'https://assets.test/logo.webp' }));
      vi.mocked(api.quitarLogo).mockResolvedValue(marca({ logoUrl: null }));
      await clic(botonPorTexto('Quitar'));
      expect(api.quitarLogo).toHaveBeenCalled();
      expect(wrapper.find('img[src="https://assets.test/logo.webp"]').exists()).toBe(false);
      expect(botonPorTexto('Subir logo')).toBeTruthy();
    });
  });
});
