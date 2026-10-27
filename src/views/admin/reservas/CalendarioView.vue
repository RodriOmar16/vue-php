<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h5 mr-auto">Calendario</h1>
      <v-select
        v-if="salones.length > 1"
        v-model="salonId"
        :items="salones"
        item-title="nombre"
        item-value="id"
        label="Salón"
        density="compact"
        hide-details
        clearable
        style="max-width: 240px"
      />
      <v-switch v-model="verInactivas" label="Mostrar canceladas y vencidas" density="compact" hide-details color="primary" />
      <v-btn-toggle v-model="vista" mandatory density="compact" variant="outlined" divided aria-label="Tipo de vista" data-testid="selector-vista">
        <v-btn value="mes">Mes</v-btn>
        <v-btn value="semana">Semana</v-btn>
      </v-btn-toggle>
    </div>

    <div class="d-flex align-center ga-2 mb-3">
      <v-btn icon variant="text" :aria-label="vista === 'mes' ? 'Mes anterior' : 'Semana anterior'" @click="ir(-1)"><v-icon>fa-solid fa-chevron-left</v-icon></v-btn>
      <h2 v-if="vista === 'mes'" class="text-h6 text-capitalize flex-grow-1 text-center" aria-live="polite" data-testid="titulo-mes">{{ nombreDelMes(anio, mes) }}</h2>
      <h2 v-else class="text-h6 flex-grow-1 text-center" aria-live="polite" data-testid="titulo-semana">{{ tituloDeSemana(lunes) }}</h2>
      <v-btn icon variant="text" :aria-label="vista === 'mes' ? 'Mes siguiente' : 'Semana siguiente'" @click="ir(1)"><v-icon>fa-solid fa-chevron-right</v-icon></v-btn>
      <v-btn variant="tonal" @click="irAHoy">Hoy</v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">
      {{ error }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-progress-linear v-if="cargando" indeterminate class="mb-2" />

    <!-- Semana con las horas en vertical (pantallas medianas y grandes) -->
    <CalendarioSemana
      v-if="vista === 'semana' && !movil"
      :dias="diasSemana"
      :reservas="reservas"
      :cierres="cierres"
      :zona="zona"
      :hoy="hoy"
      :ahora="ahora"
      :ver-inactivas="verInactivas"
      @abrir-dia="abrirDia"
    />

    <!-- Grilla del mes (pantallas medianas y grandes) -->
    <div v-else-if="vista === 'mes' && !movil" class="calendario" role="grid" :aria-label="`Calendario de ${nombreDelMes(anio, mes)}`" data-testid="grilla">
      <div class="calendario__fila" role="row">
        <div v-for="d in DIAS" :key="d" class="calendario__cabecera" role="columnheader">{{ d }}</div>
      </div>
      <div v-for="(semana, i) in semanas" :key="i" class="calendario__fila" role="row">
        <div
          v-for="dia in semana"
          :key="dia"
          class="calendario__celda"
          :class="{ 'calendario__celda--otro': !delMes(dia), 'calendario__celda--hoy': dia === hoy }"
          role="gridcell"
          :data-testid="`dia-${dia}`"
        >
          <button type="button" class="calendario__numero" :aria-label="`Ver el ${formatearDia(dia)}`" @click="abrirDia(dia)">{{ Number(dia.slice(8)) }}</button>
          <div v-for="c in cierresDe(dia)" :key="`c${c.id}`" class="calendario__cierre text-caption" :title="c.motivo ?? 'Cerrado'" data-testid="cierre">
            <v-icon size="x-small">fa-solid fa-ban</v-icon> {{ c.motivo || 'Cerrado' }}
          </div>
          <router-link
            v-for="r in reservasDe(dia).slice(0, MAX_POR_DIA)"
            :key="r.id"
            :to="{ name: 'admin-reserva-detalle', params: { id: r.id } }"
            class="calendario__reserva text-caption"
            :class="`calendario__reserva--${r.estado}`"
            :title="`${r.horaInicio} a ${r.horaFin} · ${r.cliente.nombre} · ${ETIQUETA_ESTADO_RESERVA[r.estado]}`"
            data-testid="reserva"
          >
            <strong>{{ r.horaInicio }}</strong> {{ r.cliente.nombre }}
          </router-link>
          <button v-if="reservasDe(dia).length > MAX_POR_DIA" type="button" class="calendario__mas text-caption" @click="abrirDia(dia)">
            +{{ reservasDe(dia).length - MAX_POR_DIA }} más
          </button>
        </div>
      </div>
    </div>

    <!-- Celular: lista de los días que tienen algo (en las dos vistas) -->
    <div v-else data-testid="lista-movil">
      <v-list v-if="diasConAlgo.length" lines="two">
        <template v-for="dia in diasConAlgo" :key="dia">
          <v-list-subheader class="text-capitalize">{{ formatearDia(dia) }}<v-chip v-if="dia === hoy" size="x-small" color="primary" class="ml-2">hoy</v-chip></v-list-subheader>
          <v-list-item v-for="c in cierresDe(dia)" :key="`c${c.id}`" prepend-icon="fa-solid fa-ban" :title="c.motivo || 'Cerrado'" subtitle="Cierre" />
          <v-list-item v-for="r in reservasDe(dia)" :key="r.id" :to="{ name: 'admin-reserva-detalle', params: { id: r.id } }" :title="`${r.horaInicio} · ${r.cliente.nombre}`" :subtitle="`${r.salon.nombre} · ${ETIQUETA_ESTADO_RESERVA[r.estado]}`" />
        </template>
      </v-list>
      <p v-else-if="!cargando" class="text-medium-emphasis text-center my-6">No hay reservas ni cierres {{ vista === 'mes' ? 'este mes' : 'esta semana' }}.</p>
    </div>

    <v-dialog v-model="dia.visible" max-width="560" scrollable>
      <v-card v-if="dia.fecha">
        <v-card-title class="text-capitalize">{{ formatearDia(dia.fecha) }}</v-card-title>
        <v-card-text>
          <v-alert v-for="c in cierresDe(dia.fecha)" :key="c.id" type="warning" variant="tonal" density="compact" class="mb-2">
            Cerrado<template v-if="c.salonId"> ({{ nombreSalon(c.salonId) }})</template><template v-else> (todos los salones)</template>: {{ c.motivo || 'sin motivo' }}
          </v-alert>
          <p v-if="!reservasDe(dia.fecha).length" class="text-medium-emphasis" data-testid="dia-vacio">No hay reservas este día.</p>
          <v-list v-else lines="three">
            <v-list-item v-for="r in reservasDe(dia.fecha)" :key="r.id" :to="{ name: 'admin-reserva-detalle', params: { id: r.id } }" data-testid="reserva-dia">
              <v-list-item-title>{{ r.horaInicio }} a {{ r.horaFin }} · {{ r.cliente.nombre }}</v-list-item-title>
              <v-list-item-subtitle>{{ r.salon.nombre }} · {{ r.combo }} · {{ r.invitados }} invitados</v-list-item-subtitle>
              <v-list-item-subtitle>
                <v-chip size="x-small" :color="COLOR_ESTADO_RESERVA[r.estado]" variant="tonal">{{ ETIQUETA_ESTADO_RESERVA[r.estado] }}</v-chip>
                <span v-if="Number(r.saldo) > 0 && ['pendiente', 'confirmada'].includes(r.estado)" class="ml-2">Falta cobrar {{ formatearImporte(r.saldo) }}</span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="justify-end"><v-btn variant="text" @click="dia.visible = false">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { listarBloqueos } from '@/api/bloqueos';
import { ApiError } from '@/api/http';
import { listarReservas } from '@/api/reservas';
import { listarSalones } from '@/api/salones';
import { COLOR_ESTADO_RESERVA, ETIQUETA_ESTADO_RESERVA, type Bloqueo, type ReservaListada, type Salon } from '@/api/tipos';
import { useSesionStore } from '@/store/sesion';
import CalendarioSemana from './CalendarioSemana.vue';
import { agruparCierresPorDia, agruparReservasPorDia, moverMes, nombreDelMes, primerDiaDelMes, rangoDeGrilla, semanasDelMes } from '@/utils/calendario';
import { diasDeSemana, lunesDeSemana, rangoDeSemana, tituloDeSemana } from '@/utils/semana';
import { formatearImporte } from '@/utils/dinero';
import { formatearDia, isoALocal, localAIso, sumarDias } from '@/utils/zonaHoraria';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_POR_DIA = 3;
const POR_PAGINA = 100;

const sesion = useSesionStore();
const zona = computed(() => sesion.usuario?.empresa?.zonaHoraria ?? 'America/Argentina/Buenos_Aires');
const { xs } = useDisplay();
const movil = computed(() => xs.value);

const hoyLocal = () => isoALocal(new Date().toISOString(), zona.value).slice(0, 10);
const hoy = ref(hoyLocal());
const anio = ref(Number(hoy.value.slice(0, 4)));
const mes = ref(Number(hoy.value.slice(5, 7)));

const vista = ref<'mes' | 'semana'>('mes');
/** lunes de la semana que se muestra (vista semanal) */
const lunes = ref(lunesDeSemana(hoy.value));
/** el «ahora» de la línea roja de la semana; se refresca cada minuto */
const ahora = ref(new Date());
let reloj: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  reloj = setInterval(() => (ahora.value = new Date()), 60_000);
});
onBeforeUnmount(() => clearInterval(reloj));

const salones = ref<Salon[]>([]);
const salonId = ref<number | null>(null);
const verInactivas = ref(false);

const reservas = ref<ReservaListada[]>([]);
const cierres = ref<Bloqueo[]>([]);
const cargando = ref(false);
const error = ref('');
let pedido = 0;

const semanas = computed(() => semanasDelMes(anio.value, mes.value));
const rango = computed(() => (vista.value === 'mes' ? rangoDeGrilla(anio.value, mes.value) : rangoDeSemana(lunes.value)));
const diasSemana = computed(() => diasDeSemana(lunes.value));
const delMes = (fecha: string) => Number(fecha.slice(5, 7)) === mes.value;

const porDia = computed(() => agruparReservasPorDia(reservas.value, verInactivas.value));
const cierresPorDia = computed(() => agruparCierresPorDia(cierres.value, zona.value, rango.value.desde, rango.value.hasta));
const reservasDe = (fecha: string) => porDia.value.get(fecha) ?? [];
const cierresDe = (fecha: string) => cierresPorDia.value.get(fecha) ?? [];
// días que se listan en el celular: los del mes (sin los de los meses vecinos) o los 7 de la semana
const diasListados = computed(() => (vista.value === 'mes' ? semanas.value.flat().filter(delMes) : diasSemana.value));
const diasConAlgo = computed(() => diasListados.value.filter((d) => reservasDe(d).length > 0 || cierresDe(d).length > 0));
const nombreSalon = (id: number) => salones.value.find((s) => s.id === id)?.nombre ?? 'salón';

const dia = reactive({ visible: false, fecha: '' });
const abrirDia = (fecha: string) => {
  dia.fecha = fecha;
  dia.visible = true;
};

function ir(delta: number) {
  if (vista.value === 'mes') ({ anio: anio.value, mes: mes.value } = moverMes(anio.value, mes.value, delta));
  else lunes.value = sumarDias(lunes.value, 7 * delta);
}
function irAHoy() {
  hoy.value = hoyLocal();
  anio.value = Number(hoy.value.slice(0, 4));
  mes.value = Number(hoy.value.slice(5, 7));
  lunes.value = lunesDeSemana(hoy.value);
}

// Al cambiar de vista se conserva el "dónde estaba": del mes a la semana de hoy (o la primera del mes si hoy no está en él);
// de la semana al mes en que cae su jueves (la mayoría de sus días).
watch(vista, (nueva) => {
  if (nueva === 'semana') {
    const hoyEnElMes = Number(hoy.value.slice(0, 4)) === anio.value && Number(hoy.value.slice(5, 7)) === mes.value;
    lunes.value = lunesDeSemana(hoyEnElMes ? hoy.value : primerDiaDelMes(anio.value, mes.value));
  } else {
    const jueves = sumarDias(lunes.value, 3);
    anio.value = Number(jueves.slice(0, 4));
    mes.value = Number(jueves.slice(5, 7));
  }
});

/** Trae TODAS las reservas del rango, página por página (la API devuelve hasta 100 por vez). */
async function reservasDelRango(desde: string, hasta: string, salon?: number) {
  const todas: ReservaListada[] = [];
  for (let pagina = 1; ; pagina++) {
    const r = await listarReservas({ desde, hasta, pagina, limite: POR_PAGINA, ...(salon && { salonId: salon }) });
    todas.push(...r.items);
    if (todas.length >= r.total || r.items.length === 0) return todas;
  }
}

async function cargar() {
  const numero = ++pedido;
  const { desde, hasta } = rango.value;
  const salon = salonId.value ?? undefined;
  cargando.value = true;
  error.value = '';
  try {
    const [res, cie] = await Promise.all([
      reservasDelRango(desde, hasta, salon),
      listarBloqueos({ ...(salon && { salonId: salon }), desde: localAIso(`${desde}T00:00`, zona.value), hasta: localAIso(`${sumarDias(hasta, 1)}T00:00`, zona.value) }),
    ]);
    if (numero !== pedido) return; // llegó tarde: ya se pidió otro mes
    reservas.value = res;
    cierres.value = cie;
  } catch (e) {
    if (numero !== pedido) return;
    error.value = e instanceof ApiError ? e.message : 'No se pudo cargar el calendario.';
  } finally {
    if (numero === pedido) cargando.value = false;
  }
}

watch([anio, mes, lunes, vista, salonId], cargar);
onMounted(async () => {
  try {
    salones.value = (await listarSalones(false)).filter((s) => !s.inhabilitado);
  } catch {
    /* el filtro de salón es un extra */
  }
  await cargar();
});
</script>

<style scoped>
.calendario {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
}
.calendario__fila {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.calendario__cabecera {
  padding: 6px;
  text-align: center;
  font-weight: 600;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.calendario__celda {
  min-height: 110px;
  padding: 4px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.calendario__celda:nth-child(7n + 1) {
  border-left: none;
}
.calendario__celda--otro {
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.calendario__celda--hoy .calendario__numero {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.calendario__numero {
  align-self: flex-start;
  min-width: 26px;
  height: 26px;
  border-radius: 13px;
  font-weight: 600;
  cursor: pointer;
}
.calendario__reserva {
  display: block;
  padding: 1px 6px;
  border-radius: 4px;
  text-decoration: none;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgba(var(--v-theme-secondary), 0.2);
}
.calendario__reserva--confirmada {
  background: rgba(var(--v-theme-success), 0.25);
}
.calendario__reserva--pendiente {
  background: rgba(var(--v-theme-warning), 0.3);
}
.calendario__reserva--cancelada {
  background: rgba(var(--v-theme-error), 0.15);
  text-decoration: line-through;
}
.calendario__cierre {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.calendario__mas {
  align-self: flex-start;
  padding: 0 6px;
  cursor: pointer;
  color: rgb(var(--v-theme-primary));
}
</style>
