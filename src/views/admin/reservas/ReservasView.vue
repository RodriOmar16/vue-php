<template>
  <div>
    <h1 class="text-h5 mb-1">Reservas</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Las reservas que hacen tus clientes. Entrá a cada una para revisar los comprobantes de pago y confirmarla.
    </p>

    <v-alert v-if="resumen && resumen.comprobantesPorRevisar > 0" type="warning" variant="tonal" class="mb-4" data-testid="aviso-comprobantes">
      Tenés <strong>{{ resumen.comprobantesPorRevisar }}</strong>
      {{ resumen.comprobantesPorRevisar === 1 ? 'comprobante' : 'comprobantes' }} de pago para revisar.
      <template #append><v-btn variant="text" @click="verPendientesDeRevision">Ver cuáles</v-btn></template>
    </v-alert>
    <v-alert v-if="resumen && resumen.reembolsosPendientes > 0" type="error" variant="tonal" class="mb-4" data-testid="aviso-reembolsos">
      Hay <strong>{{ resumen.reembolsosPendientes }}</strong>
      {{ resumen.reembolsosPendientes === 1 ? 'reembolso' : 'reembolsos' }} de dinero para devolverle a clientes.
      <template #append><v-btn variant="text" @click="verCanceladas">Ver cuáles</v-btn></template>
    </v-alert>

    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-select v-model="filtro.estado" :items="opcionesEstado" item-title="titulo" item-value="valor" label="Estado" hide-details clearable />
          </v-col>
          <v-col cols="6" md="2"><v-text-field v-model="filtro.desde" label="Evento desde" type="date" hide-details /></v-col>
          <v-col cols="6" md="2"><v-text-field v-model="filtro.hasta" label="Evento hasta" type="date" hide-details /></v-col>
          <v-col cols="12" md="3">
            <v-select v-if="salones.length > 1" v-model="filtro.salonId" :items="salones" item-title="nombre" item-value="id" label="Salón" hide-details clearable />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="busqueda" label="Buscar por nombre, DNI o email" prepend-inner-icon="fa-solid fa-magnifying-glass" hide-details clearable />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">
      {{ error }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table-server
      v-model:items-per-page="porPagina"
      v-model:page="pagina"
      :headers="columnas"
      :items="items"
      :items-length="total"
      :loading="cargando"
      no-data-text="No hay reservas con esos filtros."
      items-per-page-text="Filas por página"
      :items-per-page-options="[10, 20, 50]"
    >
      <template #[`item.fecha`]="{ item }">
        <router-link :to="{ name: 'admin-reserva-detalle', params: { id: item.id } }" class="font-weight-medium">
          {{ fechaCorta(item.fecha) }}
        </router-link>
        <div class="text-caption text-medium-emphasis">{{ item.horaInicio }} a {{ item.horaFin }}</div>
      </template>
      <template #[`item.salon`]="{ item }">
        {{ item.salon.nombre }}
        <div class="text-caption text-medium-emphasis">{{ item.combo }} · {{ item.invitados }} invitados</div>
      </template>
      <template #[`item.cliente`]="{ item }">
        {{ item.cliente.nombre }}
        <div class="text-caption text-medium-emphasis">DNI {{ item.cliente.dni }}</div>
      </template>
      <template #[`item.total`]="{ item }">
        <div class="font-weight-medium">{{ formatearImporte(item.total) }}</div>
        <div class="text-caption text-medium-emphasis">pagado {{ formatearImporte(item.pagado) }}</div>
      </template>
      <template #[`item.estado`]="{ item }">
        <v-chip size="small" :color="COLOR_ESTADO_RESERVA[item.estado]" variant="tonal">{{ ETIQUETA_ESTADO_RESERVA[item.estado] }}</v-chip>
        <v-chip v-if="item.pagosEnRevision > 0" size="x-small" color="warning" variant="flat" class="ml-1" :data-testid="`revision-${item.id}`">
          {{ item.pagosEnRevision }} por revisar
        </v-chip>
        <v-chip v-if="Number(item.reembolsoPendiente) > 0" size="x-small" color="error" variant="flat" class="ml-1" :data-testid="`reembolso-${item.id}`">
          devolver {{ formatearImporte(item.reembolsoPendiente) }}
        </v-chip>
      </template>
      <template #[`item.acciones`]="{ item }">
        <v-btn variant="text" size="small" :aria-label="`Ver la reserva del ${fechaCorta(item.fecha)} de ${item.cliente.nombre}`" :to="{ name: 'admin-reserva-detalle', params: { id: item.id } }">
          <v-icon>fa-solid fa-eye</v-icon><v-tooltip activator="parent" location="top">Ver detalle</v-tooltip>
        </v-btn>
      </template>
    </v-data-table-server>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { listarReservas, resumenReservas } from '@/api/reservas';
import { listarSalones } from '@/api/salones';
import { ApiError } from '@/api/http';
import {
  COLOR_ESTADO_RESERVA,
  ETIQUETA_ESTADO_RESERVA,
  type EstadoReserva,
  type ReservaListada,
  type ResumenReservas,
  type Salon,
} from '@/api/tipos';
import { fechaCorta } from '@/utils/combos';
import { formatearImporte } from '@/utils/dinero';

const columnas = [
  { title: 'Evento', key: 'fecha', sortable: false },
  { title: 'Salón y combo', key: 'salon', sortable: false },
  { title: 'Cliente', key: 'cliente', sortable: false },
  { title: 'Total', key: 'total', sortable: false },
  { title: 'Estado', key: 'estado', sortable: false },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];
const opcionesEstado = (Object.keys(ETIQUETA_ESTADO_RESERVA) as EstadoReserva[]).map((valor) => ({ valor, titulo: ETIQUETA_ESTADO_RESERVA[valor] }));

const filtro = reactive({ estado: null as EstadoReserva | null, desde: '', hasta: '', salonId: null as number | null });
const busqueda = ref('');
const pagina = ref(1);
const porPagina = ref(20);

const items = ref<ReservaListada[]>([]);
const total = ref(0);
const cargando = ref(false);
const error = ref('');
const salones = ref<Salon[]>([]);
const resumen = ref<ResumenReservas | null>(null);

// Cada consulta lleva un número: si cambian los filtros rápido, una respuesta lenta no pisa a la actual.
let orden = 0;
async function cargar() {
  const mia = ++orden;
  cargando.value = true;
  error.value = '';
  try {
    const r = await listarReservas({
      ...(filtro.estado && { estado: filtro.estado }),
      ...(filtro.desde && { desde: filtro.desde }),
      ...(filtro.hasta && { hasta: filtro.hasta }),
      ...(filtro.salonId && { salonId: filtro.salonId }),
      ...(busqueda.value?.trim() && { q: busqueda.value.trim() }),
      pagina: pagina.value,
      limite: porPagina.value,
    });
    if (mia !== orden) return;
    items.value = r.items;
    total.value = r.total;
  } catch (e) {
    if (mia === orden) error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    if (mia === orden) cargando.value = false;
  }
}

// Al cambiar un filtro se vuelve a la primera página; la búsqueda espera a que se deje de escribir.
let temporizador: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [filtro.estado, filtro.desde, filtro.hasta, filtro.salonId, busqueda.value],
  () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      if (pagina.value !== 1) pagina.value = 1; // dispara la carga por el watch de abajo
      else void cargar();
    }, 300);
  },
);
watch([pagina, porPagina], cargar);

function verPendientesDeRevision() {
  filtro.estado = 'pendiente';
}
function verCanceladas() {
  filtro.estado = 'cancelada';
}

onMounted(async () => {
  void cargar();
  try {
    [resumen.value, salones.value] = await Promise.all([resumenReservas(), listarSalones(false)]);
  } catch {
    /* el aviso y el filtro de salón son un extra: la lista funciona sin ellos */
  }
});
</script>
