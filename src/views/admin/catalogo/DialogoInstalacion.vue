<template>
  <v-dialog v-model="visible" max-width="640" scrollable :persistent="enviando">
    <v-card>
      <v-card-title>{{ instalacion ? 'Editar instalación' : 'Nueva instalación' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-text-field v-model="nombre" label="Nombre" placeholder="Pelotero, cama elástica, metegol..." :rules="[requerido, maximo(150)]" :disabled="enviando" autofocus />
          <v-textarea v-model="descripcion" label="Descripción (opcional)" rows="2" auto-grow :rules="[maximo(2000)]" :disabled="enviando" />
          <v-text-field
            v-model="precio"
            label="Precio como adicional"
            type="number"
            step="0.01"
            prefix="$"
            hint="Lo que se cobra si el cliente la suma a su reserva. Dejalo en blanco o en 0 si no se cobra aparte."
            persistent-hint
            class="mb-2"
            :rules="[importeValido]"
            :disabled="enviando"
          />
          <v-radio-group v-model="modoEdad" label="¿Para qué edades es?" :disabled="enviando" hide-details class="mb-2">
            <v-radio value="atp" label="Apto para todo público (ATP)" />
            <v-radio value="limite" label="Con límite de edad" />
          </v-radio-group>
          <template v-if="modoEdad === 'limite'">
            <v-row>
              <v-col cols="6">
                <v-text-field v-model="edadMin" label="Edad mínima" type="number" suffix="años" :rules="[regla.edad, regla.alMenosUna]" :disabled="enviando" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="edadMax" label="Edad máxima" type="number" suffix="años" :rules="[regla.edad, regla.orden]" :disabled="enviando" />
              </v-col>
            </v-row>
            <p class="text-caption text-medium-emphasis">Podés indicar solo la mínima, solo la máxima, o las dos.</p>
          </template>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
        <v-divider class="my-4" />
        <GaleriaMedios v-if="instalacion" tipo="instalaciones" :id="instalacion.id" editable />
        <p v-else class="text-caption text-medium-emphasis">Podrás agregar fotos después de crear la instalación.</p>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ instalacion ? 'Guardar cambios' : 'Agregar' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import GaleriaMedios from '@/components/GaleriaMedios.vue';
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarInstalacion, crearInstalacion } from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { Instalacion } from '@/api/tipos';
import { aNumero, importeValido } from '@/utils/dinero';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{ modelValue: boolean; instalacion?: Instalacion | null }>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardado: [nombre: string, esNuevo: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const descripcion = ref('');
const precio = ref('');
const edadMin = ref('');
const edadMax = ref('');
const modoEdad = ref<'atp' | 'limite'>('atp');
const enviando = ref(false);
const error = ref('');

const regla = {
  edad: (v: string) => v === '' || v === null || (/^\d+$/.test(String(v).trim()) && Number(v) <= 120) || 'Un número entero entre 0 y 120',
  alMenosUna: () => edadMin.value !== '' || edadMax.value !== '' || 'Indicá al menos una edad (o elegí «Apto para todo público»)',
  orden: (v: string) =>
    v === '' || edadMin.value === '' || Number(v) >= Number(edadMin.value) || 'No puede ser menor que la edad mínima',
};

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  const i = props.instalacion;
  nombre.value = i?.nombre ?? '';
  descripcion.value = i?.descripcion ?? '';
  precio.value = i ? String(Number(i.precio)) : '';
  edadMin.value = i?.edadMin?.toString() ?? '';
  edadMax.value = i?.edadMax?.toString() ?? '';
  modoEdad.value = i && (i.edadMin !== null || i.edadMax !== null) ? 'limite' : 'atp';
  formulario.value?.resetValidation();
});

/** Vacío = sin restricción. Al editar se envía null para QUITAR una edad que antes estaba cargada. */
const edad = (texto: string, original: number | null | undefined): number | null | undefined => {
  const n = aNumero(texto);
  if (n !== null) return n;
  return original === null || original === undefined ? undefined : null;
};

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const i = props.instalacion;
    const datos = {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      precio: aNumero(precio.value) ?? 0,
      // ATP = sin límites: se envían vacías (null si antes tenían, para QUITARLAS)
      edadMin: edad(modoEdad.value === 'limite' ? edadMin.value : '', i?.edadMin),
      edadMax: edad(modoEdad.value === 'limite' ? edadMax.value : '', i?.edadMax),
    };
    if (i) {
      await actualizarInstalacion(i.id, datos);
    } else {
      await crearInstalacion({ ...datos, ...(datos.descripcion === '' && { descripcion: undefined }) });
    }
    visible.value = false;
    emit('guardado', datos.nombre, !i);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
