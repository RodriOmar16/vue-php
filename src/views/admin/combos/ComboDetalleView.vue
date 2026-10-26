<template>
  <div>
    <v-btn variant="text" prepend-icon="fa-solid fa-arrow-left" :to="{ name: 'admin-combos' }" class="mb-2">Combos</v-btn>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>
    <v-progress-linear v-if="cargando && !combo" indeterminate class="mb-4" />

    <template v-if="combo">
      <div class="d-flex flex-wrap align-center mb-4 ga-2">
        <h1 class="text-h5">{{ combo.nombre }}</h1>
        <v-chip v-if="combo.inhabilitado" size="small" color="warning" variant="tonal">De baja</v-chip>
        <v-spacer />
        <v-btn v-if="puedeEditar" variant="tonal" prepend-icon="fa-solid fa-pen" @click="edicion = true">Editar combo</v-btn>
      </div>
      <p v-if="combo.descripcion" class="text-body-1 mb-4">{{ combo.descripcion }}</p>

      <!-- Resumen -->
      <v-row class="mb-2">
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal"><v-card-text>
            <div class="text-caption">Precio base</div>
            <div class="text-h6" data-testid="resumen-precio">{{ formatearImporte(combo.precioBase) }}</div>
            <div class="text-caption">hasta {{ combo.maxPersonas }} personas · {{ combo.cantidadHoras }} h</div>
          </v-card-text></v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal"><v-card-text>
            <div class="text-caption">Invitado extra</div>
            <div class="text-h6">{{ formatearImporte(combo.precioAdicionalPersona) }}</div>
            <div class="text-caption">por cada persona sobre las {{ combo.maxPersonas }}</div>
          </v-card-text></v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal"><v-card-text>
            <div class="text-caption">Hora extra</div>
            <div class="text-h6">{{ formatearImporte(combo.precioHoraExtra) }}</div>
            <div class="text-caption">cada hora, a tu criterio</div>
          </v-card-text></v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal"><v-card-text>
            <div class="text-caption">Se ofrece en</div>
            <div v-if="combo.salones.length === 0" class="text-body-2">Ningún salón todavía</div>
            <div v-else class="d-flex flex-wrap ga-1 mt-1">
              <v-chip v-for="s in combo.salones" :key="s.id" size="small" :class="{ 'text-decoration-line-through': s.inhabilitado }">{{ s.nombre }}</v-chip>
            </div>
          </v-card-text></v-card>
        </v-col>
      </v-row>

      <!-- Qué incluye -->
      <v-card variant="outlined" class="mb-6">
        <v-card-title class="text-subtitle-1">Qué incluye</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 mb-1">Opciones de menú</div>
              <p v-if="combo.menus.length === 0" class="text-body-2 text-medium-emphasis">Sin menús.</p>
              <template v-else>
                <p class="text-caption text-medium-emphasis mb-1">El cliente elige una; viene incluida en el precio base.</p>
                <ul class="lista">
                  <li v-for="m in combo.menus" :key="m.id" :class="{ 'text-decoration-line-through': m.inhabilitado }">
                    {{ m.nombre }}
                    <span v-if="m.recargo !== null" class="text-caption text-medium-emphasis"> · recargo {{ formatearImporte(m.recargo) }}</span>
                  </li>
                </ul>
              </template>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 mb-1">Instalaciones</div>
              <p v-if="combo.instalaciones.length === 0" class="text-body-2 text-medium-emphasis">Sin instalaciones incluidas.</p>
              <ul v-else class="lista">
                <li v-for="i in combo.instalaciones" :key="i.id" :class="{ 'text-decoration-line-through': i.inhabilitado }">{{ i.nombre }}</li>
              </ul>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 mb-1">Servicios</div>
              <p v-if="combo.servicios.length === 0" class="text-body-2 text-medium-emphasis">Sin servicios incluidos.</p>
              <ul v-else class="lista">
                <li v-for="s in combo.servicios" :key="s.id" :class="{ 'text-decoration-line-through': s.inhabilitado }">{{ s.nombre }}</li>
              </ul>
            </v-col>
          </v-row>
          <p v-if="combo.observaciones" class="text-body-2 mt-4"><strong>Observaciones:</strong> {{ combo.observaciones }}</p>
        </v-card-text>
      </v-card>

      <v-card variant="outlined" class="mb-6">
        <v-card-text><GaleriaMedios tipo="combos" :id="combo.id" :editable="puedeEditar" /></v-card-text>
      </v-card>

      <!-- Tarifas -->
      <div class="d-flex flex-wrap align-center mb-2 ga-2">
        <h2 class="text-h6">Tarifas por día o temporada</h2>
        <v-spacer />
        <v-btn v-if="puedeEditar" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAltaTarifa">Nueva tarifa</v-btn>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cuando una fecha coincide con una tarifa, se usa su precio en lugar del precio base. Útil para fines de semana, feriados o temporada alta.
      </p>
      <v-data-table
        :headers="columnasTarifas"
        :items="tarifas"
        no-data-text="Sin tarifas: siempre rige el precio base del combo."
        items-per-page-text="Filas por página"
        class="mb-6"
      >
        <template #[`item.cuando`]="{ item }">
          <div class="font-weight-medium">{{ describirTarifa(item, combo.salones) }}</div>
        </template>
        <template #[`item.tipo`]="{ item }"><v-chip size="small" variant="tonal">{{ tipoDeTarifa(item) }}</v-chip></template>
        <template #[`item.precioBase`]="{ item }">{{ formatearImporte(item.precioBase) }}</template>
        <template #[`item.precioAdicionalPersona`]="{ item }">
          <span v-if="item.precioAdicionalPersona === null" class="text-medium-emphasis">El del combo</span>
          <span v-else>{{ formatearImporte(item.precioAdicionalPersona) }}</span>
        </template>
        <template #[`item.inhabilitado`]="{ item }">
          <v-chip size="small" :color="item.inhabilitado ? 'warning' : 'success'" variant="tonal">{{ item.inhabilitado ? 'Desactivada' : 'Activa' }}</v-chip>
        </template>
        <template #[`item.acciones`]="{ item }">
          <template v-if="puedeEditar">
            <v-btn variant="text" size="small" :aria-label="`Editar la tarifa ${describirTarifa(item, combo.salones)}`" @click="abrirEdicionTarifa(item)">
              <v-icon>fa-solid fa-pen</v-icon><v-tooltip activator="parent" location="top">Editar</v-tooltip>
            </v-btn>
            <v-btn variant="text" size="small" :aria-label="`${item.inhabilitado ? 'Activar' : 'Desactivar'} la tarifa ${describirTarifa(item, combo.salones)}`" @click="alternarTarifa(item)">
              <v-icon>{{ item.inhabilitado ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on' }}</v-icon>
              <v-tooltip activator="parent" location="top">{{ item.inhabilitado ? 'Activar' : 'Desactivar' }}</v-tooltip>
            </v-btn>
            <v-btn variant="text" size="small" :aria-label="`Eliminar la tarifa ${describirTarifa(item, combo.salones)}`" @click="pedirEliminarTarifa(item)">
              <v-icon>fa-solid fa-trash</v-icon><v-tooltip activator="parent" location="top">Eliminar</v-tooltip>
            </v-btn>
          </template>
        </template>
      </v-data-table>

      <CotizadorCombo :combo="combo" :tarifas="tarifas" />

      <DialogoCombo v-model="edicion" :combo="combo" @guardado="alEditarCombo" />
      <DialogoTarifa v-model="dialogoTarifa.visible" :combo-id="combo.id" :tarifa="dialogoTarifa.tarifa" :salones="combo.salones" @guardada="alGuardarTarifa" />

      <ModalConfirmar
        v-model="eliminar.visible"
        titulo="Eliminar tarifa"
        color="warning"
        icono="fa-solid fa-trash"
        texto-confirmar="Eliminar"
        :mensaje="mensajeEliminar"
        :cargando="trabajando"
        @confirmar="ejecutarEliminarTarifa"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { actualizarTarifa, eliminarTarifa, listarTarifas, obtenerCombo } from '@/api/combos';
import { ApiError } from '@/api/http';
import type { Combo, Tarifa } from '@/api/tipos';
import GaleriaMedios from '@/components/GaleriaMedios.vue';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { describirTarifa, tipoDeTarifa } from '@/utils/combos';
import { formatearImporte } from '@/utils/dinero';
import CotizadorCombo from './CotizadorCombo.vue';
import DialogoCombo from './DialogoCombo.vue';
import DialogoTarifa from './DialogoTarifa.vue';

const props = defineProps<{ id: number }>();

const sesion = useSesionStore();
const avisos = genericosStore();
const puedeEditar = computed(() => sesion.esDueno);

const combo = ref<Combo | null>(null);
const tarifas = ref<Tarifa[]>([]);
const cargando = ref(false);
const trabajando = ref(false);
const errorCarga = ref('');
const edicion = ref(false);

const dialogoTarifa = reactive({ visible: false, tarifa: null as Tarifa | null });
const eliminar = reactive({ visible: false, tarifa: null as Tarifa | null });

const columnasTarifas = [
  { title: 'Cuándo', key: 'cuando', sortable: false },
  { title: 'Tipo', key: 'tipo', sortable: false },
  { title: 'Precio base', key: 'precioBase' },
  { title: 'Invitado extra', key: 'precioAdicionalPersona', sortable: false },
  { title: 'Prioridad', key: 'prioridad', align: 'end' as const },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');
const mensajeEliminar = computed(() =>
  eliminar.tarifa
    ? `Se eliminará la tarifa «${describirTarifa(eliminar.tarifa, combo.value?.salones ?? [])}». Esas fechas volverán a usar el precio base. Las reservas ya hechas conservan el precio que se les cobró.`
    : '',
);

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    [combo.value, tarifas.value] = await Promise.all([obtenerCombo(props.id), listarTarifas(props.id, true)]);
  } catch (e) {
    errorCarga.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

async function recargarTarifas() {
  try {
    tarifas.value = await listarTarifas(props.id, true);
  } catch (e) {
    avisos.setSnackBar(mensajeDe(e), 'error');
  }
}

async function alEditarCombo(nombre: string) {
  avisos.setSnackBar(`Se guardaron los cambios de «${nombre}».`, 'success');
  await cargar();
}

function abrirAltaTarifa() {
  dialogoTarifa.tarifa = null;
  dialogoTarifa.visible = true;
}
function abrirEdicionTarifa(tarifa: Tarifa) {
  dialogoTarifa.tarifa = tarifa;
  dialogoTarifa.visible = true;
}
async function alGuardarTarifa(esNueva: boolean) {
  avisos.setSnackBar(esNueva ? 'Tarifa creada.' : 'Tarifa actualizada.', 'success');
  await recargarTarifas();
}

async function alternarTarifa(tarifa: Tarifa) {
  try {
    await actualizarTarifa(props.id, tarifa.id, { inhabilitado: !tarifa.inhabilitado });
    avisos.setSnackBar(tarifa.inhabilitado ? 'Tarifa activada.' : 'Tarifa desactivada.', 'success');
    await recargarTarifas();
  } catch (e) {
    avisos.setSnackBar(mensajeDe(e), 'error');
  }
}

function pedirEliminarTarifa(tarifa: Tarifa) {
  eliminar.tarifa = tarifa;
  eliminar.visible = true;
}
async function ejecutarEliminarTarifa() {
  const tarifa = eliminar.tarifa;
  if (!tarifa) return;
  trabajando.value = true;
  try {
    await eliminarTarifa(props.id, tarifa.id);
    eliminar.visible = false;
    avisos.setSnackBar('Tarifa eliminada.', 'success');
    await recargarTarifas();
  } catch (e) {
    eliminar.visible = false;
    avisos.setSnackBar(mensajeDe(e), 'error');
  } finally {
    trabajando.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.lista {
  padding-left: 1.2rem;
}
</style>
