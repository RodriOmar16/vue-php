<template>
  <v-app>
    <RouterView />
    <Loading :loading="ui.loading" />
    <SnackBar v-model="ui.activarSnack" :mensaje="ui.textoSnack" :color="ui.colorSnack" />
  </v-app>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import Loading from '@/components/utils/Loading.vue';
import SnackBar from '@/components/utils/SnackBar.vue';
import { genericosStore } from '@/store/genericos';

const ui = genericosStore();
</script>
