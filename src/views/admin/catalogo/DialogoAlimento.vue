<template>
  <v-dialog v-model="visible" max-width="480" :persistent="enviando">
    <v-card>
      <v-card-title>{{ alimento ? 'Editar alimento' : 'Nuevo alimento' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-text-field v-model="nombre" label="Nombre" placeholder="Pizza, empanadas, gaseosa..." :rules="[requerido, maximo(100)]" :disabled="enviando" autofocus />
          <v-radio-group v-model="tipo" label="Tipo" inline :disabled="enviando" hide-details>
            <v-radio value="comida" label="Comida" />
            <v-radio value="bebida" label="Bebida" />
          </v-radio-group>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ alimento ? 'Guardar cambios' : 'Agregar' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarAlimento, crearAlimento } from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { Alimento, TipoAlimento } from '@/api/tipos';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{ modelValue: boolean; alimento?: Alimento | null }>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardado: [nombre: string, esNuevo: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const tipo = ref<TipoAlimento>('comida');
const enviando = ref(false);
const error = ref('');

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  nombre.value = props.alimento?.nombre ?? '';
  tipo.value = props.alimento?.tipo ?? 'comida';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const datos = { nombre: nombre.value.trim(), tipo: tipo.value };
    if (props.alimento) await actualizarAlimento(props.alimento.id, datos);
    else await crearAlimento(datos);
    visible.value = false;
    emit('guardado', datos.nombre, !props.alimento);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
