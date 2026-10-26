<template>
  <v-dialog v-model="visible" max-width="520" :persistent="enviando">
    <v-card>
      <v-card-title>{{ devuelto ? 'Confirmar que ya lo devolviste' : 'Registrar un reembolso' }}</v-card-title>
      <v-card-text>
        <p v-if="devuelto" class="text-body-2 mb-3">
          Vas a dar por devueltos <strong>{{ formatearImporte(monto) }}</strong> al cliente. Confirmá solo si el dinero <strong>ya salió</strong>:
          no se puede deshacer.
        </p>
        <p v-else class="text-body-2 text-medium-emphasis mb-3">
          Acordás una devolución de dinero. Queda <strong>pendiente</strong> hasta que confirmes que la hiciste.
        </p>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-text-field
            v-if="!devuelto"
            v-model="importe"
            label="Importe a devolver"
            type="number"
            step="0.01"
            prefix="$"
            :hint="`Se puede devolver hasta ${formatearImporte(maximoDevolver)}`"
            persistent-hint
            :rules="[requerido, importeValido, regla.positivo, regla.noSuperaTope]"
            :disabled="enviando"
            autofocus
          />
          <v-radio-group v-model="metodo" :label="devuelto ? '¿Cómo lo devolviste?' : '¿Cómo se lo vas a devolver?'" inline :disabled="enviando" class="mt-2">
            <v-radio label="Efectivo" value="efectivo" />
            <v-radio label="Transferencia" value="transferencia" />
          </v-radio-group>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ devuelto ? 'Ya lo devolví' : 'Registrar reembolso' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { reembolsoRealizado, registrarReembolso } from '@/api/reservas';
import type { MetodoDevolucion } from '@/api/tipos';
import { aNumero, formatearImporte, importeValido } from '@/utils/dinero';
import { requerido } from '@/utils/reglas';

const props = defineProps<{
  modelValue: boolean;
  /** 'devuelto': confirmar un reembolso pendiente (hace falta pagoId y monto). 'registrar': acordar uno nuevo (hace falta reservaId y maximo). */
  modo: 'devuelto' | 'registrar';
  pagoId?: string | null;
  reservaId?: string;
  /** importe del reembolso que se confirma */
  monto?: string;
  /** hasta cuánto se puede acordar */
  maximo?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; hecho: [] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});
const devuelto = computed(() => props.modo === 'devuelto');
const maximoDevolver = computed(() => props.maximo ?? '0');

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const importe = ref('');
const metodo = ref<MetodoDevolucion>('transferencia');
const enviando = ref(false);
const error = ref('');

const regla = {
  positivo: (v: string) => (aNumero(v) ?? 0) > 0 || 'El importe tiene que ser mayor a cero',
  noSuperaTope: (v: string) => (aNumero(v) ?? 0) <= Number(maximoDevolver.value) || `No puede superar ${formatearImporte(maximoDevolver.value)}`,
};

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  importe.value = devuelto.value ? '' : String(Number(maximoDevolver.value));
  metodo.value = 'transferencia';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;
  enviando.value = true;
  try {
    if (devuelto.value) await reembolsoRealizado(props.pagoId!, metodo.value);
    else await registrarReembolso(props.reservaId!, { monto: aNumero(importe.value)!, metodo: metodo.value });
    visible.value = false;
    emit('hecho');
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
