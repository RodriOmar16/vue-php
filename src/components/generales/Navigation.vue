<template>
  <v-app-bar color="primary" class="px-4">
    <v-app-bar-title>
      <RouterLink :to="{ name: 'inicio' }" class="enlace-titulo">Reservas</RouterLink>
    </v-app-bar-title>
    <v-spacer />
    <v-btn variant="text" :to="{ name: 'inicio' }">Inicio</v-btn>
    <!-- El acceso del personal no aparece acá: se entra por /admin, como en WordPress. -->
  </v-app-bar>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.enlace-titulo {
  color: inherit;
  text-decoration: none;
}
</style>
