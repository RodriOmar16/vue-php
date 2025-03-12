<template>
  <v-app style="width: 100%;">
    <v-app-bar color="primary" dark class="px-4" elevate-on-scroll>
      <!-- Logo o título -->
      <v-app-bar-title>Mi LOGO</v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Menu hamburguesa para moviles -->
      <v-app-bar-nav-icon v-if="xs" @click="drawer = !drawer"></v-app-bar-nav-icon>
      
      <!-- Menú de opciones pantallas grandes-->
      <div v-if="!xs">
        <RouterLink to="home"><v-btn text color="white">Inicio</v-btn></RouterLink>
        <RouterLink to="reservas"><v-btn text color="white">Reservas</v-btn></RouterLink>
        <RouterLink to="combos"><v-btn text color="white">Combos</v-btn></RouterLink>
        <RouterLink to="gestionar-usuarios"><v-btn text color="white">Usuarios</v-btn></RouterLink>

        <v-btn variant="plain" @click="logout()" v-if="authStore.isAuthenticated">
          <v-icon>fa-solid fa-arrow-right-from-bracket</v-icon>
          <v-tooltip activator="parent" location="bottom"
          >Cerrar Sesión</v-tooltip>
        </v-btn>
      </div>
      <!-- Fin menu opciones -->
    </v-app-bar>
    <!-- Menu que se muestra solo cuando es pantalla chica -->
    <v-navigation-drawer
        v-model="drawer" app absolute temporary v-if="xs"
      >
        <v-list>
          <v-list-item>
            <v-btn text block to="/home" @click="drawer = false">Inicio</v-btn>
          </v-list-item>
          <v-list-item>
            <v-btn text block to="/reservas" @click="drawer = false">Reservas</v-btn>
          </v-list-item>
          <v-list-item>
            <v-btn text block to="/combos" @click="drawer = false">Combos</v-btn>
          </v-list-item>
          <v-list-item>
            <v-btn text block to="/gestionar-usuarios" @click="drawer = false">Usuarios</v-btn>
          </v-list-item>
          <v-list-item v-if="authStore.isAuthenticated">
            <v-btn text color="primary" block="" @click="logout(); drawer = false">
              <v-icon left class="mr-2">fa-solid fa-arrow-right-from-bracket</v-icon> Cerrar Sesión
            </v-btn>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

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
import { useDisplay } from 'vuetify/lib/framework.mjs';
import Loading from './components/utils/Loading.vue';
import SnackBar from './components/utils/SnackBar.vue';
import Footer from './components/generales/Footer.vue';
import { ref } from 'vue';

const route          = useRoute();
const router         = useRouter();
const authStore      = useAuthStore();
const genericosStore = genericos();
const { xs }         = useDisplay();
const drawer         = ref(false);

const logout = () => {
  authStore.cerrarSesion();
  router.push({ name: 'Inicio' });
};

</script>

<style scoped>
/* Estilos adicionales */
</style>
