<template>
  <v-app style="width: 100%">
    <!-- Nav bar -->
    <Navigation/>
    <!-- Resto del contenido -->
    <v-main >
      <Loading :loading="useGenericos.loading" />
      <SnackBar 
        v-model="useGenericos.activarSnack"
        :mensaje="useGenericos.textoSnack"
        :color="useGenericos.colorSnack"
      />
      <RouterView />
    </v-main>
  </v-app>
</template>

<script setup>
import { RouterView } from 'vue-router';
import { genericosStore } from './store/genericos';
import Loading from './components/utils/Loading.vue';
import SnackBar from './components/utils/SnackBar.vue';
import Navigation from './components/generales/Navigation.vue';

const useGenericos = genericosStore();

</script>

<style scoped>

</style>
