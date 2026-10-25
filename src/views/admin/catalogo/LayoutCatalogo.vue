<template>
  <div>
    <h1 class="text-h5 mb-1">Catálogo</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Lo que ofrecés en tus fiestas. Empezá por los alimentos, armá tus menús con ellos, y luego cargá
      las instalaciones y los servicios. Con todo eso después armás los combos.
    </p>

    <v-tabs :model-value="route.name" color="primary" class="mb-4" show-arrows>
      <v-tab v-for="t in pestanas" :key="t.nombre" :value="t.nombre" :to="{ name: t.nombre }">
        <v-icon start>{{ t.icono }}</v-icon>{{ t.titulo }}
      </v-tab>
    </v-tabs>

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';

const route = useRoute();

const pestanas = [
  { nombre: 'admin-catalogo-menus', titulo: 'Menús', icono: 'fa-solid fa-bowl-food' },
  { nombre: 'admin-catalogo-alimentos', titulo: 'Alimentos', icono: 'fa-solid fa-utensils' },
  { nombre: 'admin-catalogo-instalaciones', titulo: 'Instalaciones', icono: 'fa-solid fa-futbol' },
  { nombre: 'admin-catalogo-servicios', titulo: 'Servicios', icono: 'fa-solid fa-bell-concierge' },
];
</script>
