<template>
  <Navigation />
  <v-main>
    <RouterView />
  </v-main>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import Navigation from '@/components/generales/Navigation.vue';
</script>
