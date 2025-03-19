<template>
  <v-text-field prepend-inner-icon="fa-solid fa-magnifying-glass" placeholder="Buscar...">
  </v-text-field>
</template>

<script setup>
  const props = defineProps({
    search: { type: String, default: ''}
  });
</script>