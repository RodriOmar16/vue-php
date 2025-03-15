<template>
  <v-app style="width: 100%;">
    <!-- Nav bar -->
    <Navigation/>
    <!-- Resto del contenido -->
    <v-main>
      <Loading :loading="genericosStore.loading" />
      <SnackBar 
        v-model="genericosStore.activarSnack"
        :mensaje="genericosStore.textoSnack"
        :color="genericosStore.colorSnack"
      />
      <RouterView />
    </v-main>
  </v-app>
</template>

<script setup>
import { RouterView } from 'vue-router';
import { genericos } from './store/genericos';
import Loading from './components/utils/Loading.vue';
import SnackBar from './components/utils/SnackBar.vue';
import Navigation from './components/generales/Navigation.vue';

const genericosStore = genericos();

</script>

<style scoped>
/* Estilos adicionales */
</style>
