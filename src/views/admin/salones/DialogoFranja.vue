<template>
  <v-dialog v-model="visible" max-width="520" :persistent="enviando">
    <v-card>
      <v-card-title>{{ franja ? 'Editar horario' : 'Agregar horario' }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Es la ventana en la que el salón recibe eventos. El cliente elige la hora de inicio dentro de ella,
          según lo que dure su combo.
        </p>

        <v-form ref="formulario" @submit.prevent="enviar">
          <!-- Al crear se pueden tildar varios días para cargar el mismo horario de una vez -->
          <fieldset v-if="!franja" class="mb-4 dias">
            <legend class="text-subtitle-2 mb-1">Días</legend>
            <v-chip-group v-model="dias" multiple column selected-class="text-primary">
              <v-chip v-for="d in DIAS_SEMANA" :key="d.valor" :value="d.valor" filter variant="outlined" :disabled="enviando">
                {{ d.nombre }}
              </v-chip>
            </v-chip-group>
            <div v-if="errorDias" class="text-caption text-error" role="alert">{{ errorDias }}</div>
          </fieldset>
          <p v-else class="text-subtitle-1 mb-4">{{ nombreDia(franja.diaSemana) }}</p>

          <v-row>
            <v-col cols="6">
              <v-text-field v-model="horaInicio" label="Desde" type="time" :rules="[regla.hora, regla.distintas]" :disabled="enviando" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="horaFin" label="Hasta" type="time" :rules="[regla.hora, regla.distintas]" :disabled="enviando" />
            </v-col>
          </v-row>
          <p v-if="resumen" class="text-body-2 text-medium-emphasis" data-testid="resumen-franja">{{ resumen }}</p>

          <v-alert v-if="fallos.length" type="error" variant="tonal" density="compact" class="mt-3" role="alert">
            <div v-for="f in fallos" :key="f">{{ f }}</div>
          </v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ franja ? 'Guardar' : 'Agregar' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarFranja, crearFranja } from '@/api/salones';
import { ApiError } from '@/api/http';
import type { Franja } from '@/api/tipos';
import { cruzaMedianoche, DIAS_SEMANA, duracionMinutos, nombreDia, textoDuracion } from '@/utils/horarios';

const props = defineProps<{
  modelValue: boolean;
  salonId: number;
  /** Si se indica, se edita esa franja; si no, se agregan nuevas. */
  franja?: Franja | null;
  /** Día tildado de entrada al agregar */
  diaInicial?: number;
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardada: [] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const dias = ref<number[]>([]);
const horaInicio = ref('');
const horaFin = ref('');
const enviando = ref(false);
const errorDias = ref('');
const fallos = ref<string[]>([]);

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const regla = {
  hora: (v: string) => HORA.test(v ?? '') || 'Indicá una hora (por ejemplo 15:00)',
  distintas: () => horaInicio.value !== horaFin.value || 'La hora de inicio y la de fin no pueden ser iguales',
};

const resumen = computed(() => {
  if (!HORA.test(horaInicio.value) || !HORA.test(horaFin.value) || horaInicio.value === horaFin.value) return '';
  const f = { horaInicio: horaInicio.value, horaFin: horaFin.value };
  return `Dura ${textoDuracion(duracionMinutos(f))}${cruzaMedianoche(f) ? ' y termina al día siguiente' : ''}.`;
});

watch(visible, (abierto) => {
  if (!abierto) return;
  fallos.value = [];
  errorDias.value = '';
  horaInicio.value = props.franja?.horaInicio ?? '';
  horaFin.value = props.franja?.horaFin ?? '';
  dias.value = props.diaInicial ? [props.diaInicial] : [];
  formulario.value?.resetValidation();
});

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function enviar() {
  fallos.value = [];
  errorDias.value = '';
  const validacion = await formulario.value?.validate();
  if (!props.franja && dias.value.length === 0) errorDias.value = 'Elegí al menos un día';
  if (!validacion?.valid || errorDias.value) return;

  enviando.value = true;
  try {
    if (props.franja) {
      await actualizarFranja(props.salonId, props.franja.id, { horaInicio: horaInicio.value, horaFin: horaFin.value });
      visible.value = false;
      emit('guardada');
      return;
    }

    // Un día por vez: si alguno choca con un horario existente, los demás igual se guardan y
    // el diálogo queda abierto solo con los días que fallaron.
    const fallidos: number[] = [];
    for (const dia of [...dias.value].sort((a, b) => a - b)) {
      try {
        await crearFranja(props.salonId, { diaSemana: dia, horaInicio: horaInicio.value, horaFin: horaFin.value });
      } catch (e) {
        fallidos.push(dia);
        fallos.value.push(`${nombreDia(dia)}: ${mensajeDe(e)}`);
      }
    }
    emit('guardada'); // refresca la lista aunque haya fallos parciales
    if (fallidos.length === 0) {
      visible.value = false;
    } else {
      dias.value = fallidos; // reintentar solo los que fallaron
    }
  } catch (e) {
    fallos.value = [mensajeDe(e)];
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped>
.dias {
  border: 0;
  padding: 0;
}
</style>
