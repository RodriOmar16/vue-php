<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-2 ga-2">
      <h1 class="text-h5">Cierres y feriados</h1>
      <v-spacer />
      <v-select
        v-model="filtroSalon"
        :items="opcionesFiltro"
        item-title="titulo"
        item-value="valor"
        label="Mostrar"
        density="compact"
        hide-details
        class="filtro"
        @update:model-value="cargar"
      />
      <v-switch v-model="verPasados" label="Incluir pasados" color="primary" hide-details density="compact" @update:model-value="cargar" />
      <v-btn v-if="puedeEditar" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAlta">Nuevo cierre</v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Días u horas en los que el salón no recibe eventos (feriados, mantenimiento, un evento propio...). Se interpretan en el horario de tu salón ({{ zona }}).
    </p>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="bloqueos"
      :loading="cargando"
      no-data-text="No hay cierres cargados."
      items-per-page-text="Filas por página"
    >
      <template #[`item.salonId`]="{ item }">
        <v-chip size="small" variant="tonal" :color="item.salonId === null ? 'primary' : undefined">{{ nombreSalon(item.salonId) }}</v-chip>
      </template>
      <template #[`item.desde`]="{ item }">{{ describirRango(item.desde, item.hasta, zona) }}</template>
      <template #[`item.motivo`]="{ item }">{{ item.motivo || '—' }}</template>
      <template #[`item.acciones`]="{ item }">
        <template v-if="puedeEditar">
          <v-btn variant="text" size="small" :aria-label="`Editar el cierre ${item.motivo ?? item.id}`" @click="abrirEdicion(item)">
            <v-icon>fa-solid fa-pen</v-icon>
            <v-tooltip activator="parent" location="top">Editar</v-tooltip>
          </v-btn>
          <v-btn variant="text" size="small" :aria-label="`Quitar el cierre ${item.motivo ?? item.id}`" @click="pedirEliminar(item)">
            <v-icon>fa-solid fa-trash</v-icon>
            <v-tooltip activator="parent" location="top">Quitar</v-tooltip>
          </v-btn>
        </template>
      </template>
    </v-data-table>

    <DialogoBloqueo v-model="dialogo.visible" :bloqueo="dialogo.bloqueo" :salones="salonesActivos" :zona="zona" @guardado="alGuardar" />

    <ModalConfirmar
      v-model="confirmarEliminar.visible"
      titulo="Quitar cierre"
      color="warning"
      icono="fa-solid fa-trash"
      texto-confirmar="Quitar"
      :cargando="trabajando"
      @confirmar="ejecutarEliminar"
    >
      <template v-if="confirmarEliminar.bloqueo">
        Se quitará el cierre <strong>{{ describirRango(confirmarEliminar.bloqueo.desde, confirmarEliminar.bloqueo.hasta, zona) }}</strong>
        ({{ nombreSalon(confirmarEliminar.bloqueo.salonId) }}). Esos días y horas volverán a poder reservarse.
      </template>
    </ModalConfirmar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { eliminarBloqueo, listarBloqueos } from '@/api/bloqueos';
import { listarSalones } from '@/api/salones';
import { ApiError } from '@/api/http';
import type { Bloqueo, Salon } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { describirRango } from '@/utils/zonaHoraria';
import DialogoBloqueo from './DialogoBloqueo.vue';

const sesion = useSesionStore();
const avisos = genericosStore();
const puedeEditar = computed(() => sesion.esDueno);
const zona = computed(() => sesion.usuario?.empresa?.zonaHoraria ?? 'America/Argentina/Buenos_Aires');

const columnas = [
  { title: 'Alcance', key: 'salonId' },
  { title: 'Cuándo', key: 'desde' },
  { title: 'Motivo', key: 'motivo', sortable: false },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const bloqueos = ref<Bloqueo[]>([]);
const salones = ref<Salon[]>([]);
const filtroSalon = ref<number | null>(null);
const verPasados = ref(false);
const cargando = ref(false);
const trabajando = ref(false);
const errorCarga = ref('');

const salonesActivos = computed(() => salones.value.filter((s) => !s.inhabilitado));
const opcionesFiltro = computed(() => [
  { titulo: 'Todos los salones', valor: null as number | null },
  ...salones.value.map((s) => ({ titulo: s.nombre, valor: s.id as number | null })),
]);
const nombreSalon = (id: number | null) =>
  id === null ? 'Todos los salones' : (salones.value.find((s) => s.id === id)?.nombre ?? `Salón ${id}`);

const dialogo = reactive({ visible: false, bloqueo: null as Bloqueo | null });
const confirmarEliminar = reactive({ visible: false, bloqueo: null as Bloqueo | null });

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const [listaSalones, listaBloqueos] = await Promise.all([
      listarSalones(true),
      listarBloqueos({
        ...(filtroSalon.value !== null && { salonId: filtroSalon.value }),
        // sin «incluir pasados» solo se piden los que todavía no terminaron
        ...(!verPasados.value && { desde: new Date().toISOString() }),
      }),
    ]);
    salones.value = listaSalones;
    bloqueos.value = listaBloqueos;
  } catch (e) {
    errorCarga.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

function abrirAlta() {
  dialogo.bloqueo = null;
  dialogo.visible = true;
}
function abrirEdicion(bloqueo: Bloqueo) {
  dialogo.bloqueo = bloqueo;
  dialogo.visible = true;
}
async function alGuardar(esNuevo: boolean) {
  avisos.setSnackBar(esNuevo ? 'Cierre creado.' : 'Cierre actualizado.', 'success');
  await cargar();
}

function pedirEliminar(bloqueo: Bloqueo) {
  confirmarEliminar.bloqueo = bloqueo;
  confirmarEliminar.visible = true;
}
async function ejecutarEliminar() {
  const bloqueo = confirmarEliminar.bloqueo;
  if (!bloqueo) return;
  trabajando.value = true;
  try {
    await eliminarBloqueo(bloqueo.id);
    confirmarEliminar.visible = false;
    avisos.setSnackBar('Cierre quitado.', 'success');
    await cargar();
  } catch (e) {
    confirmarEliminar.visible = false;
    avisos.setSnackBar(mensajeDe(e), 'error');
  } finally {
    trabajando.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.filtro {
  max-width: 240px;
}
</style>
