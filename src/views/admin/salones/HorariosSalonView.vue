<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-2 ga-2">
      <v-btn variant="text" prepend-icon="fa-solid fa-arrow-left" :to="{ name: 'admin-salones' }">Salones</v-btn>
    </div>
    <h1 class="text-h5 mb-1">Horarios{{ salon ? ` de ${salon.nombre}` : '' }}</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Indicá en qué horarios recibe eventos este salón cada día de la semana. Un día sin horarios figura como cerrado.
      Para feriados o cierres puntuales usá <router-link :to="{ name: 'admin-bloqueos' }">Cierres</router-link>.
    </p>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>
    <v-progress-linear v-if="cargando" indeterminate class="mb-4" />

    <v-card v-if="!errorCarga" variant="outlined">
      <v-list lines="two">
        <template v-for="(dia, indice) in DIAS_SEMANA" :key="dia.valor">
          <v-divider v-if="indice > 0" />
          <v-list-item :data-testid="`dia-${dia.valor}`">
            <template #title>
              <span class="font-weight-medium">{{ dia.nombre }}</span>
            </template>
            <template #subtitle>
              <div v-if="porDia.get(dia.valor)!.length === 0" class="text-medium-emphasis">Cerrado</div>
              <div v-else class="d-flex flex-wrap ga-2 mt-1">
                <v-chip v-for="f in porDia.get(dia.valor)" :key="f.id" label size="default" variant="tonal" color="primary">
                  {{ etiquetaFranja(f) }}
                  <template v-if="puedeEditar">
                    <v-btn icon size="x-small" variant="text" class="ml-1" :aria-label="`Editar el horario del ${dia.nombre} ${f.horaInicio}`" @click="abrirEdicion(f)">
                      <v-icon size="small">fa-solid fa-pen</v-icon>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" :aria-label="`Quitar el horario del ${dia.nombre} ${f.horaInicio}`" @click="pedirEliminar(f)">
                      <v-icon size="small">fa-solid fa-xmark</v-icon>
                    </v-btn>
                  </template>
                </v-chip>
              </div>
            </template>
            <template v-if="puedeEditar" #append>
              <v-btn variant="text" size="small" prepend-icon="fa-solid fa-plus" :aria-label="`Agregar un horario el ${dia.nombre}`" @click="abrirAlta(dia.valor)">
                Agregar
              </v-btn>
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-card>

    <DialogoFranja
      v-model="dialogo.visible"
      :salon-id="idSalon"
      :franja="dialogo.franja"
      :dia-inicial="dialogo.dia"
      @guardada="alGuardar"
    />

    <ModalConfirmar
      v-model="confirmarEliminar.visible"
      titulo="Quitar horario"
      color="warning"
      icono="fa-solid fa-trash"
      texto-confirmar="Quitar"
      :cargando="trabajando"
      @confirmar="ejecutarEliminar"
    >
      <template v-if="confirmarEliminar.franja">
        Se quitará el horario del <strong>{{ nombreDia(confirmarEliminar.franja.diaSemana) }}</strong>
        ({{ etiquetaFranja(confirmarEliminar.franja) }}). Las reservas ya hechas no se modifican.
      </template>
    </ModalConfirmar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { eliminarFranja, listarFranjas, obtenerSalon } from '@/api/salones';
import { ApiError } from '@/api/http';
import type { Franja, Salon } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { DIAS_SEMANA, etiquetaFranja, franjasPorDia, nombreDia } from '@/utils/horarios';
import DialogoFranja from './DialogoFranja.vue';

const props = defineProps<{ id: number }>();
const idSalon = computed(() => props.id);

const sesion = useSesionStore();
const avisos = genericosStore();
const puedeEditar = computed(() => sesion.esDueno);

const salon = ref<Salon | null>(null);
const franjas = ref<Franja[]>([]);
const cargando = ref(false);
const trabajando = ref(false);
const errorCarga = ref('');

const porDia = computed(() => franjasPorDia(franjas.value));

const dialogo = reactive({ visible: false, franja: null as Franja | null, dia: undefined as number | undefined });
const confirmarEliminar = reactive({ visible: false, franja: null as Franja | null });

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    [salon.value, franjas.value] = await Promise.all([obtenerSalon(idSalon.value), listarFranjas(idSalon.value)]);
  } catch (e) {
    errorCarga.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

function abrirAlta(dia: number) {
  dialogo.franja = null;
  dialogo.dia = dia;
  dialogo.visible = true;
}
function abrirEdicion(franja: Franja) {
  dialogo.franja = franja;
  dialogo.dia = undefined;
  dialogo.visible = true;
}
async function alGuardar() {
  avisos.setSnackBar('Horarios actualizados.', 'success');
  try {
    franjas.value = await listarFranjas(idSalon.value);
  } catch (e) {
    avisos.setSnackBar(mensajeDe(e), 'error');
  }
}

function pedirEliminar(franja: Franja) {
  confirmarEliminar.franja = franja;
  confirmarEliminar.visible = true;
}
async function ejecutarEliminar() {
  const franja = confirmarEliminar.franja;
  if (!franja) return;
  trabajando.value = true;
  try {
    await eliminarFranja(idSalon.value, franja.id);
    confirmarEliminar.visible = false;
    avisos.setSnackBar('Horario quitado.', 'success');
    franjas.value = await listarFranjas(idSalon.value);
  } catch (e) {
    confirmarEliminar.visible = false;
    avisos.setSnackBar(mensajeDe(e), 'error');
  } finally {
    trabajando.value = false;
  }
}

onMounted(cargar);
</script>
