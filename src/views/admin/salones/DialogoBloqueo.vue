<template>
  <v-dialog v-model="visible" max-width="560" :persistent="enviando">
    <v-card>
      <v-card-title>{{ bloqueo ? 'Editar cierre' : 'Nuevo cierre' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-select
            v-model="salonId"
            :items="opcionesSalon"
            label="¿Qué se cierra?"
            item-title="titulo"
            item-value="valor"
            :disabled="enviando"
          />

          <v-switch v-model="todoElDia" label="Días completos" color="primary" hide-details density="compact" class="mb-2" :disabled="enviando" />

          <v-row v-if="todoElDia">
            <v-col cols="12" sm="6">
              <v-text-field v-model="fechaDesde" label="Desde el día" type="date" :rules="[regla.requerido]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="fechaHasta"
                label="Hasta el día (opcional)"
                type="date"
                hint="Inclusive. Si lo dejás vacío es un solo día."
                persistent-hint
                :rules="[regla.hastaDia]"
                :disabled="enviando"
              />
            </v-col>
          </v-row>
          <v-row v-else>
            <v-col cols="12" sm="6">
              <v-text-field v-model="desde" label="Desde" type="datetime-local" :rules="[regla.requerido]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="hasta" label="Hasta" type="datetime-local" :rules="[regla.requerido, regla.hastaHora]" :disabled="enviando" />
            </v-col>
          </v-row>
          <p class="text-caption text-medium-emphasis mb-3">Horario de tu salón ({{ zona }}).</p>

          <v-text-field v-model="motivo" label="Motivo (opcional)" placeholder="Feriado, mantenimiento, evento propio..." :rules="[maximo(255)]" :disabled="enviando" />

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-1" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ bloqueo ? 'Guardar cambios' : 'Crear cierre' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarBloqueo, crearBloqueo } from '@/api/bloqueos';
import { ApiError } from '@/api/http';
import type { Bloqueo, Salon } from '@/api/tipos';
import { maximo } from '@/utils/reglas';
import { esRangoDeDiasCompletos, isoALocal, localAIso, sumarDias } from '@/utils/zonaHoraria';

const props = defineProps<{
  modelValue: boolean;
  /** Si se indica, se edita ese cierre; si no, se crea uno nuevo. */
  bloqueo?: Bloqueo | null;
  salones: Salon[];
  /** zona horaria IANA de la empresa */
  zona: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardado: [esNuevo: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const opcionesSalon = computed(() => [
  { titulo: 'Todos los salones', valor: null as number | null },
  ...props.salones.map((s) => ({ titulo: s.nombre, valor: s.id as number | null })),
]);

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const salonId = ref<number | null>(null);
const todoElDia = ref(true);
const fechaDesde = ref('');
const fechaHasta = ref('');
const desde = ref('');
const hasta = ref('');
const motivo = ref('');
const enviando = ref(false);
const error = ref('');

const regla = {
  requerido: (v: string) => !!v || 'Campo obligatorio',
  hastaDia: (v: string) => !v || !fechaDesde.value || v >= fechaDesde.value || 'No puede ser anterior al día de inicio',
  hastaHora: (v: string) => !v || !desde.value || v > desde.value || 'Debe ser posterior al inicio',
};

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  const b = props.bloqueo;
  salonId.value = b?.salonId ?? null;
  motivo.value = b?.motivo ?? '';
  fechaDesde.value = fechaHasta.value = desde.value = hasta.value = '';
  if (b) {
    const completos = esRangoDeDiasCompletos(b.desde, b.hasta, props.zona);
    todoElDia.value = completos;
    desde.value = isoALocal(b.desde, props.zona);
    hasta.value = isoALocal(b.hasta, props.zona);
    if (completos) {
      fechaDesde.value = desde.value.slice(0, 10);
      fechaHasta.value = sumarDias(hasta.value.slice(0, 10), -1);
    }
  } else {
    todoElDia.value = true;
  }
  formulario.value?.resetValidation();
});

/** Instantes (ISO en UTC) según el modo elegido, interpretados en la zona de la empresa. */
function rango(): { desde: string; hasta: string } {
  if (todoElDia.value) {
    const ultimo = fechaHasta.value || fechaDesde.value;
    return {
      desde: localAIso(`${fechaDesde.value}T00:00`, props.zona),
      hasta: localAIso(`${sumarDias(ultimo, 1)}T00:00`, props.zona), // hasta el inicio del día siguiente al último
    };
  }
  return { desde: localAIso(desde.value, props.zona), hasta: localAIso(hasta.value, props.zona) };
}

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const datos = { salonId: salonId.value, ...rango(), motivo: motivo.value.trim() };
    if (props.bloqueo) {
      await actualizarBloqueo(props.bloqueo.id, datos);
    } else {
      await crearBloqueo({ ...datos, ...(datos.motivo === '' && { motivo: undefined }) });
    }
    visible.value = false;
    emit('guardado', !props.bloqueo);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
