<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-4" elevation="4">
          <v-card-title class="text-h5 pb-0">Acceso al panel</v-card-title>
          <v-card-subtitle class="pb-4">Ingresá con tu email y contraseña</v-card-subtitle>
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
              <v-text-field
                v-model="password"
                class="campo"
                label="Contraseña"
                :type="verClave ? 'text' : 'password'"
                autocomplete="current-password"
                :rules="[reglas.requerido]"
                :disabled="enviando"
                :append-inner-icon="verClave ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                @click:append-inner="verClave = !verClave"
              />
              <v-alert v-if="error" type="error" variant="tonal" density="compact" class="aviso mb-4" role="alert">
                {{ error }}
              </v-alert>
              <v-btn type="submit" color="primary" block size="large" :loading="enviando">Ingresar</v-btn>
              <div class="text-center mt-4">
                <v-btn variant="text" size="small" :to="{ name: 'admin-olvide' }" data-testid="olvide">¿Olvidaste tu contraseña?</v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* Cada campo deja aire debajo y su mensaje de error es más chico, para que no quede pegado al campo siguiente. */
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

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { VForm } from 'vuetify/components';
import { ApiError } from '@/api/http';
import { autoLoginPermitido, credencialesDeDesarrollo, permitirAutoLogin } from '@/router/autologin';
import { esRedireccionSegura } from '@/router/redireccion';
import { useSesionStore } from '@/store/sesion';

const sesion = useSesionStore();
const router = useRouter();
const route = useRoute();

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const email = ref('');
const password = ref('');
const verClave = ref(false);
const enviando = ref(false);
const error = ref('');

const reglas = {
  requerido: (v: string) => !!v?.trim() || 'Campo obligatorio',
  email: (v: string) => /^\S+@\S+\.\S+$/.test(v ?? '') || 'Ingresá un email válido',
};

const mensajeDeError = (e: unknown): string => {
  if (e instanceof ApiError) {
    // En el login un 401 significa credenciales incorrectas (la API no distingue cuál de las dos).
    if (e.status === 401) return 'Email o contraseña incorrectos.';
    return e.message;
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
};

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    await sesion.iniciarSesion(email.value, password.value);
    permitirAutoLogin();
    const destino = route.query.redirect;
    await router.replace(esRedireccionSegura(destino) ? destino : { name: 'admin-inicio' });
  } catch (e) {
    error.value = mensajeDeError(e);
    password.value = '';
  } finally {
    enviando.value = false;
  }
}

onMounted(() => {
  const dev = credencialesDeDesarrollo(import.meta.env);
  if (dev && autoLoginPermitido()) {
    email.value = dev.email;
    password.value = dev.password;
    void enviar();
  }
});
</script>
