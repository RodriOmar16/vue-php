<template>
  <v-dialog v-model="visible" max-width="600" scrollable :persistent="enviando">
    <v-card>
      <v-card-title>Cancelar la reserva</v-card-title>
      <v-card-text>
        <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
          Al cancelar, <strong>el horario vuelve a quedar disponible</strong> para otros clientes y la reserva no se puede reactivar.
        </v-alert>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-textarea
            v-model="motivo"
            label="Motivo de la cancelación"
            placeholder="Ej.: El cliente avisó que no puede hacer la fiesta"
            rows="2"
            auto-grow
            counter="300"
            :rules="[requerido, minimo, maximo(300)]"
            :disabled="enviando"
            autofocus
          />

          <div class="text-subtitle-2 mt-4 mb-1">¿Qué pasa con el dinero cobrado?</div>
          <p v-if="!hayQueDevolver" class="text-body-2 text-medium-emphasis" data-testid="sin-cobros">
            No se cobró nada de esta reserva: no hay nada que devolver.
          </p>
          <template v-else>
            <v-radio-group v-model="opcion" :disabled="enviando" hide-details>
              <v-radio value="todo" :label="`Devolver todo lo cobrado (${formatearImporte(reembolsable)})`" />
              <v-radio value="otro" label="Devolver otro importe" />
              <v-radio value="nada" label="No devolver nada (por ejemplo, cancelación tardía)" />
            </v-radio-group>
            <v-text-field
              v-if="opcion === 'otro'"
              v-model="importe"
              label="Importe a devolver"
              type="number"
              step="0.01"
              prefix="$"
              :hint="`Hasta ${formatearImporte(reembolsable)}`"
              persistent-hint
              :rules="[requerido, importeValido, regla.positivo, regla.noSuperaCobrado]"
              :disabled="enviando"
              class="mt-2"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              El reembolso queda <strong>pendiente</strong>: el sistema no da el dinero por devuelto hasta que vos confirmes, desde la reserva, que ya lo devolviste.
            </p>
          </template>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Volver</v-btn>
        <v-btn color="error" variant="flat" :loading="enviando" @click="enviar">Cancelar la reserva</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { cancelarReserva } from '@/api/reservas';
import { aNumero, formatearImporte, importeValido } from '@/utils/dinero';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{
  modelValue: boolean;
  reservaId: string;
  /** cuánto de lo cobrado todavía se puede devolver */
  reembolsable: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; hecho: [] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const motivo = ref('');
const opcion = ref<'todo' | 'otro' | 'nada'>('todo');
const importe = ref('');
const enviando = ref(false);
const error = ref('');

const hayQueDevolver = computed(() => Number(props.reembolsable) > 0);
const minimo = (v: string) => (v ?? '').trim().length >= 3 || 'Escribí al menos 3 caracteres';
const regla = {
  positivo: (v: string) => (aNumero(v) ?? 0) > 0 || 'El importe tiene que ser mayor a cero (si no querés devolver nada, elegí «No devolver nada»)',
  noSuperaCobrado: (v: string) => (aNumero(v) ?? 0) <= Number(props.reembolsable) || `No puede superar lo cobrado (${formatearImporte(props.reembolsable)})`,
};

watch(visible, (abierto) => {
  if (!abierto) return;
  motivo.value = '';
  opcion.value = 'todo';
  importe.value = '';
  error.value = '';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;
  enviando.value = true;
  try {
    await cancelarReserva(props.reservaId, {
      motivo: motivo.value.trim(),
      // sin dinero cobrado no hay nada que indicar; «todo» = omitir el campo (la API devuelve todo lo cobrado)
      ...(hayQueDevolver.value && opcion.value === 'nada' && { reembolso: 0 }),
      ...(hayQueDevolver.value && opcion.value === 'otro' && { reembolso: aNumero(importe.value)! }),
    });
    visible.value = false;
    emit('hecho');
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
