<template>
  <header>
    <div class="wrapper">
      <nav>
        <!--<RouterLink to="/">Inicio</RouterLink>-->
        <!--<RouterLink to="/login">Login</RouterLink>-->
      </nav>
    </div>
  </header>
  <Loading :loading="genericosStore.loading"/>
  <SnackBar 
    v-model="genericosStore.activarSnack"
    :mensaje="genericosStore.textoSnack"
    :color="genericosStore.colorSnack"
  />
  <RouterView />
</template>

<script setup>
  import { RouterLink, RouterView } from 'vue-router'
  import Login from './views/general/Login.vue';
  import { useAuthStore } from './store/auth';
  import { genericos } from './store/genericos';
  import Loading from './components/utils/Loading.vue';
  import SnackBar from './components/utils/SnackBar.vue';

  const authStore = useAuthStore();
  const genericosStore = genericos();
</script>

<style scoped>
</style>
