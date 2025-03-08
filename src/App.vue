<template>
  <v-app style="width: 100%;">
    <v-app-bar color="primary" dark  v-if="route.name && route.name !== 'login'">
      <!-- Logo o título -->
      <v-app-bar-title>Mi Navbar</v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Menú de opciones -->
      <v-btn text>Inicio</v-btn>
      <v-btn text>Sobre Nosotros</v-btn>
      <v-btn text>Contacto</v-btn>
    </v-app-bar>

    <!-- Resto del contenido -->
    <Loading :loading="genericosStore.loading" />
    <SnackBar 
      v-model="genericosStore.activarSnack"
      :mensaje="genericosStore.textoSnack"
      :color="genericosStore.colorSnack"
    />
    <RouterView />
  </v-app>
</template>

<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useAuthStore } from './store/auth';
import { genericos } from './store/genericos';
import Loading from './components/utils/Loading.vue';
import SnackBar from './components/utils/SnackBar.vue';
import Footer from './components/generales/Footer.vue';

const route = useRoute();
const authStore = useAuthStore();
const genericosStore = genericos();
</script>

<style scoped>
/* Estilos adicionales */
</style>
