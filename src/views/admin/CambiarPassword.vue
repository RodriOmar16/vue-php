<template>
  <v-row justify="center">
    <v-col cols="12" sm="10" md="6" lg="5">
      <h1 class="text-h5 mb-4">Cambiar contraseña</h1>

      <v-alert v-if="sesion.debeCambiarPassword" type="warning" variant="tonal" class="mb-4">
        Estás usando una contraseña temporal. Por seguridad, elegí una propia para poder continuar.
      </v-alert>

      <v-card>
        <v-card-text>
          <v-form ref="formulario" @submit.prevent="enviar">
            <v-text-field
              v-model="actual"
              :label="sesion.debeCambiarPassword ? 'Contraseña temporal' : 'Contraseña actual'"
              type="password"
              autocomplete="current-password"
              :rules="[reglas.requerido]"
              :disabled="enviando"
            />
            <v-text-field
              v-model="nueva"
              label="Contraseña nueva"
              type="password"
              autocomplete="new-password"
              hint="Mínimo 10 caracteres"
              persistent-hint
              class="mb-2"
              :rules="[reglas.requerido, reglas.largo, reglas.distinta]"
              :disabled="enviando"
            />
            <v-text-field
              v-model="repetir"
              label="Repetí la contraseña nueva"
              type="password"
              autocomplete="new-password"
              :rules="[reglas.requerido, reglas.coincide]"
              :disabled="enviando"
            />
            <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4" role="alert">
              {{ error }}
            </v-alert>
            <v-btn type="submit" color="primary" :loading="enviando">Guardar contraseña</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';

const sesion = useSesionStore();
const avisos = genericosStore();
const router = useRouter();

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const actual = ref('');
const nueva = ref('');
const repetir = ref('');
const enviando = ref(false);
const error = ref('');

const reglas = {
  requerido: (v: string) => !!v || 'Campo obligatorio',
  largo: (v: string) => (v?.length ?? 0) >= 10 || 'Debe tener al menos 10 caracteres',
  distinta: (v: string) => v !== actual.value || 'Debe ser distinta de la actual',
  coincide: (v: string) => v === nueva.value || 'Las contraseñas no coinciden',
};

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    await sesion.cambiarPassword(actual.value, nueva.value);
    avisos.setSnackBar('Contraseña actualizada.', 'success');
    await router.replace({ name: 'admin-inicio' });
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
