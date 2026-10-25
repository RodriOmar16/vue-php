<template>
  <v-dialog v-model="visible" max-width="640" scrollable :persistent="enviando">
    <v-card>
      <v-card-title>Nueva empresa</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <h3 class="text-subtitle-1 mb-2">Empresa</h3>
          <v-text-field
            v-model="nombre"
            label="Nombre"
            :rules="[reglas.requerido, reglas.maximo150]"
            :disabled="enviando"
            autofocus
            @update:model-value="sugerirSlug"
          />
          <v-text-field
            v-model="slug"
            label="Slug (dirección web)"
            hint="Aparece en la URL pública. Solo minúsculas, números y guiones."
            persistent-hint
            class="mb-2"
            :rules="[reglas.requerido, reglas.slugFormato, reglas.slugLargo, reglas.slugReservado]"
            :disabled="enviando"
            @update:model-value="slugEditadoAMano = true"
          />
          <v-select
            v-model="zonaHoraria"
            :items="ZONAS"
            label="Zona horaria"
            hint="Define a qué día y hora corresponden los eventos"
            persistent-hint
            class="mb-2"
            :disabled="enviando"
          />
          <v-text-field
            v-model="nombreSalon"
            label="Nombre del primer salón (opcional)"
            placeholder="Salón principal"
            :rules="[reglas.maximo100]"
            :disabled="enviando"
          />

          <h3 class="text-subtitle-1 mt-4 mb-2">Primer dueño</h3>
          <v-text-field v-model="dueno.nombre" label="Nombre y apellido" :rules="[reglas.requerido, reglas.maximo100]" :disabled="enviando" />
          <v-text-field
            v-model="dueno.email"
            label="Email"
            type="email"
            :rules="[reglas.requerido, reglas.email]"
            :disabled="enviando"
            @update:model-value="sugerirUsername"
          />
          <v-text-field
            v-model="dueno.username"
            label="Nombre de usuario"
            hint="Minúsculas, números, punto, guion y guion bajo"
            persistent-hint
            class="mb-2"
            :rules="[reglas.requerido, reglas.usernameFormato, reglas.usernameLargo]"
            :disabled="enviando"
            @update:model-value="usernameEditadoAMano = true"
          />
          <p class="text-caption text-medium-emphasis">
            Se le generará una contraseña temporal que verás una sola vez al crear la empresa.
          </p>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">Crear empresa</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { crearEmpresa } from '@/api/plataforma';
import { ApiError } from '@/api/http';
import type { RespuestaAltaEmpresa } from '@/api/tipos';
import { email, maximo, requerido, usernameDesdeEmail, usernameFormato, usernameLargo } from '@/utils/reglas';
import { SLUG_VALIDO, SLUGS_RESERVADOS, slugificar } from '@/utils/slug';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  creada: [respuesta: RespuestaAltaEmpresa];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const ZONA_POR_DEFECTO = 'America/Argentina/Buenos_Aires';
const ZONAS = [
  ZONA_POR_DEFECTO,
  'America/Montevideo',
  'America/Santiago',
  'America/Asuncion',
  'America/La_Paz',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'Europe/Madrid',
];

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const slug = ref('');
const zonaHoraria = ref(ZONA_POR_DEFECTO);
const nombreSalon = ref('');
const dueno = reactive({ nombre: '', email: '', username: '' });
const slugEditadoAMano = ref(false);
const usernameEditadoAMano = ref(false);
const enviando = ref(false);
const error = ref('');

// Mientras no toques el slug / el usuario a mano, se sugieren a partir del nombre / el email.
const sugerirSlug = (valor: string) => {
  if (!slugEditadoAMano.value) slug.value = slugificar(valor);
};
const sugerirUsername = (correo: string) => {
  if (!usernameEditadoAMano.value) dueno.username = usernameDesdeEmail(correo);
};

const reglas = {
  requerido,
  maximo150: maximo(150),
  maximo100: maximo(100),
  email,
  usernameFormato,
  usernameLargo,
  slugFormato: (v: string) => !v || SLUG_VALIDO.test(v) || 'Solo minúsculas, números y guiones simples entre palabras',
  slugLargo: (v: string) => !v || (v.length >= 3 && v.length <= 60) || 'Entre 3 y 60 caracteres',
  slugReservado: (v: string) => !SLUGS_RESERVADOS.includes(v) || 'Ese slug está reservado, elegí otro',
};

function reiniciar() {
  nombre.value = '';
  slug.value = '';
  zonaHoraria.value = ZONA_POR_DEFECTO;
  nombreSalon.value = '';
  Object.assign(dueno, { nombre: '', email: '', username: '' });
  slugEditadoAMano.value = false;
  usernameEditadoAMano.value = false;
  error.value = '';
  formulario.value?.resetValidation();
}

watch(visible, (abierto) => {
  if (abierto) reiniciar();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const respuesta = await crearEmpresa({
      nombre: nombre.value.trim(),
      slug: slug.value.trim(),
      zonaHoraria: zonaHoraria.value,
      ...(nombreSalon.value.trim() && { nombreSalon: nombreSalon.value.trim() }),
      dueno: {
        nombre: dueno.nombre.trim(),
        email: dueno.email.trim(),
        username: dueno.username.trim(),
      },
    });
    visible.value = false;
    emit('creada', respuesta);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
