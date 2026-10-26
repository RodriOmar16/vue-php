<template>
  <v-dialog v-model="visible" max-width="760" scrollable>
    <v-card>
      <v-card-title>Comprobante de pago</v-card-title>
      <v-card-text>
        <v-progress-linear v-if="cargando" indeterminate class="mb-3" />
        <v-alert v-if="error" type="error" variant="tonal" role="alert">{{ error }}</v-alert>
        <img v-if="url && esImagen" :src="url" alt="Comprobante de pago enviado por el cliente" class="imagen" />
        <iframe v-else-if="url" :src="url" title="Comprobante de pago enviado por el cliente (PDF)" class="pdf" />
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn v-if="url" variant="text" :href="url" target="_blank" rel="noopener">Abrir en otra pestaña</v-btn>
        <v-btn variant="text" @click="visible = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '@/api/http';
import { descargarComprobante } from '@/api/reservas';

const props = defineProps<{ modelValue: boolean; pagoId: string | null }>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const url = ref('');
const esImagen = ref(true);
const cargando = ref(false);
const error = ref('');

const soltar = () => {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = '';
};

watch(
  () => [props.modelValue, props.pagoId] as const,
  async ([abierto, pagoId]) => {
    soltar();
    error.value = '';
    if (!abierto || !pagoId) return;
    cargando.value = true;
    try {
      const archivo = await descargarComprobante(pagoId);
      esImagen.value = archivo.type.startsWith('image/');
      url.value = URL.createObjectURL(archivo);
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'No se pudo abrir el comprobante.';
    } finally {
      cargando.value = false;
    }
  },
  { immediate: true },
);

onBeforeUnmount(soltar); // el archivo es privado: no se deja en memoria
</script>

<style scoped>
.imagen {
  max-width: 100%;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
}
.pdf {
  width: 100%;
  height: 70vh;
  border: 0;
}
</style>
