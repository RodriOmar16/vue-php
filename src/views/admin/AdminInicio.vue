<template>
  <v-row>
    <v-col cols="12">
      <h1 class="text-h5 mb-1">Hola, {{ sesion.usuario?.nombre }}</h1>
      <p class="text-medium-emphasis">
        {{ etiquetaRol }}<template v-if="sesion.usuario?.empresa"> en {{ sesion.usuario.empresa.nombre }}</template>
      </p>
    </v-col>
    <v-col cols="12" md="8">
      <v-card variant="tonal">
        <v-card-text>
          Desde acá vas a administrar tu salón. A medida que avance el sistema, las secciones
          van a ir apareciendo en el menú de la izquierda.
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ETIQUETA_ROL } from '@/api/tipos';
import { useSesionStore } from '@/store/sesion';

const sesion = useSesionStore();
const etiquetaRol = computed(() => (sesion.rol ? ETIQUETA_ROL[sesion.rol] : ''));
</script>
