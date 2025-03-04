<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
    <Login/>
  </header>

  <RouterView />
</template>

<script setup>
  import { RouterLink, RouterView } from 'vue-router'
  import Login from './views/general/Login.vue';
</script>

<style scoped>
</style>
