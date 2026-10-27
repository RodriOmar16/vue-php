<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-4" elevation="4">
          <v-card-title class="text-h5 pb-0">Elegir una contraseña nueva</v-card-title>

          <v-card-text v-if="!token" data-testid="sin-enlace">
            <v-alert type="error" variant="tonal" density="compact" class="aviso mb-4" role="alert">Este enlace no es válido.</v-alert>
            <v-btn color="primary" block :to="{ name: 'admin-olvide' }">Pedir un enlace nuevo</v-btn>
          </v-card-text>

          <v-card-text v-else-if="listo" data-testid="listo">
            <v-alert type="success" variant="tonal" density="compact" class="mb-4" role="status">
              ¡Listo! Cambiaste tu contraseña. Por seguridad cerramos las sesiones que tenías abiertas.
            </v-alert>
            <v-btn color="primary" block :to="{ name: 'admin-login' }">Ingresar</v-btn>
          </v-card-text>

          <template v-else>
            <v-card-subtitle class="pb-4">Elegí una contraseña que no uses en otro lado.</v-card-subtitle>
            <v-card-text>
              <v-form ref="formulario" @submit.prevent="enviar">
                <v-text-field
                  v-model="nueva"
                  class="campo"
                  label="Contraseña nueva"
                  :type="ver ? 'text' : 'password'"
                  autocomplete="new-password"
                  hint="Mínimo 10 caracteres"
                  persistent-hint
                  :rules="[reglas.requerido, reglas.largo]"
                  :disabled="enviando"
                  :append-inner-icon="ver ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                  autofocus
                  @click:append-inner="ver = !ver"
                />
                <v-text-field
                  v-model="repetida"
                  class="campo"
                  label="Repetí la contraseña"
                  :type="ver ? 'text' : 'password'"
                  autocomplete="new-password"
                  :rules="[reglas.requerido, reglas.coincide]"
                  :disabled="enviando"
                />
                <v-alert v-if="error" type="error" variant="tonal" density="compact" class="aviso mb-4" role="alert">
                  {{ error }}
                  <div v-if="enlaceMuerto" class="mt-2"><router-link :to="{ name: 'admin-olvide' }">Pedir un enlace nuevo</router-link></div>
                </v-alert>
                <v-btn type="submit" color="primary" block size="large" :loading="enviando">Guardar mi contraseña</v-btn>
              </v-form>
            </v-card-text>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { VForm } from 'vuetify/components';
import { restablecerPassword } from '@/api/auth';
import { ApiError } from '@/api/http';

const route = useRoute();
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nueva = ref('');
const repetida = ref('');
const ver = ref(false);
const enviando = ref(false);
const listo = ref(false);
const error = ref('');
// si el enlace ya no sirve (vencido, usado o inválido) lo que corresponde es pedir otro
const enlaceMuerto = ref(false);

const reglas = {
  requerido: (v: string) => !!v || 'Campo obligatorio',
  largo: (v: string) => (v ?? '').length >= 10 || 'Mínimo 10 caracteres',
  coincide: (v: string) => v === nueva.value || 'Las contraseñas no coinciden',
};

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;
  enviando.value = true;
  try {
    await restablecerPassword(token.value, nueva.value);
    listo.value = true;
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
    enlaceMuerto.value = e instanceof ApiError && (e.status === 410 || (e.status === 400 && /enlace/i.test(e.message)));
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped>
.campo {
  margin-bottom: 12px;
}
.campo :deep(.v-input__details) {
  padding-top: 6px;
  padding-inline: 4px;
}
.campo :deep(.v-messages__message) {
  font-size: 0.75rem;
  line-height: 1.25;
}
.campo :deep(.v-field__append-inner .v-icon) {
  font-size: 16px;
}
.aviso {
  font-size: 0.875rem;
}
.aviso :deep(.v-alert__prepend .v-icon) {
  font-size: 18px;
}
</style>
