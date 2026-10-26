<template>
  <div>
    <v-btn variant="text" prepend-icon="fa-solid fa-arrow-left" :to="{ name: 'admin-reservas' }" class="mb-2">Reservas</v-btn>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>
    <v-progress-linear v-if="cargando && !reserva" indeterminate class="mb-4" />

    <template v-if="reserva">
      <div class="d-flex flex-wrap align-center mb-4 ga-2">
        <div>
          <h1 class="text-h5">{{ reserva.cliente.nombre }}</h1>
          <div class="text-body-2 text-medium-emphasis">
            {{ fechaCorta(reserva.fecha) }} · {{ reserva.horaInicio }} a {{ reserva.horaFin }}<template v-if="reserva.finDiaSiguiente"> (día siguiente)</template>
            · {{ reserva.salon.nombre }}
          </div>
        </div>
        <v-chip :color="COLOR_ESTADO_RESERVA[reserva.estado]" variant="flat" data-testid="estado">{{ ETIQUETA_ESTADO_RESERVA[reserva.estado] }}</v-chip>
        <v-spacer />
        <v-btn variant="tonal" prepend-icon="fa-solid fa-link" @click="copiarEnlace">Copiar enlace para el cliente</v-btn>
      </div>

      <v-alert v-if="reserva.estado === 'pendiente'" type="info" variant="tonal" class="mb-4">
        <template v-if="reserva.pagos.some((p) => p.estado === 'pendiente')">
          Hay un comprobante esperando tu revisión: el horario no vence hasta que lo apruebes o lo rechaces.
        </template>
        <template v-else>
          Esperando la seña de <strong>{{ formatearImporte(reserva.sena.monto) }}</strong>. Si no llega a tiempo, el horario se libera solo.
        </template>
      </v-alert>
      <v-alert v-else-if="reserva.estado === 'expirada'" type="warning" variant="tonal" class="mb-4">
        El plazo para pagar la seña venció y el horario volvió a quedar disponible.
      </v-alert>

      <v-row>
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="fill-height">
            <v-card-title class="text-subtitle-1">Cliente</v-card-title>
            <v-card-text>
              <div class="font-weight-medium">{{ reserva.cliente.nombre }}</div>
              <div class="text-body-2">DNI {{ reserva.cliente.dni }}</div>
              <div v-if="reserva.cliente.telefono" class="text-body-2">
                <a :href="`tel:${reserva.cliente.telefono}`">{{ reserva.cliente.telefono }}</a>
              </div>
              <div v-if="reserva.cliente.email" class="text-body-2">
                <a :href="`mailto:${reserva.cliente.email}`">{{ reserva.cliente.email }}</a>
              </div>
              <v-chip size="x-small" variant="tonal" class="mt-2">{{ reserva.cliente.tieneCuenta ? 'Tiene cuenta en el sitio' : 'Reservó sin cuenta' }}</v-chip>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="fill-height">
            <v-card-title class="text-subtitle-1">Evento</v-card-title>
            <v-card-text>
              <div>{{ reserva.combo.nombre }} · {{ reserva.invitados }} invitados</div>
              <div v-if="reserva.festejado?.nombre" class="text-body-2">
                Festeja {{ reserva.festejado.nombre }}<template v-if="reserva.festejado.edad !== null"> ({{ reserva.festejado.edad }} años)</template>
              </div>
              <div v-if="reserva.observaciones" class="text-body-2 mt-2"><strong>Nota del cliente:</strong> {{ reserva.observaciones }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card variant="outlined" class="mt-4">
        <v-card-title class="text-subtitle-1">Detalle y totales</v-card-title>
        <v-table density="compact">
          <tbody>
            <tr v-for="(l, i) in reserva.lineas" :key="i">
              <td>{{ l.descripcion }}<span v-if="l.cantidad > 1" class="text-medium-emphasis"> × {{ l.cantidad }}</span></td>
              <td class="text-right">{{ Number(l.subtotal) === 0 ? 'Incluido' : formatearImporte(l.subtotal) }}</td>
            </tr>
            <tr class="font-weight-bold"><td>Total</td><td class="text-right" data-testid="total">{{ formatearImporte(reserva.total) }}</td></tr>
            <tr><td>Seña ({{ Number(reserva.sena.porcentaje) }}%)</td><td class="text-right">{{ formatearImporte(reserva.sena.monto) }}</td></tr>
            <tr><td>Cobrado</td><td class="text-right" data-testid="cobrado">{{ formatearImporte(reserva.pagado) }}</td></tr>
            <tr class="font-weight-bold"><td>Falta cobrar</td><td class="text-right" data-testid="saldo">{{ formatearImporte(reserva.saldo) }}</td></tr>
          </tbody>
        </v-table>
      </v-card>

      <div class="d-flex flex-wrap align-center mt-6 mb-2 ga-2">
        <h2 class="text-h6">Pagos</h2>
        <v-spacer />
        <v-btn v-if="puedeRegistrar" color="primary" prepend-icon="fa-solid fa-plus" @click="registrar.visible = true">Registrar un pago</v-btn>
      </div>
      <v-alert v-if="errorAccion" type="error" variant="tonal" class="mb-3" role="alert" closable @click:close="errorAccion = ''">{{ errorAccion }}</v-alert>
      <v-table v-if="reserva.pagos.length" density="comfortable">
        <thead>
          <tr><th>Fecha</th><th>Importe</th><th>Forma</th><th>Estado</th><th class="text-right">Acciones</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in reserva.pagos" :key="p.id">
            <td>{{ new Date(p.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) }}</td>
            <td class="font-weight-medium">{{ formatearImporte(p.monto) }}<span class="text-caption text-medium-emphasis"> · {{ p.tipo === 'sena' ? 'seña' : p.tipo === 'saldo' ? 'saldo' : 'reembolso' }}</span></td>
            <td>{{ ETIQUETA_METODO[p.metodo] }}</td>
            <td>
              <v-chip size="small" :color="COLOR_PAGO[p.estado]" variant="tonal">{{ ETIQUETA_PAGO[p.estado] }}</v-chip>
              <div v-if="p.motivoRechazo" class="text-caption text-medium-emphasis">{{ p.motivoRechazo }}</div>
              <div v-if="p.validadoPor" class="text-caption text-medium-emphasis">por {{ p.validadoPor }}</div>
            </td>
            <td class="text-right text-no-wrap">
              <v-btn v-if="p.tieneComprobante" variant="text" size="small" :aria-label="`Ver el comprobante de ${formatearImporte(p.monto)}`" @click="verComprobante(p.id)">
                <v-icon>fa-solid fa-file-image</v-icon><v-tooltip activator="parent" location="top">Ver comprobante</v-tooltip>
              </v-btn>
              <template v-if="p.estado === 'pendiente'">
                <v-btn color="success" variant="tonal" size="small" class="mx-1" :loading="trabajando === p.id" :disabled="trabajando !== null" @click="pedirAprobar(p)">Aprobar</v-btn>
                <v-btn color="error" variant="text" size="small" :disabled="trabajando !== null" @click="rechazar.pagoId = p.id; rechazar.visible = true">Rechazar</v-btn>
              </template>
            </td>
          </tr>
        </tbody>
      </v-table>
      <p v-else class="text-body-2 text-medium-emphasis">Todavía no hay pagos.</p>

      <h2 class="text-h6 mt-6 mb-2">Historial</h2>
      <v-timeline density="compact" side="end" align="start">
        <v-timeline-item v-for="(h, i) in reserva.historial" :key="i" size="x-small" dot-color="primary">
          <div class="text-body-2 font-weight-medium">{{ describirEvento(h.accion) }}</div>
          <div class="text-caption text-medium-emphasis">{{ h.autor }} · {{ new Date(h.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) }}</div>
          <div v-if="detalleDe(h)" class="text-caption">{{ detalleDe(h) }}</div>
        </v-timeline-item>
      </v-timeline>

      <DialogoComprobante v-model="comprobante.visible" :pago-id="comprobante.pagoId" />
      <DialogoRechazarPago v-model="rechazar.visible" :pago-id="rechazar.pagoId" @hecho="alHacer('Comprobante rechazado. El cliente puede enviar otro.')" />
      <DialogoRegistrarPago
        v-model="registrar.visible"
        :reserva-id="reserva.id"
        :estado="reserva.estado"
        :saldo="reserva.saldo"
        :falta-sena="faltaSena"
        @hecho="alHacer('Pago registrado.')"
      />
      <ModalConfirmar
        v-model="aprobar.visible"
        titulo="Aprobar el pago"
        :mensaje="mensajeAprobar"
        color="success"
        icono="fa-solid fa-check"
        texto-confirmar="Aprobar"
        :cargando="trabajando !== null"
        @confirmar="ejecutarAprobar"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError } from '@/api/http';
import { aprobarPago, obtenerReserva } from '@/api/reservas';
import {
  COLOR_ESTADO_RESERVA,
  ETIQUETA_ESTADO_RESERVA,
  type EstadoPago,
  type EventoHistorial,
  type PagoReserva,
  type ReservaDetalleAdmin,
} from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { genericosStore } from '@/store/genericos';
import { fechaCorta } from '@/utils/combos';
import { formatearImporte } from '@/utils/dinero';
import DialogoComprobante from './DialogoComprobante.vue';
import DialogoRechazarPago from './DialogoRechazarPago.vue';
import DialogoRegistrarPago from './DialogoRegistrarPago.vue';

const props = defineProps<{ id: string }>();
const avisos = genericosStore();

const ETIQUETA_PAGO: Record<EstadoPago, string> = { pendiente: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' };
const COLOR_PAGO: Record<EstadoPago, string> = { pendiente: 'warning', aprobado: 'success', rechazado: 'error' };
const ETIQUETA_METODO = { pasarela: 'Online', transferencia: 'Transferencia', efectivo: 'Efectivo' } as const;

const EVENTOS: Record<string, string> = {
  creada: 'Reserva creada',
  comprobante_enviado: 'El cliente envió un comprobante',
  pago_aprobado: 'Pago aprobado',
  pago_rechazado: 'Pago rechazado',
  pago_registrado: 'Pago registrado',
  confirmada: 'Reserva confirmada',
  expirada: 'Venció el plazo para pagar la seña',
  vinculada_a_cuenta: 'El cliente la agregó a su cuenta',
};
const describirEvento = (accion: string) => EVENTOS[accion] ?? accion;
const detalleDe = (h: EventoHistorial): string => {
  const d = h.detalle ?? {};
  if (typeof d.motivo === 'string') return d.motivo;
  if (typeof d.monto === 'string') return formatearImporte(d.monto);
  return '';
};

const reserva = ref<ReservaDetalleAdmin | null>(null);
const cargando = ref(false);
const errorCarga = ref('');
const errorAccion = ref('');
/** id del pago que se está aprobando (bloquea los demás botones mientras tanto) */
const trabajando = ref<string | null>(null);

const comprobante = reactive({ visible: false, pagoId: null as string | null });
const rechazar = reactive({ visible: false, pagoId: null as string | null });
const registrar = reactive({ visible: false });
const aprobar = reactive({ visible: false, pago: null as PagoReserva | null });

const sitio = (import.meta.env.VITE_SITIO_URL as string | undefined) ?? 'http://localhost:3001';
const puedeRegistrar = computed(() => reserva.value !== null && ['pendiente', 'confirmada', 'completada'].includes(reserva.value.estado) && Number(reserva.value.saldo) > 0);
const faltaSena = computed(() => {
  if (!reserva.value) return '0';
  return String(Math.max(0, Number(reserva.value.sena.monto) - Number(reserva.value.pagado)));
});
const mensajeAprobar = computed(() => {
  const p = aprobar.pago;
  if (!p || !reserva.value) return '';
  const alcanza = Number(reserva.value.pagado) + Number(p.monto) >= Number(reserva.value.sena.monto);
  return `Vas a dar por recibido ${formatearImporte(p.monto)}. ${
    reserva.value.estado === 'pendiente' && alcanza ? 'Con este pago la seña queda cubierta y la reserva se confirma.' : 'Ya no se puede deshacer.'
  }`;
});

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    reserva.value = await obtenerReserva(props.id);
  } catch (e) {
    errorCarga.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    cargando.value = false;
  }
}

async function alHacer(mensaje: string) {
  avisos.setSnackBar(mensaje, 'success');
  await cargar();
}

const verComprobante = (pagoId: string) => Object.assign(comprobante, { pagoId, visible: true });
const pedirAprobar = (pago: PagoReserva) => Object.assign(aprobar, { pago, visible: true });

async function ejecutarAprobar() {
  const pago = aprobar.pago;
  if (!pago) return;
  trabajando.value = pago.id;
  errorAccion.value = '';
  try {
    const r = await aprobarPago(pago.id);
    aprobar.visible = false;
    await alHacer(r.estado === 'confirmada' && reserva.value?.estado === 'pendiente' ? 'Pago aprobado: la reserva quedó confirmada.' : 'Pago aprobado.');
  } catch (e) {
    aprobar.visible = false;
    errorAccion.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
    await cargar();
  } finally {
    trabajando.value = null;
  }
}

async function copiarEnlace() {
  const enlace = `${sitio.replace(/\/+$/, '')}/reserva/${props.id}`;
  try {
    await navigator.clipboard.writeText(enlace);
    avisos.setSnackBar('Enlace copiado. El cliente puede ver el estado de su reserva y pagar desde ahí.', 'success');
  } catch {
    avisos.setSnackBar(`No se pudo copiar. El enlace es: ${enlace}`, 'warning');
  }
}

onMounted(cargar);
</script>
