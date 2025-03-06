<template>
  <v-snackbar
    v-model="snackbar"
    multi-line
    :color="color"
    class="ma-0 pa-0"
  >
    <v-row>
      <v-col cols="11">
        <span>{{ mensaje }}</span>
      </v-col>
      <v-col cols="1" class="d-flex justify-end">
        <v-btn
          icon
          small
          @click="cerrarSnackbar"
          class="pb-2"
        >
          <v-icon>fa-solid fa-times</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </v-snackbar>
</template>

<script setup>
import { computed } from 'vue';

// Props accesibles automáticamente
defineProps({
  modelValue: Boolean,
  mensaje: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: 'info',
  },
});

// Define Emits
const emit = defineEmits(['update:modelValue']);

// Computed para manejar el `v-model`
const snackbar = computed({
  get: () => modelValue, // Usamos directamente `modelValue`, que es la prop reactiva
  set: (value) => emit('update:modelValue', value), // Emitimos la actualización correctamente
});

// Método para cerrar el snackbar
const cerrarSnackbar = () => {
  snackbar.value = false;
};
</script>
