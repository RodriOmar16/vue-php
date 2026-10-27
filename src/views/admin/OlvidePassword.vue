<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-4" elevation="4">
          <v-card-title class="text-h5 pb-0">Recuperar contraseña</v-card-title>

          <v-card-text v-if="enviado" data-testid="enviado">
            <v-alert type="success" variant="tonal" density="compact" class="mb-4" role="status">
              Si hay una cuenta con <strong>{{ email.trim() }}</strong>, te mandamos un enlace para elegir una contraseña nueva. Sirve una sola vez y vence en 1 hora.
            </v-alert>
            <p class="text-body-2 text-medium-emphasis mb-4">¿No llega? Revisá la carpeta de spam. Podés pedir otro pasado un minuto.</p>
            <v-btn color="primary" block :to="{ name: 'admin-login' }">Volver al ingreso</v-btn>
          </v-card-text>

          <template v-else>
            <v-card-subtitle class="pb-4">Escribí tu email y te mandamos un enlace para elegir una contraseña nueva.</v-card-subtitle>
            <v-card-text>
              <v-form ref="formulario" @submit.prevent="enviar">
                <v-text-field
                  v-model="email"
                  class="campo"
                  label="Email"
                  type="email"
                  autocomplete="username"
                  :rules="[reglas.requerido, reglas.email]"
                  :disabled="enviando"
                  autofocus
                />
                <v-alert v-if="error" type="error" variant="tonal" density="compact" class="aviso mb-4" role="alert">{{ error }}</v-alert>
                <v-btn type="submit" color="primary" block size="large" :loading="enviando">Enviarme el enlace</v-btn>
                <div class="text-center mt-4">
                  <v-btn variant="text" size="small" :to="{ name: 'admin-login' }">Volver al ingreso</v-btn>
                </div>
              </v-form>
            </v-card-text>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { VForm } from 'vuetify/components';
import { olvidePassword } from '@/api/auth';
import { ApiError } from '@/api/http';

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const email = ref('');
const enviando = ref(false);
const enviado = ref(false);
const error = ref('');

const reglas = {
  requerido: (v: string) => !!v?.trim() || 'Campo obligatorio',
  email: (v: string) => /^\S+@\S+\.\S+$/.test(v ?? '') || 'Ingresá un email válido',
};

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;
  enviando.value = true;
  try {
    await olvidePassword(email.value.trim());
    enviado.value = true; // la respuesta es siempre la misma: no se revela si el email tiene cuenta
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
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
.aviso {
  font-size: 0.875rem;
}
.aviso :deep(.v-alert__prepend .v-icon) {
  font-size: 18px;
}
</style>
