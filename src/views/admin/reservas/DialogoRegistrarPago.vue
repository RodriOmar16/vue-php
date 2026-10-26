<template>
  <v-dialog v-model="visible" max-width="520" :persistent="enviando">
    <v-card>
      <v-card-title>Registrar un pago</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Para un cobro que recibiste por fuera del sitio (en efectivo, o una transferencia que ya verificaste). Queda aprobado de inmediato;
          si cubre la seña, la reserva se confirma.
        </p>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-radio-group v-model="tipo" label="¿Qué se pagó?" inline :disabled="enviando">
            <v-radio label="La seña" value="sena" />
            <v-radio label="El saldo" value="saldo" />
          </v-radio-group>
          <v-text-field
            v-model="monto"
            label="Importe"
            type="number"
            step="0.01"
            prefix="$"
            :hint="`Falta cobrar ${formatearImporte(saldo)}`"
            persistent-hint
            :rules="[requerido, importeValido, regla.positivo, regla.noSuperaSaldo]"
            :disabled="enviando"
            autofocus
          />
          <v-radio-group v-model="metodo" label="¿Cómo lo recibiste?" inline :disabled="enviando" class="mt-2">
            <v-radio label="Efectivo" value="efectivo" />
            <v-radio label="Transferencia" value="transferencia" />
          </v-radio-group>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">Registrar pago</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { registrarPago } from '@/api/reservas';
import type { EstadoReserva } from '@/api/tipos';
import { aNumero, formatearImporte, importeValido } from '@/utils/dinero';
import { requerido } from '@/utils/reglas';

const props = defineProps<{
  modelValue: boolean;
  reservaId: string;
  estado: EstadoReserva;
  /** lo que falta cobrar del total */
  saldo: string;
  /** lo que falta para cubrir la seña (0 si ya está cubierta) */
  faltaSena: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; hecho: [] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const tipo = ref<'sena' | 'saldo'>('sena');
const metodo = ref<'efectivo' | 'transferencia'>('efectivo');
const monto = ref('');
const enviando = ref(false);
const error = ref('');

const regla = {
  positivo: (v: string) => (aNumero(v) ?? 0) > 0 || 'El importe tiene que ser mayor a cero',
  noSuperaSaldo: (v: string) => (aNumero(v) ?? 0) <= Number(props.saldo) || `No puede superar lo que falta cobrar (${formatearImporte(props.saldo)})`,
};

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  // pendiente de seña: se propone la seña; si ya está confirmada, el saldo
  tipo.value = props.estado === 'pendiente' ? 'sena' : 'saldo';
  monto.value = String(Number(tipo.value === 'sena' && Number(props.faltaSena) > 0 ? props.faltaSena : props.saldo));
  metodo.value = 'efectivo';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;
  enviando.value = true;
  try {
    await registrarPago(props.reservaId, { monto: aNumero(monto.value)!, tipo: tipo.value, metodo: metodo.value });
    visible.value = false;
    emit('hecho');
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
