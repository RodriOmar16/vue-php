<template>
  <v-dialog v-model="visible" max-width="520" :persistent="enviando">
    <v-card>
      <v-card-title>{{ servicio ? 'Editar servicio' : 'Nuevo servicio' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-text-field v-model="nombre" label="Nombre" placeholder="Mozos, video invitación, decoración, animador..." :rules="[requerido, maximo(150)]" :disabled="enviando" autofocus />
          <v-textarea v-model="descripcion" label="Descripción (opcional)" rows="2" auto-grow :rules="[maximo(2000)]" :disabled="enviando" />
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="precio" label="Precio" type="number" step="0.01" prefix="$" :rules="[requerido, importeValido]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-radio-group v-model="precioPor" label="Se cobra" :disabled="enviando" hide-details>
                <v-radio value="fijo" label="Precio fijo" />
                <v-radio value="persona" label="Por persona" />
              </v-radio-group>
            </v-col>
          </v-row>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ servicio ? 'Guardar cambios' : 'Agregar' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarServicio, crearServicio } from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { PrecioPor, Servicio } from '@/api/tipos';
import { aNumero, importeValido } from '@/utils/dinero';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{ modelValue: boolean; servicio?: Servicio | null }>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardado: [nombre: string, esNuevo: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const descripcion = ref('');
const precio = ref('');
const precioPor = ref<PrecioPor>('fijo');
const enviando = ref(false);
const error = ref('');

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  nombre.value = props.servicio?.nombre ?? '';
  descripcion.value = props.servicio?.descripcion ?? '';
  precio.value = props.servicio ? String(Number(props.servicio.precio)) : '';
  precioPor.value = props.servicio?.precioPor ?? 'fijo';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const datos = {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      precio: aNumero(precio.value)!,
      precioPor: precioPor.value,
    };
    if (props.servicio) {
      await actualizarServicio(props.servicio.id, datos);
    } else {
      await crearServicio({ ...datos, ...(datos.descripcion === '' && { descripcion: undefined }) });
    }
    visible.value = false;
    emit('guardado', datos.nombre, !props.servicio);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
