<template>
  <v-app style="width: 100%;">
    <v-app-bar color="primary" dark  v-if="authStore.isAuthenticated">
      <!-- Logo o título -->
      <v-app-bar-title>Mi Navbar</v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Menú de opciones -->
      <v-btn text>Inicio</v-btn>
      <v-btn text>Sobre Nosotros</v-btn>
      <v-btn text>Contacto</v-btn>

      <RouterLink to="Inicio">Inicio</RouterLink>
      <RouterLink to="Combos">Reservas</RouterLink>
      <RouterLink to="Combos">Combos</RouterLink>
      <RouterLink to="Combos">Usuarios</RouterLink>
      <RouterLink to="Combos">Roles</RouterLink>

      <v-btn variant="plain" @click="logout()">
        <v-icon>fa-solid fa-arrow-right-from-bracket</v-icon>
        <v-tooltip
          activator="parent"
          location="bottom"
        >Cerrar Sesión</v-tooltip>
      </v-btn>
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
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './store/auth';
import { genericos } from './store/genericos';
import Loading from './components/utils/Loading.vue';
import SnackBar from './components/utils/SnackBar.vue';
import Footer from './components/generales/Footer.vue';

const route          = useRoute();
const router         = useRouter();
const authStore      = useAuthStore();
const genericosStore = genericos();

const logout = () => {
  authStore.cerrarSesion();
  router.push({ name: 'Login' });
};

</script>

<style scoped>
/* Estilos adicionales */
</style>
