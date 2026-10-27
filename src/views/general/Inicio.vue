<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6 text-center" elevation="4" data-testid="portada-panel">
          <v-icon size="40" color="primary" class="mb-3">fa-solid fa-calendar-check</v-icon>
          <h1 class="text-h5 mb-2">Panel de administración</h1>
          <p class="text-body-2 text-medium-emphasis mb-6">Desde acá los dueños y empleados de cada salón gestionan sus reservas.</p>

          <!-- Sin redirecciones automáticas: quien llega acá elige adónde ir. -->
          <v-btn v-if="sesion.autenticado" color="primary" block size="large" :to="{ name: 'admin-inicio' }">Ir al panel</v-btn>
          <v-btn v-else color="primary" block size="large" :to="{ name: 'admin-login' }">Ingresar</v-btn>

          <template v-if="urlSitio">
            <v-divider class="my-6" />
            <p class="text-body-2 text-medium-emphasis mb-2">¿Querés reservar un salón de fiestas?</p>
            <v-btn variant="text" :href="urlSitio" append-icon="fa-solid fa-arrow-up-right-from-square">Ir al sitio de reservas</v-btn>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSesionStore } from '@/store/sesion';

const sesion = useSesionStore();

// Dirección del sitio público de cara al cliente (corre aparte, ver VITE_SITIO_URL)
const sitio = (import.meta.env.VITE_SITIO_URL as string | undefined) ?? 'http://localhost:3001';
const urlSitio = computed(() => sitio.replace(/\/+$/, ''));
</script>
