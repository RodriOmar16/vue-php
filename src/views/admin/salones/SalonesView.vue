<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <h1 class="text-h5">Salones</h1>
      <v-spacer />
      <v-switch
        v-model="verBajas"
        label="Mostrar dados de baja"
        color="primary"
        hide-details
        density="compact"
        @update:model-value="cargar"
      />
      <v-btn v-if="puedeEditar" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAlta">Nuevo salón</v-btn>
    </div>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-progress-linear v-if="cargando" indeterminate class="mb-4" />

    <v-card v-if="!cargando && !errorCarga && salones.length === 0" variant="tonal">
      <v-card-text class="text-center py-8">
        <p class="mb-2">Todavía no hay salones.</p>
        <p v-if="puedeEditar" class="text-medium-emphasis">Creá el primero con «Nuevo salón»: es lo que van a elegir tus clientes.</p>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col v-for="salon in salones" :key="salon.id" cols="12" md="6" lg="4">
        <v-card :class="{ 'opacity-60': salon.inhabilitado }" height="100%" class="d-flex flex-column">
          <v-card-title class="d-flex align-center flex-wrap ga-1">
            <span class="mr-1">{{ salon.nombre }}</span>
            <v-chip v-if="salon.esDefault" size="small" color="primary" variant="tonal" prepend-icon="fa-solid fa-star">Principal</v-chip>
            <v-chip v-if="salon.inhabilitado" size="small" color="warning" variant="tonal">De baja</v-chip>
          </v-card-title>
          <v-card-subtitle>
            <span v-if="salon.capacidad">Hasta {{ salon.capacidad }} personas · </span>
            <span>{{ salon.minutosLimpieza ? `${salon.minutosLimpieza} min de limpieza` : 'Sin margen de limpieza' }}</span>
          </v-card-subtitle>
          <v-card-text class="flex-grow-1">
            <p v-if="salon.descripcion" class="text-body-2">{{ salon.descripcion }}</p>
            <p v-else class="text-body-2 text-medium-emphasis">Sin descripción.</p>
          </v-card-text>
          <v-card-actions class="flex-wrap">
            <v-btn variant="tonal" size="small" prepend-icon="fa-solid fa-clock" :to="{ name: 'admin-salon-horarios', params: { id: salon.id } }">
              Horarios
            </v-btn>
            <v-spacer />
            <template v-if="puedeEditar">
              <v-btn
                v-if="!salon.esDefault && !salon.inhabilitado"
                variant="text"
                size="small"
                :aria-label="`Marcar ${salon.nombre} como principal`"
                @click="marcarPrincipal(salon)"
              >
                <v-icon>fa-regular fa-star</v-icon>
                <v-tooltip activator="parent" location="top">Marcar como principal</v-tooltip>
              </v-btn>
              <v-btn variant="text" size="small" :aria-label="`Editar ${salon.nombre}`" @click="abrirEdicion(salon)">
                <v-icon>fa-solid fa-pen</v-icon>
                <v-tooltip activator="parent" location="top">Editar</v-tooltip>
              </v-btn>
              <v-btn
                variant="text"
                size="small"
                :disabled="bajaBloqueada(salon)"
                :aria-label="`${salon.inhabilitado ? 'Reactivar' : 'Dar de baja'} ${salon.nombre}`"
                @click="pedirCambioEstado(salon)"
              >
                <v-icon>{{ salon.inhabilitado ? 'fa-solid fa-rotate-left' : 'fa-solid fa-ban' }}</v-icon>
                <v-tooltip activator="parent" location="top">
                  {{ bajaBloqueada(salon) ? 'Marcá otro salón como principal para poder darlo de baja' : salon.inhabilitado ? 'Reactivar' : 'Dar de baja' }}
                </v-tooltip>
              </v-btn>
            </template>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <DialogoSalon v-model="dialogo.visible" :salon="dialogo.salon" @guardado="alGuardar" />

    <ModalConfirmar
      v-model="confirmarEstado.visible"
      :titulo="confirmarEstado.baja ? 'Dar de baja el salón' : 'Reactivar el salón'"
      :color="confirmarEstado.baja ? 'warning' : 'primary'"
      :icono="confirmarEstado.baja ? 'fa-solid fa-ban' : 'fa-solid fa-rotate-left'"
      :texto-confirmar="confirmarEstado.baja ? 'Dar de baja' : 'Reactivar'"
      :cargando="trabajando"
      @confirmar="ejecutarCambioEstado"
    >
      <template v-if="confirmarEstado.baja">
        <strong>{{ confirmarEstado.salon?.nombre }}</strong> dejará de aparecer para reservas nuevas. Sus datos y reservas
        anteriores se conservan, y podés reactivarlo cuando quieras.
      </template>
      <template v-else>
        <strong>{{ confirmarEstado.salon?.nombre }}</strong> volverá a poder reservarse.
      </template>
    </ModalConfirmar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { actualizarSalon, listarSalones } from '@/api/salones';
import { ApiError } from '@/api/http';
import type { Salon } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import DialogoSalon from './DialogoSalon.vue';

const sesion = useSesionStore();
const avisos = genericosStore();

/** El empleado consulta; solo el dueño modifica (la API también lo exige). */
const puedeEditar = computed(() => sesion.esDueno);

const salones = ref<Salon[]>([]);
const verBajas = ref(false);
const cargando = ref(false);
const trabajando = ref(false);
const errorCarga = ref('');

const dialogo = reactive({ visible: false, salon: null as Salon | null });
const confirmarEstado = reactive({ visible: false, baja: true, salon: null as Salon | null });

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    salones.value = await listarSalones(verBajas.value);
  } catch (e) {
    errorCarga.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

/** El principal no se puede dar de baja mientras haya otros activos: primero hay que elegir otro. */
const bajaBloqueada = (salon: Salon) =>
  salon.esDefault && !salon.inhabilitado && salones.value.some((s) => s.id !== salon.id && !s.inhabilitado);

function abrirAlta() {
  dialogo.salon = null;
  dialogo.visible = true;
}
function abrirEdicion(salon: Salon) {
  dialogo.salon = salon;
  dialogo.visible = true;
}
async function alGuardar(salon: Salon, esNuevo: boolean) {
  avisos.setSnackBar(esNuevo ? `Salón «${salon.nombre}» creado.` : `Se guardaron los cambios de «${salon.nombre}».`, 'success');
  await cargar();
}

async function marcarPrincipal(salon: Salon) {
  try {
    await actualizarSalon(salon.id, { esDefault: true });
    avisos.setSnackBar(`«${salon.nombre}» es ahora el salón principal.`, 'success');
    await cargar();
  } catch (e) {
    avisos.setSnackBar(mensajeDe(e), 'error');
  }
}

function pedirCambioEstado(salon: Salon) {
  confirmarEstado.salon = salon;
  confirmarEstado.baja = !salon.inhabilitado;
  confirmarEstado.visible = true;
}
async function ejecutarCambioEstado() {
  const salon = confirmarEstado.salon;
  if (!salon) return;
  trabajando.value = true;
  try {
    await actualizarSalon(salon.id, { inhabilitado: confirmarEstado.baja });
    confirmarEstado.visible = false;
    avisos.setSnackBar(confirmarEstado.baja ? `«${salon.nombre}» fue dado de baja.` : `«${salon.nombre}» fue reactivado.`, 'success');
    await cargar();
  } catch (e) {
    confirmarEstado.visible = false;
    avisos.setSnackBar(mensajeDe(e), 'error');
  } finally {
    trabajando.value = false;
  }
}

onMounted(cargar);
</script>
