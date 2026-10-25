<template>
  <v-dialog v-model="visible" max-width="520" :persistent="enviando">
    <v-card>
      <v-card-title>{{ editando ? 'Editar persona' : 'Nueva persona del equipo' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-text-field
            v-model="nombre"
            label="Nombre y apellido"
            :rules="[requerido, maximo(100)]"
            :disabled="enviando"
            autofocus
          />

          <!-- Email y usuario no se pueden cambiar desde la API: solo se eligen al dar de alta -->
          <template v-if="!editando">
            <v-text-field
              v-model="correo"
              label="Email"
              type="email"
              hint="Con este email va a ingresar"
              persistent-hint
              class="mb-2"
              :rules="[requerido, email]"
              :disabled="enviando"
              @update:model-value="sugerirUsername"
            />
            <v-text-field
              v-model="username"
              label="Nombre de usuario"
              hint="Minúsculas, números, punto, guion y guion bajo"
              persistent-hint
              class="mb-2"
              :rules="[requerido, usernameFormato, usernameLargo]"
              :disabled="enviando"
              @update:model-value="usernameEditadoAMano = true"
            />
          </template>
          <p v-else class="text-body-2 text-medium-emphasis mb-4">
            {{ usuario?.email }} · @{{ usuario?.username }}
          </p>

          <v-radio-group v-model="rol" label="¿Qué puede hacer?" :disabled="enviando || esUnoMismo" :hint="esUnoMismo ? 'No podés cambiar tu propio rol' : undefined" persistent-hint>
            <v-radio value="empleado">
              <template #label>
                <div>
                  <strong>Empleado</strong>
                  <div class="text-caption text-medium-emphasis">Consulta el catálogo y gestiona las reservas y los pagos.</div>
                </div>
              </template>
            </v-radio>
            <v-radio value="propietario" class="mt-2">
              <template #label>
                <div>
                  <strong>Dueño</strong>
                  <div class="text-caption text-medium-emphasis">Además define combos, precios y horarios, y administra el equipo.</div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>

          <p v-if="!editando" class="text-caption text-medium-emphasis">
            Se le generará una contraseña temporal que verás una sola vez al guardar.
          </p>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">
          {{ editando ? 'Guardar cambios' : 'Crear' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarUsuario, crearUsuario } from '@/api/equipo';
import { ApiError } from '@/api/http';
import type { RespuestaAltaUsuario, RolEquipo, UsuarioEquipo } from '@/api/tipos';
import { email, maximo, requerido, usernameDesdeEmail, usernameFormato, usernameLargo } from '@/utils/reglas';

const props = defineProps<{
  modelValue: boolean;
  /** Si se indica, el diálogo edita a esa persona; si no, da de alta una nueva. */
  usuario?: UsuarioEquipo | null;
  /** id de quien está usando el panel: no puede cambiarse a sí mismo el rol */
  idPropio?: number;
}>();
const emit = defineEmits<{
  'update:modelValue': [valor: boolean];
  creado: [respuesta: RespuestaAltaUsuario];
  actualizado: [usuario: UsuarioEquipo];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});
const editando = computed(() => !!props.usuario);
const esUnoMismo = computed(() => !!props.usuario && props.usuario.id === props.idPropio);

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const correo = ref('');
const username = ref('');
const rol = ref<RolEquipo>('empleado');
const usernameEditadoAMano = ref(false);
const enviando = ref(false);
const error = ref('');

const sugerirUsername = (valor: string) => {
  if (!usernameEditadoAMano.value) username.value = usernameDesdeEmail(valor);
};

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  usernameEditadoAMano.value = false;
  nombre.value = props.usuario?.nombre ?? '';
  correo.value = '';
  username.value = '';
  rol.value = props.usuario?.rol ?? 'empleado';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    if (props.usuario) {
      // Solo se envía lo que cambió (el rol propio no se puede tocar)
      const cambios: { nombre?: string; rol?: RolEquipo } = {};
      if (nombre.value.trim() !== props.usuario.nombre) cambios.nombre = nombre.value.trim();
      if (!esUnoMismo.value && rol.value !== props.usuario.rol) cambios.rol = rol.value;
      if (Object.keys(cambios).length === 0) {
        visible.value = false;
        return;
      }
      const actualizado = await actualizarUsuario(props.usuario.id, cambios);
      visible.value = false;
      emit('actualizado', actualizado);
    } else {
      const respuesta = await crearUsuario({
        nombre: nombre.value.trim(),
        email: correo.value.trim(),
        username: username.value.trim(),
        rol: rol.value,
      });
      visible.value = false;
      emit('creado', respuesta);
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
