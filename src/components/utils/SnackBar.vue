<template>
  <v-snackbar
    v-model="snackbar"
    multi-line
    :color="color"
    class="pa-0"
  >
    <v-row>
      <v-col cols="10" class="d-flex align-center">
        <span>{{ mensaje }}</span>
      </v-col>
      <v-col cols="2" class="d-flex justify-end">
        <v-btn
          icon
          small variant="plain"
          @click="cerrarSnackbar"
          class=""
        >
          <v-icon>fa-solid fa-xmark</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </v-snackbar>
</template>

<script setup>
import { computed } from 'vue';

// Props accesibles automáticamente
const props = defineProps({
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
  get: () => props.modelValue, // Usamos directamente `modelValue`, que es la prop reactiva
  set: (value) => emit('update:modelValue', value), // Emitimos la actualización correctamente
});

// Método para cerrar el snackbar
const cerrarSnackbar = () => {
  snackbar.value = false;
};
</script>
