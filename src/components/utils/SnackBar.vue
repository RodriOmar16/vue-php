<template>
  <v-snackbar v-model="visible" multi-line :color="color" class="pa-0">
    <v-row>
      <v-col cols="10" class="d-flex align-center">
        <span role="status">{{ mensaje }}</span>
      </v-col>
      <v-col cols="2" class="d-flex justify-end">
        <v-btn icon size="small" variant="plain" aria-label="Cerrar aviso" @click="visible = false">
          <v-icon>fa-solid fa-xmark</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ modelValue?: boolean; mensaje?: string; color?: string }>(),
  { modelValue: false, mensaje: '', color: 'info' },
);
const emit = defineEmits<{ 'update:modelValue': [valor: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});
</script>
