<template>
  <div class="d-flex justify-center ma-auto" style="max-width: 400px ">
    <v-alert
      border="start"
      variant="outlined"
      prominent
      color="orange"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">fa-solid fa-triangle-exclamation</v-icon>
        <div class="text-center ma-auto">{{ mensaje }}</div>
      </div>
    </v-alert>
  </div>
</template>

<script setup> 
  const props = defineProps({
    mensaje: { type: String, default: 'No hay datos para los filtros aplicados.' }
  });
</script>