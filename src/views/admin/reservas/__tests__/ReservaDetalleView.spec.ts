import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as api from '@/api/reservas';
import type { EstadoReserva, PagoReserva, ReservaDetalleAdmin } from '@/api/tipos';
import vuetify from '@/plugins/vuetify';
import { genericosStore } from '@/store/genericos';
import { botonActivo, botonAria, botonPorTexto, campo, clic, escribir, hayDialogoActivo, routerDePrueba, textoPantalla } from '@/test/ayudas';
import { formatearImporte } from '@/utils/dinero';
import ReservaDetalleView from '../ReservaDetalleView.vue';

vi.mock('@/api/reservas');

const pago = (extra: Partial<PagoReserva> = {}): PagoReserva => ({
  id: 'p1', monto: '625.00', tipo: 'sena', metodo: 'transferencia', estado: 'pendiente', fecha: '2027-02-01T15:00:00.000Z',
  tieneComprobante: true, validadoPor: null, motivoRechazo: null, ...extra,
});

const reserva = (extra: Partial<ReservaDetalleAdmin> = {}): ReservaDetalleAdmin => ({
  id: 'r1', estado: 'pendiente', creadaEn: '2027-02-01T15:00:00.000Z', expiraEn: '2027-02-04T15:00:00.000Z', fecha: '2027-03-06',
  horaInicio: '15:00', horaFin: '19:00', finDiaSiguiente: false, salon: { id: 1, nombre: 'Salón Arcoíris' }, combo: { id: 1, nombre: 'Combo Plus' },
  cliente: { id: 1, nombre: 'Ana Gómez', dni: '30123456', email: 'ana@mail.com', telefono: '11 5555-1234', tieneCuenta: false },
  invitados: 20, festejado: { nombre: 'Sofi', edad: 7 }, observaciones: 'Torta de frutilla',
  lineas: [
    { tipo: 'base', descripcion: 'Combo Plus', cantidad: 1, precioUnitario: '1000.00', subtotal: '1000.00', incluido: false },
    { tipo: 'menu', descripcion: 'Menú: Parrilla', cantidad: 1, precioUnitario: '250.00', subtotal: '250.00', incluido: true },
    { tipo: 'servicio', descripcion: 'Mozos', cantidad: 1, precioUnitario: '0.00', subtotal: '0.00', incluido: true },
  ],
  total: '1250.00', sena: { porcentaje: '50.00', monto: '625.00' }, pagado: '0.00', saldo: '1250.00',
  reembolsable: '0.00', reembolsoPendiente: '0.00', reembolsado: '0.00', motivoCancelacion: null,
  pagos: [pago()],
  historial: [
    { accion: 'creada', autor: 'Sistema', detalle: { origen: 'web' }, fecha: '2027-02-01T14:00:00.000Z' },
    { accion: 'comprobante_enviado', autor: 'Sistema', detalle: { monto: '625.00' }, fecha: '2027-02-01T15:00:00.000Z' },
  ],
  ...extra,
});

let wrapper: VueWrapper;

async function montar(datos: ReservaDetalleAdmin = reserva()) {
  setActivePinia(createPinia());
  vi.mocked(api.obtenerReserva).mockResolvedValue(datos);
  wrapper = mount(ReservaDetalleView, { props: { id: datos.id }, global: { plugins: [vuetify, createPinia(), await routerDePrueba()] }, attachTo: document.body });
  await flushPromises();
}

describe('ReservaDetalleView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:comprobante');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => wrapper?.unmount());

  describe('lo que muestra', () => {
    it('el cliente, el evento, las líneas, los totales y el estado', async () => {
      await montar();
      const t = wrapper.text();
      expect(t).toContain('Ana Gómez');
      expect(t).toContain('DNI 30123456');
      expect(t).toContain('ana@mail.com');
      expect(t).toContain('Reservó sin cuenta');
      expect(t).toContain('06/03/2027');
      expect(t).toContain('15:00 a 19:00');
      expect(t).toContain('Combo Plus · 20 invitados');
      expect(t).toContain('Festeja Sofi (7 años)');
      expect(t).toContain('Torta de frutilla');
      expect(t).toContain('Menú: Parrilla');
      expect(wrapper.find('[data-testid="estado"]').text()).toBe('Esperando la seña');
      expect(wrapper.find('[data-testid="total"]').text()).toMatch(/1\.250,00/);
      expect(wrapper.find('[data-testid="cobrado"]').text()).toMatch(/0,00/);
      expect(wrapper.find('[data-testid="saldo"]').text()).toMatch(/1\.250,00/);
      expect(t).toContain('Incluido'); // los $0 del combo
    });

    it('avisa que el horario espera la revisión mientras haya un comprobante pendiente, y la seña si no hay ninguno', async () => {
      await montar();
      expect(wrapper.text()).toContain('el horario no vence hasta que lo apruebes o lo rechaces');
      wrapper.unmount();
      document.body.innerHTML = '';
      await montar(reserva({ pagos: [] }));
      expect(wrapper.text()).toContain('Esperando la seña de');
      expect(wrapper.text()).toContain('se libera solo');
    });

    it('una reserva vencida lo dice', async () => {
      await montar(reserva({ estado: 'expirada', pagos: [] }));
      expect(wrapper.text()).toContain('El plazo para pagar la seña venció');
    });

    it('el historial describe cada evento en castellano', async () => {
      await montar();
      expect(wrapper.text()).toContain('Reserva creada');
      expect(wrapper.text()).toContain('El cliente envió un comprobante');
    });

    it('si falla la carga muestra el motivo y permite reintentar', async () => {
      setActivePinia(createPinia());
      vi.mocked(api.obtenerReserva).mockRejectedValueOnce(new ApiError(404, 'No se encontró lo que busca.'));
      wrapper = mount(ReservaDetalleView, { props: { id: 'r1' }, global: { plugins: [vuetify, createPinia(), await routerDePrueba()] }, attachTo: document.body });
      await flushPromises();
      expect(wrapper.text()).toContain('No se encontró lo que busca.');
      vi.mocked(api.obtenerReserva).mockResolvedValueOnce(reserva());
      await clic(botonPorTexto('Reintentar'));
      expect(wrapper.text()).toContain('Ana Gómez');
    });
  });

  describe('ver el comprobante', () => {
    it('lo descarga con la sesión y lo muestra como imagen', async () => {
      await montar();
      vi.mocked(api.descargarComprobante).mockResolvedValue(new Blob(['x'], { type: 'image/webp' }));
      await clic(botonAria(`Ver el comprobante de ${formatearImporte('625.00')}`));
      expect(api.descargarComprobante).toHaveBeenCalledWith('p1');
      expect(document.querySelector('.v-overlay--active img')?.getAttribute('src')).toBe('blob:comprobante');
    });

    it('un PDF se muestra incrustado, no como imagen', async () => {
      await montar();
      vi.mocked(api.descargarComprobante).mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
      await clic(botonAria(`Ver el comprobante de ${formatearImporte('625.00')}`));
      expect(document.querySelector('.v-overlay--active iframe')).toBeTruthy();
      expect(document.querySelector('.v-overlay--active img')).toBeNull();
    });

    it('si no se puede abrir, lo explica; y al cerrar libera el archivo de la memoria', async () => {
      await montar();
      vi.mocked(api.descargarComprobante).mockRejectedValueOnce(new ApiError(500, 'Error del servidor. Intente más tarde.'));
      await clic(botonAria(`Ver el comprobante de ${formatearImporte('625.00')}`));
      expect(textoPantalla()).toContain('Error del servidor');

      vi.mocked(api.descargarComprobante).mockResolvedValueOnce(new Blob(['x'], { type: 'image/webp' }));
      await clic(botonActivo('Cerrar'));
      await clic(botonAria(`Ver el comprobante de ${formatearImporte('625.00')}`));
      await clic(botonActivo('Cerrar'));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:comprobante');
    });

    it('un pago registrado a mano (sin comprobante) no ofrece verlo', async () => {
      await montar(reserva({ pagos: [pago({ tieneComprobante: false, metodo: 'efectivo', estado: 'aprobado' })] }));
      expect(botonAria(`Ver el comprobante de ${formatearImporte('625.00')}`)).toBeNull();
    });
  });

  describe('aprobar', () => {
    it('pide confirmación, avisa si la seña queda cubierta, aprueba y recarga', async () => {
      await montar();
      vi.mocked(api.aprobarPago).mockResolvedValue({ reservaId: 'r1', estado: 'confirmada', pagado: '625.00', saldo: '625.00' });
      vi.mocked(api.obtenerReserva).mockResolvedValue(reserva({ estado: 'confirmada', pagado: '625.00', saldo: '625.00', pagos: [pago({ estado: 'aprobado', validadoPor: 'María' })] }));
      await clic(botonPorTexto('Aprobar'));
      expect(textoPantalla()).toContain('la seña queda cubierta y la reserva se confirma');
      expect(api.aprobarPago).not.toHaveBeenCalled();
      await clic(botonActivo('Aprobar'));
      expect(api.aprobarPago).toHaveBeenCalledWith('p1');
      expect(genericosStore().textoSnack).toBe('Pago aprobado: la reserva quedó confirmada.');
      expect(wrapper.find('[data-testid="estado"]').text()).toBe('Confirmada');
      expect(wrapper.text()).toContain('por María');
      // ya no hay nada pendiente en la tabla (el diálogo cerrado sigue montado, por eso se mira solo la tabla)
      expect(wrapper.findAll('tbody button').filter((b) => b.text() === 'Aprobar')).toHaveLength(0);
    });

    it('con un pago que no alcanza para la seña, el mensaje no promete confirmar', async () => {
      await montar(reserva({ pagos: [pago({ monto: '300.00' })] }));
      await clic(botonPorTexto('Aprobar'));
      expect(textoPantalla()).not.toContain('se confirma');
      expect(textoPantalla()).toContain('Ya no se puede deshacer');
    });

    it('si la API lo rechaza (por ejemplo, la reserva venció), muestra el motivo y recarga lo real', async () => {
      await montar();
      vi.mocked(api.aprobarPago).mockRejectedValue(new ApiError(409, 'La reserva venció y su horario pudo haber quedado libre.'));
      await clic(botonPorTexto('Aprobar'));
      await clic(botonActivo('Aprobar'));
      expect(wrapper.text()).toContain('La reserva venció y su horario pudo haber quedado libre.');
      expect(api.obtenerReserva).toHaveBeenCalledTimes(2);
    });
  });

  describe('rechazar', () => {
    it('exige un motivo de al menos 3 letras; lo envía sin espacios y avisa', async () => {
      await montar();
      await clic(botonPorTexto('Rechazar'));
      expect(hayDialogoActivo()).toBe(true);
      await clic(botonActivo('Rechazar comprobante'));
      expect(textoPantalla()).toContain('Campo obligatorio');
      await escribir('Motivo', 'ab');
      await clic(botonActivo('Rechazar comprobante'));
      expect(textoPantalla()).toContain('al menos 3 caracteres');
      expect(api.rechazarPago).not.toHaveBeenCalled();

      vi.mocked(api.rechazarPago).mockResolvedValue({ reservaId: 'r1', estado: 'pendiente', pagado: '0.00', saldo: '1250.00' });
      await escribir('Motivo', '  El importe no coincide  ');
      await clic(botonActivo('Rechazar comprobante'));
      expect(api.rechazarPago).toHaveBeenCalledWith('p1', 'El importe no coincide');
      expect(genericosStore().textoSnack).toContain('Comprobante rechazado');
    });

    it('un error de la API se muestra en el diálogo y no se cierra', async () => {
      await montar();
      vi.mocked(api.rechazarPago).mockRejectedValue(new ApiError(409, 'Este pago ya fue aprobado.'));
      await clic(botonPorTexto('Rechazar'));
      await escribir('Motivo', 'No corresponde');
      await clic(botonActivo('Rechazar comprobante'));
      expect(textoPantalla()).toContain('Este pago ya fue aprobado.');
      expect(hayDialogoActivo()).toBe(true);
    });

    it('el motivo de un pago ya rechazado se ve en la lista', async () => {
      await montar(reserva({ pagos: [pago({ estado: 'rechazado', motivoRechazo: 'Foto borrosa' })] }));
      expect(wrapper.text()).toContain('Rechazado');
      expect(wrapper.text()).toContain('Foto borrosa');
      expect(botonPorTexto('Rechazar')).toBeUndefined();
    });
  });

  describe('registrar un pago', () => {
    it('propone la seña que falta, valida el importe y lo envía como número', async () => {
      await montar(reserva({ pagos: [] }));
      await clic(botonPorTexto('Registrar un pago'));
      expect(campo('Importe').element.value).toBe('625');

      await escribir('Importe', '1250.01');
      await clic(botonActivo('Registrar pago'));
      expect(textoPantalla()).toContain('No puede superar lo que falta cobrar');
      await escribir('Importe', '0');
      await clic(botonActivo('Registrar pago'));
      expect(textoPantalla()).toContain('mayor a cero');
      expect(api.registrarPago).not.toHaveBeenCalled();

      vi.mocked(api.registrarPago).mockResolvedValue({ reservaId: 'r1', estado: 'confirmada', pagado: '625.00', saldo: '625.00' });
      await escribir('Importe', '625');
      await clic(botonActivo('Registrar pago'));
      expect(api.registrarPago).toHaveBeenCalledWith('r1', { monto: 625, tipo: 'sena', metodo: 'efectivo' });
      expect(genericosStore().textoSnack).toBe('Pago registrado.');
    });

    it('con la seña ya cubierta propone el saldo', async () => {
      await montar(reserva({ estado: 'confirmada', pagado: '625.00', saldo: '625.00', pagos: [pago({ estado: 'aprobado', tieneComprobante: false, metodo: 'efectivo' })] }));
      await clic(botonPorTexto('Registrar un pago'));
      expect(campo('Importe').element.value).toBe('625');
      const marcado = document.querySelector<HTMLInputElement>('.v-overlay--active input[type="radio"][value="saldo"]');
      expect(marcado?.checked).toBe(true);
    });

    it('si ya está todo cobrado, o la reserva está cancelada o vencida, no ofrece registrar pagos', async () => {
      await montar(reserva({ estado: 'confirmada', pagado: '1250.00', saldo: '0.00', pagos: [] }));
      expect(botonPorTexto('Registrar un pago')).toBeUndefined();
      wrapper.unmount();
      document.body.innerHTML = '';
      await montar(reserva({ estado: 'cancelada', pagos: [] }));
      expect(botonPorTexto('Registrar un pago')).toBeUndefined();
      wrapper.unmount();
      document.body.innerHTML = '';
      await montar(reserva({ estado: 'expirada', pagos: [] }));
      expect(botonPorTexto('Registrar un pago')).toBeUndefined();
    });

    it('muestra el error de la API sin cerrar el diálogo', async () => {
      await montar(reserva({ pagos: [] }));
      vi.mocked(api.registrarPago).mockRejectedValue(new ApiError(409, 'La reserva venció y su horario pudo haber quedado libre.'));
      await clic(botonPorTexto('Registrar un pago'));
      await clic(botonActivo('Registrar pago'));
      expect(textoPantalla()).toContain('La reserva venció');
      expect(hayDialogoActivo()).toBe(true);
    });
  });

  describe('enlace para el cliente', () => {
    it('copia la dirección privada de la reserva', async () => {
      await montar();
      const escribirPortapapeles = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribirPortapapeles }, configurable: true });
      await clic(botonPorTexto('Copiar enlace para el cliente'));
      expect(escribirPortapapeles).toHaveBeenCalledWith('http://localhost:3001/reserva/r1');
      expect(genericosStore().textoSnack).toContain('Enlace copiado');
    });

    it('si el navegador no deja copiar, muestra el enlace para hacerlo a mano', async () => {
      await montar();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) }, configurable: true });
      await clic(botonPorTexto('Copiar enlace para el cliente'));
      expect(genericosStore().textoSnack).toContain('http://localhost:3001/reserva/r1');
    });
  });

  describe('cancelar la reserva', () => {
    const confirmada = (extra: Partial<ReservaDetalleAdmin> = {}) =>
      reserva({ estado: 'confirmada', pagado: '625.00', saldo: '625.00', reembolsable: '625.00', pagos: [pago({ estado: 'aprobado', tieneComprobante: false, metodo: 'efectivo' })], ...extra });
    const radio = (valor: string) => document.querySelector<HTMLInputElement>(`.v-overlay--active input[type="radio"][value="${valor}"]`);
    const botonCancelar = () => botonPorTexto('Cancelar reserva') as HTMLButtonElement | undefined;

    it('se ofrece en una reserva pendiente o confirmada, y en ninguna otra', async () => {
      await montar(reserva({ pagos: [] }));
      expect(botonCancelar()).toBeTruthy();
      wrapper.unmount();
      document.body.innerHTML = '';
      await montar(confirmada());
      expect(botonCancelar()).toBeTruthy();
      for (const estado of ['cancelada', 'expirada', 'completada'] as const) {
        wrapper.unmount();
        document.body.innerHTML = '';
        await montar(reserva({ estado, pagos: [] }));
        expect(botonCancelar()).toBeUndefined();
      }
    });

    it('con un comprobante sin revisar está deshabilitado y explica qué hacer primero', async () => {
      await montar();
      expect(botonCancelar()!.disabled).toBe(true);
      expect(wrapper.text()).toContain('Resolvelo antes de poder cancelar la reserva');
    });

    it('con dinero cobrado propone devolver todo, y explica que el reembolso queda pendiente', async () => {
      await montar(confirmada());
      await clic(botonCancelar());
      expect(textoPantalla()).toContain('el horario vuelve a quedar disponible');
      expect(textoPantalla()).toMatch(/Devolver todo lo cobrado \(\$\s?625,00\)/);
      expect(radio('todo')!.checked).toBe(true);
      expect(textoPantalla()).toContain('queda pendiente');
    });

    it('«devolver todo» no manda importe (la API devuelve lo cobrado), y recorta el motivo', async () => {
      await montar(confirmada());
      vi.mocked(api.cancelarReserva).mockResolvedValue({ reservaId: 'r1', estado: 'cancelada', pagado: '625.00', saldo: '625.00' });
      await clic(botonCancelar());
      await escribir('Motivo de la cancelación', '  El cliente se mudó  ');
      await clic(botonActivo('Cancelar la reserva'));
      expect(api.cancelarReserva).toHaveBeenCalledWith('r1', { motivo: 'El cliente se mudó' });
      expect(genericosStore().textoSnack).toContain('Reserva cancelada');
      expect(api.obtenerReserva).toHaveBeenCalledTimes(2); // recarga
    });

    it('«no devolver nada» manda 0; «otro importe» manda el número', async () => {
      await montar(confirmada());
      vi.mocked(api.cancelarReserva).mockResolvedValue({ reservaId: 'r1', estado: 'cancelada', pagado: '625.00', saldo: '625.00' });
      await clic(botonCancelar());
      await escribir('Motivo de la cancelación', 'Cancelación tardía');
      await clic(radio('nada'));
      await clic(botonActivo('Cancelar la reserva'));
      expect(api.cancelarReserva).toHaveBeenLastCalledWith('r1', { motivo: 'Cancelación tardía', reembolso: 0 });

      vi.mocked(api.cancelarReserva).mockClear();
      await clic(botonCancelar());
      await escribir('Motivo de la cancelación', 'Cancelación parcial');
      await clic(radio('otro'));
      await escribir('Importe a devolver', '300.5');
      await clic(botonActivo('Cancelar la reserva'));
      expect(api.cancelarReserva).toHaveBeenLastCalledWith('r1', { motivo: 'Cancelación parcial', reembolso: 300.5 });
    });

    it('valida el motivo y el importe: no manda nada si algo está mal', async () => {
      await montar(confirmada());
      await clic(botonCancelar());
      await clic(botonActivo('Cancelar la reserva'));
      expect(textoPantalla()).toContain('Campo obligatorio');
      await escribir('Motivo de la cancelación', 'ab');
      await clic(botonActivo('Cancelar la reserva'));
      expect(textoPantalla()).toContain('al menos 3 caracteres');

      await escribir('Motivo de la cancelación', 'Motivo válido');
      await clic(radio('otro'));
      await escribir('Importe a devolver', '625.01');
      await clic(botonActivo('Cancelar la reserva'));
      expect(textoPantalla()).toContain('No puede superar lo cobrado');
      await escribir('Importe a devolver', '0');
      await clic(botonActivo('Cancelar la reserva'));
      expect(textoPantalla()).toContain('mayor a cero');
      expect(api.cancelarReserva).not.toHaveBeenCalled();
    });

    it('si no se cobró nada lo dice y no pregunta por el dinero', async () => {
      await montar(reserva({ pagos: [] }));
      vi.mocked(api.cancelarReserva).mockResolvedValue({ reservaId: 'r1', estado: 'cancelada', pagado: '0.00', saldo: '1250.00' });
      await clic(botonCancelar());
      expect(document.querySelector('[data-testid="sin-cobros"]')?.textContent).toContain('No se cobró nada');
      expect(radio('todo')).toBeNull();
      await escribir('Motivo de la cancelación', 'No va a hacer la fiesta');
      await clic(botonActivo('Cancelar la reserva'));
      expect(api.cancelarReserva).toHaveBeenCalledWith('r1', { motivo: 'No va a hacer la fiesta' });
    });

    it('un error de la API (por ejemplo, el evento ya se realizó) se muestra y el diálogo no se cierra', async () => {
      await montar(confirmada());
      vi.mocked(api.cancelarReserva).mockRejectedValue(new ApiError(409, 'El evento ya se realizó: no se puede cancelar.'));
      await clic(botonCancelar());
      await escribir('Motivo de la cancelación', 'Se canceló');
      await clic(botonActivo('Cancelar la reserva'));
      expect(textoPantalla()).toContain('El evento ya se realizó');
      expect(hayDialogoActivo()).toBe(true);
    });
  });

  describe('reembolsos', () => {
    const reembolso = (extra: Partial<PagoReserva> = {}): PagoReserva => pago({ id: 'rb1', tipo: 'reembolso', estado: 'pendiente', metodo: 'transferencia', tieneComprobante: false, ...extra });
    const cancelada = (extra: Partial<ReservaDetalleAdmin> = {}) =>
      reserva({
        estado: 'cancelada', expiraEn: null, pagado: '625.00', saldo: '625.00', reembolsable: '0.00', reembolsoPendiente: '625.00', reembolsado: '0.00',
        motivoCancelacion: 'El cliente se mudó', pagos: [pago({ estado: 'aprobado', tieneComprobante: false, metodo: 'efectivo' }), reembolso()], ...extra,
      });
    const radio = (valor: string) => document.querySelector<HTMLInputElement>(`.v-overlay--active input[type="radio"][value="${valor}"]`);

    it('una reserva cancelada explica el motivo y cuánto falta devolver', async () => {
      await montar(cancelada());
      const aviso = wrapper.find('[data-testid="aviso-cancelada"]').text();
      expect(aviso).toContain('Reserva cancelada: El cliente se mudó');
      expect(aviso).toContain('El horario volvió a quedar disponible');
      expect(wrapper.find('[data-testid="falta-devolver"]').text()).toMatch(/625,00/);
      expect(wrapper.find('[data-testid="por-devolver"]').text()).toMatch(/625,00/);
      expect(wrapper.find('[data-testid="saldo"]').exists()).toBe(false); // «falta cobrar» no tiene sentido en una cancelada
    });

    it('un reembolso pendiente figura «Por devolver» y se maneja distinto a un comprobante: «Ya lo devolví» y «Anular»', async () => {
      await montar(cancelada());
      const fila = wrapper.findAll('tbody tr').find((tr) => tr.text().includes('reembolso'))!;
      expect(fila.text()).toContain('Por devolver');
      const botones = fila.findAll('button').map((b) => b.text());
      expect(botones).toContain('Ya lo devolví');
      expect(botones).toContain('Anular');
      expect(botones).not.toContain('Aprobar');
      expect(botones).not.toContain('Rechazar');
    });

    it('«Ya lo devolví» advierte que no se puede deshacer, y confirma con el medio usado', async () => {
      await montar(cancelada());
      vi.mocked(api.reembolsoRealizado).mockResolvedValue({ reservaId: 'r1', estado: 'cancelada', pagado: '0.00', saldo: '1250.00' });
      await clic(botonPorTexto('Ya lo devolví'));
      expect(textoPantalla()).toContain('no se puede deshacer');
      expect(textoPantalla()).toContain('ya salió');
      expect(api.reembolsoRealizado).not.toHaveBeenCalled();
      await clic(radio('efectivo'));
      await clic(botonActivo('Ya lo devolví'));
      expect(api.reembolsoRealizado).toHaveBeenCalledWith('rb1', 'efectivo');
      expect(genericosStore().textoSnack).toContain('devuelto');
    });

    it('por defecto propone transferencia', async () => {
      await montar(cancelada());
      vi.mocked(api.reembolsoRealizado).mockResolvedValue({ reservaId: 'r1', estado: 'cancelada', pagado: '0.00', saldo: '1250.00' });
      await clic(botonPorTexto('Ya lo devolví'));
      await clic(botonActivo('Ya lo devolví'));
      expect(api.reembolsoRealizado).toHaveBeenCalledWith('rb1', 'transferencia');
    });

    it('anular exige un motivo y lo manda sin espacios', async () => {
      await montar(cancelada());
      vi.mocked(api.anularReembolso).mockResolvedValue({ reservaId: 'r1', estado: 'cancelada', pagado: '625.00', saldo: '625.00' });
      await clic(botonPorTexto('Anular'));
      expect(textoPantalla()).toContain('Anular el reembolso');
      await clic(botonActivo('Anular reembolso'));
      expect(textoPantalla()).toContain('Campo obligatorio');
      expect(api.anularReembolso).not.toHaveBeenCalled();
      await escribir('Motivo', '  Lo cargué mal  ');
      await clic(botonActivo('Anular reembolso'));
      expect(api.anularReembolso).toHaveBeenCalledWith('rb1', 'Lo cargué mal');
      expect(api.rechazarPago).not.toHaveBeenCalled(); // no es un comprobante
      expect(genericosStore().textoSnack).toBe('Reembolso anulado.');
    });

    it('un reembolso devuelto o anulado ya no ofrece acciones y lo dice', async () => {
      await montar(cancelada({ reembolsoPendiente: '0.00', reembolsado: '625.00', pagos: [pago({ estado: 'aprobado', tieneComprobante: false }), reembolso({ estado: 'aprobado', validadoPor: 'María' })] }));
      const fila = wrapper.findAll('tbody tr').find((tr) => tr.text().includes('reembolso'))!;
      expect(fila.text()).toContain('Devuelto');
      expect(fila.findAll('button')).toHaveLength(0);
      expect(wrapper.find('[data-testid="devuelto"]').text()).toMatch(/625,00/);
      expect(wrapper.text()).toContain('Ya se le devolvieron');
      expect(wrapper.find('[data-testid="por-devolver"]').exists()).toBe(false);

      wrapper.unmount();
      document.body.innerHTML = '';
      await montar(cancelada({ reembolsoPendiente: '0.00', reembolsable: '625.00', pagos: [pago({ estado: 'aprobado', tieneComprobante: false }), reembolso({ estado: 'rechazado', motivoRechazo: 'Lo cargué mal' })] }));
      const anulado = wrapper.findAll('tbody tr').find((tr) => tr.text().includes('reembolso'))!;
      expect(anulado.text()).toContain('Anulado');
      expect(anulado.text()).toContain('Lo cargué mal');
    });

    it('«Registrar un reembolso» aparece solo si queda dinero por devolver y la reserva lo admite', async () => {
      const boton = () => botonPorTexto('Registrar un reembolso');
      await montar(cancelada({ reembolsoPendiente: '0.00', reembolsable: '625.00', pagos: [pago({ estado: 'aprobado', tieneComprobante: false })] }));
      expect(boton()).toBeTruthy();
      for (const datos of [
        cancelada(), // todo el dinero ya está comprometido en un reembolso pendiente (reembolsable 0)
        reserva({ pagos: [] }), // pendiente, sin cobros
        reserva({ estado: 'expirada', pagos: [] }),
      ]) {
        wrapper.unmount();
        document.body.innerHTML = '';
        await montar(datos);
        expect(boton()).toBeUndefined();
      }
    });

    it('registrar un reembolso propone lo máximo, valida el tope y manda número y medio', async () => {
      await montar(cancelada({ reembolsoPendiente: '0.00', reembolsable: '625.00', pagos: [pago({ estado: 'aprobado', tieneComprobante: false })] }));
      vi.mocked(api.registrarReembolso).mockResolvedValue({ reservaId: 'r1', estado: 'cancelada', pagado: '625.00', saldo: '625.00' });
      await clic(botonPorTexto('Registrar un reembolso'));
      expect(campo('Importe a devolver').element.value).toBe('625');
      await escribir('Importe a devolver', '700');
      await clic(botonActivo('Registrar reembolso'));
      expect(textoPantalla()).toContain('No puede superar');
      await escribir('Importe a devolver', '0');
      await clic(botonActivo('Registrar reembolso'));
      expect(textoPantalla()).toContain('mayor a cero');
      expect(api.registrarReembolso).not.toHaveBeenCalled();

      await escribir('Importe a devolver', '250.5');
      await clic(radio('efectivo'));
      await clic(botonActivo('Registrar reembolso'));
      expect(api.registrarReembolso).toHaveBeenCalledWith('r1', { monto: 250.5, metodo: 'efectivo' });
      expect(genericosStore().textoSnack).toContain('Queda pendiente');
    });

    it('el historial describe cancelaciones y reembolsos en castellano', async () => {
      await montar(cancelada({
        historial: [
          { accion: 'cancelada', autor: 'María', detalle: { motivo: 'El cliente se mudó', reembolso: '625.00' }, fecha: '2027-02-02T10:00:00.000Z' },
          { accion: 'reembolso_realizado', autor: 'María', detalle: { monto: '625.00' }, fecha: '2027-02-03T10:00:00.000Z' },
        ],
      }));
      expect(wrapper.text()).toContain('Reserva cancelada');
      expect(wrapper.text()).toContain('Reembolso devuelto al cliente');
    });
  });

  it.each<[EstadoReserva, string]>([['pendiente', 'Esperando la seña'], ['confirmada', 'Confirmada'], ['completada', 'Realizada'], ['cancelada', 'Cancelada'], ['expirada', 'Vencida']])(
    'el estado %s se muestra como «%s»',
    async (estado, texto) => {
      await montar(reserva({ estado, pagos: [] }));
      expect(wrapper.find('[data-testid="estado"]').text()).toBe(texto);
    },
  );
});
