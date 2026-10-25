<template>
  <v-dialog v-model="visible" max-width="480" :persistent="cargando">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon :color="color" class="mr-3">{{ icono }}</v-icon>
        {{ titulo }}
      </v-card-title>
      <v-card-text class="text-body-1">
        <slot>{{ mensaje }}</slot>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="cargando" @click="visible = false">Cancelar</v-btn>
        <v-btn :color="color" variant="flat" :loading="cargando" @click="emit('confirmar')">
          {{ textoConfirmar }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    titulo?: string;
    mensaje?: string;
    textoConfirmar?: string;
    /** warning / error para acciones delicadas; primary para el resto */
    color?: string;
    icono?: string;
    /** mientras corre la acción: botón con spinner y diálogo no descartable */
    cargando?: boolean;
  }>(),
  {
    modelValue: false,
    titulo: 'Confirmar acción',
    mensaje: '',
    textoConfirmar: 'Aceptar',
    color: 'primary',
    icono: 'fa-solid fa-circle-question',
    cargando: false,
  },
);
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; confirmar: [] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});
</script>
