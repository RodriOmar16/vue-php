<template>
  <v-dialog v-model="visible" max-width="520" :persistent="enviando">
    <v-card>
      <v-card-title>{{ anulando ? 'Anular el reembolso' : 'Rechazar el comprobante' }}</v-card-title>
      <v-card-text>
        <p v-if="anulando" class="text-body-2 text-medium-emphasis mb-3">
          El reembolso deja de estar pendiente y ese dinero vuelve a quedar disponible por si querés acordar otra devolución. Queda registrado en el historial.
        </p>
        <p v-else class="text-body-2 text-medium-emphasis mb-3">
          El cliente va a ver este motivo y va a poder enviar otro comprobante. Mientras no haya otro en revisión, su horario se sostiene un rato más.
        </p>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-textarea
            v-model="motivo"
            label="Motivo"
            :placeholder="anulando ? 'Ej.: Lo cargué con un importe equivocado' : 'Ej.: El importe no coincide con la seña / La foto no se lee'"
            rows="3"
            auto-grow
            counter="300"
            :rules="[requerido, minimo, maximo(300)]"
            :disabled="enviando"
            autofocus
          />
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" :loading="enviando" @click="enviar">{{ anulando ? 'Anular reembolso' : 'Rechazar comprobante' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { anularReembolso, rechazarPago } from '@/api/reservas';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{ modelValue: boolean; pagoId: string | null; modo?: 'rechazar' | 'anular' }>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; hecho: [] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const anulando = computed(() => props.modo === 'anular');
const formulario = ref<InstanceType<typeof VForm> | null>(null);
const motivo = ref('');
const enviando = ref(false);
const error = ref('');
const minimo = (v: string) => (v ?? '').trim().length >= 3 || 'Escribí al menos 3 caracteres';

watch(visible, (abierto) => {
  if (!abierto) return;
  motivo.value = '';
  error.value = '';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid || !props.pagoId) return;
  enviando.value = true;
  try {
    await (anulando.value ? anularReembolso : rechazarPago)(props.pagoId, motivo.value.trim());
    visible.value = false;
    emit('hecho');
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
