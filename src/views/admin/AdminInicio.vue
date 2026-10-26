<template>
  <v-row>
    <v-col cols="12">
      <h1 class="text-h5 mb-1">Hola, {{ sesion.usuario?.nombre }}</h1>
      <p class="text-medium-emphasis">
        {{ etiquetaRol }}<template v-if="sesion.usuario?.empresa"> en {{ sesion.usuario.empresa.nombre }}</template>
      </p>
    </v-col>

    <!-- Lo que hay para atender (solo personal de un salón) -->
    <template v-if="resumen">
      <v-col cols="12" sm="4">
        <v-card :to="{ name: 'admin-reservas' }" :color="resumen.comprobantesPorRevisar > 0 ? 'warning' : undefined" :variant="resumen.comprobantesPorRevisar > 0 ? 'tonal' : 'outlined'" data-testid="tarjeta-comprobantes">
          <v-card-text>
            <div class="text-h4">{{ resumen.comprobantesPorRevisar }}</div>
            <div>{{ resumen.comprobantesPorRevisar === 1 ? 'comprobante para revisar' : 'comprobantes para revisar' }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card :to="{ name: 'admin-reservas' }" variant="outlined" data-testid="tarjeta-esperando">
          <v-card-text>
            <div class="text-h4">{{ resumen.esperandoSena }}</div>
            <div>{{ resumen.esperandoSena === 1 ? 'reserva esperando la seña' : 'reservas esperando la seña' }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card :to="{ name: 'admin-reservas' }" variant="outlined" data-testid="tarjeta-proximas">
          <v-card-text>
            <div class="text-h4">{{ resumen.proximas }}</div>
            <div>{{ resumen.proximas === 1 ? 'evento confirmado próximo' : 'eventos confirmados próximos' }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </template>

    <v-col cols="12" md="8">
      <v-card variant="tonal">
        <v-card-text>
          Desde acá administrás tu salón. Las secciones están en el menú de la izquierda.
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { resumenReservas } from '@/api/reservas';
import { ETIQUETA_ROL, type ResumenReservas } from '@/api/tipos';
import { useSesionStore } from '@/store/sesion';

const sesion = useSesionStore();
const etiquetaRol = computed(() => (sesion.rol ? ETIQUETA_ROL[sesion.rol] : ''));

const resumen = ref<ResumenReservas | null>(null);
onMounted(async () => {
  // el superadmin no pertenece a ningún salón: no tiene reservas que atender
  if (sesion.esSuperadmin) return;
  try {
    resumen.value = await resumenReservas();
  } catch {
    /* es un extra: si falla, la pantalla igual funciona */
  }
});
</script>
