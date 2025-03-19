<template>
  <v-text-field placeholder="Buscar...">
    <template v-slot="prepend"><v-icon size="small" color="grey-darken-1" class="mr-2">fa-solid fa-magnifying-glass</v-icon></template>
  </v-text-field>
</template>

<script setup>
  const props = defineProps({
    search: { type: String, default: ''}
  });
</script>