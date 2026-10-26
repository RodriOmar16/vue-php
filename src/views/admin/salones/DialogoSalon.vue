<template>
  <v-dialog v-model="visible" max-width="640" scrollable :persistent="enviando">
    <v-card>
      <v-card-title>{{ salon ? 'Editar salón' : 'Nuevo salón' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-text-field
            v-model="nombre"
            label="Nombre del salón"
            :rules="[requerido, maximo(100)]"
            :disabled="enviando"
            autofocus
          />
          <v-textarea
            v-model="descripcion"
            label="Descripción (opcional)"
            rows="2"
            auto-grow
            :rules="[maximo(2000)]"
            :disabled="enviando"
          />
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="capacidad"
                label="Capacidad máxima (opcional)"
                type="number"
                suffix="personas"
                :rules="[regla.capacidad]"
                :disabled="enviando"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="minutosLimpieza"
                label="Limpieza entre eventos"
                type="number"
                suffix="min"
                hint="Margen que queda libre entre un evento y el siguiente"
                persistent-hint
                :rules="[regla.limpieza]"
                :disabled="enviando"
              />
            </v-col>
          </v-row>

          <v-checkbox
            v-if="!salon"
            v-model="ofrecerCombos"
            label="Ofrecer en este salón todos mis combos activos"
            density="compact"
            hide-details
            :disabled="enviando"
          />

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
        <v-divider class="my-4" />
        <GaleriaMedios v-if="salon" tipo="salones" :id="salon.id" editable />
        <p v-else class="text-caption text-medium-emphasis">Podrás agregar fotos después de crear el salón.</p>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">
          {{ salon ? 'Guardar cambios' : 'Crear salón' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import GaleriaMedios from '@/components/GaleriaMedios.vue';
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarSalon, crearSalon } from '@/api/salones';
import { ApiError } from '@/api/http';
import type { Salon } from '@/api/tipos';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{
  modelValue: boolean;
  /** Si se indica, se edita ese salón; si no, se crea uno nuevo. */
  salon?: Salon | null;
}>();
const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  guardado: [salon: Salon, esNuevo: boolean];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const descripcion = ref('');
const capacidad = ref('');
const minutosLimpieza = ref('0');
const ofrecerCombos = ref(true);
const enviando = ref(false);
const error = ref('');

const entero = (v: string) => /^\d+$/.test(String(v).trim());
const regla = {
  capacidad: (v: string) =>
    v === '' || v === null || (entero(v) && Number(v) >= 1 && Number(v) <= 5000) || 'Un número entero entre 1 y 5000',
  limpieza: (v: string) =>
    (entero(v) && Number(v) >= 0 && Number(v) <= 1440) || 'Un número entero de minutos entre 0 y 1440',
};

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  nombre.value = props.salon?.nombre ?? '';
  descripcion.value = props.salon?.descripcion ?? '';
  capacidad.value = props.salon?.capacidad?.toString() ?? '';
  minutosLimpieza.value = (props.salon?.minutosLimpieza ?? 0).toString();
  ofrecerCombos.value = true;
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const datos = {
      nombre: nombre.value.trim(),
      ...(descripcion.value.trim() && { descripcion: descripcion.value.trim() }),
      ...(capacidad.value !== '' && { capacidad: Number(capacidad.value) }),
      minutosLimpieza: Number(minutosLimpieza.value),
    };
    if (props.salon) {
      const guardado = await actualizarSalon(props.salon.id, datos);
      visible.value = false;
      emit('guardado', guardado, false);
    } else {
      const guardado = await crearSalon({ ...datos, ofrecerCombos: ofrecerCombos.value });
      visible.value = false;
      emit('guardado', guardado, true);
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
