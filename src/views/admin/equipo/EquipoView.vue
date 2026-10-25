<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <h1 class="text-h5">Equipo</h1>
      <v-spacer />
      <v-switch
        v-model="verBajas"
        label="Mostrar dados de baja"
        color="primary"
        hide-details
        density="compact"
        @update:model-value="cargar"
      />
      <v-btn color="primary" prepend-icon="fa-solid fa-user-plus" @click="abrirAlta">Nueva persona</v-btn>
    </div>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="equipo"
      :loading="cargando"
      no-data-text="No hay personas para mostrar."
      items-per-page-text="Filas por página"
    >
      <template #[`item.nombre`]="{ item }">
        <div class="font-weight-medium">
          {{ item.nombre }}
          <v-chip v-if="esUnoMismo(item)" size="x-small" class="ml-1" variant="tonal">Vos</v-chip>
        </div>
        <div class="text-caption text-medium-emphasis">{{ item.email }} · @{{ item.username }}</div>
      </template>
      <template #[`item.rol`]="{ item }">
        <v-chip size="small" variant="tonal" :color="item.rol === 'propietario' ? 'primary' : undefined">
          {{ ETIQUETA_ROL[item.rol] }}
        </v-chip>
      </template>
      <template #[`item.inhabilitado`]="{ item }">
        <v-chip v-if="item.inhabilitado" size="small" color="warning" variant="tonal">De baja</v-chip>
        <v-chip v-else-if="item.debeCambiarPassword" size="small" color="info" variant="tonal">
          Aún no ingresó
          <v-tooltip activator="parent" location="top">Tiene una clave temporal sin cambiar</v-tooltip>
        </v-chip>
        <v-chip v-else size="small" color="success" variant="tonal">Activo</v-chip>
      </template>
      <template #[`item.acciones`]="{ item }">
        <v-btn variant="text" size="small" :aria-label="`Editar a ${item.nombre}`" @click="abrirEdicion(item)">
          <v-icon>fa-solid fa-pen</v-icon>
          <v-tooltip activator="parent" location="top">Editar</v-tooltip>
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          :disabled="esUnoMismo(item) || item.inhabilitado"
          :aria-label="`Resetear la clave de ${item.nombre}`"
          @click="pedirReset(item)"
        >
          <v-icon>fa-solid fa-key</v-icon>
          <v-tooltip activator="parent" location="top">
            {{ esUnoMismo(item) ? 'Tu clave se cambia desde tu menú' : 'Resetear clave' }}
          </v-tooltip>
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          :disabled="esUnoMismo(item)"
          :aria-label="`${item.inhabilitado ? 'Reactivar' : 'Dar de baja'} a ${item.nombre}`"
          @click="pedirCambioEstado(item)"
        >
          <v-icon>{{ item.inhabilitado ? 'fa-solid fa-user-check' : 'fa-solid fa-user-slash' }}</v-icon>
          <v-tooltip activator="parent" location="top">
            {{ esUnoMismo(item) ? 'No podés darte de baja' : item.inhabilitado ? 'Reactivar' : 'Dar de baja' }}
          </v-tooltip>
        </v-btn>
      </template>
    </v-data-table>

    <DialogoUsuario
      v-model="dialogo.visible"
      :usuario="dialogo.usuario"
      :id-propio="sesion.usuario?.id"
      @creado="alCrear"
      @actualizado="alActualizar"
    />

    <ModalConfirmar
      v-model="confirmarEstado.visible"
      :titulo="confirmarEstado.baja ? 'Dar de baja' : 'Reactivar'"
      :color="confirmarEstado.baja ? 'warning' : 'primary'"
      :icono="confirmarEstado.baja ? 'fa-solid fa-user-slash' : 'fa-solid fa-user-check'"
      :texto-confirmar="confirmarEstado.baja ? 'Dar de baja' : 'Reactivar'"
      :cargando="trabajando"
      @confirmar="ejecutarCambioEstado"
    >
      <template v-if="confirmarEstado.baja">
        <strong>{{ confirmarEstado.usuario?.nombre }}</strong> <strong>perderá el acceso al instante</strong>.
        Sus datos se conservan y podés reactivarlo cuando quieras.
      </template>
      <template v-else>
        <strong>{{ confirmarEstado.usuario?.nombre }}</strong> podrá volver a ingresar con su contraseña actual.
      </template>
    </ModalConfirmar>

    <ModalConfirmar
      v-model="confirmarReset.visible"
      titulo="Resetear clave"
      color="warning"
      icono="fa-solid fa-key"
      texto-confirmar="Generar clave temporal"
      :cargando="trabajando"
      @confirmar="ejecutarReset"
    >
      Se generará una <strong>clave temporal nueva</strong> para <strong>{{ confirmarReset.usuario?.nombre }}</strong>.
      La actual dejará de funcionar y deberá cambiar la nueva al ingresar.
    </ModalConfirmar>

    <DialogoClaveTemporal v-model="clave.visible" :password="clave.password" :para="clave.para" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { actualizarUsuario, listarEquipo, resetearPasswordUsuario } from '@/api/equipo';
import { ApiError } from '@/api/http';
import { ETIQUETA_ROL, type RespuestaAltaUsuario, type UsuarioEquipo } from '@/api/tipos';
import DialogoClaveTemporal from '@/components/utils/DialogoClaveTemporal.vue';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import DialogoUsuario from './DialogoUsuario.vue';

const sesion = useSesionStore();
const avisos = genericosStore();

const columnas = [
  { title: 'Persona', key: 'nombre' },
  { title: 'Rol', key: 'rol' },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const equipo = ref<UsuarioEquipo[]>([]);
const verBajas = ref(false);
const cargando = ref(false);
const trabajando = ref(false);
const errorCarga = ref('');

const dialogo = reactive({ visible: false, usuario: null as UsuarioEquipo | null });
const confirmarEstado = reactive({ visible: false, baja: true, usuario: null as UsuarioEquipo | null });
const confirmarReset = reactive({ visible: false, usuario: null as UsuarioEquipo | null });
const clave = reactive({ visible: false, password: '', para: '' });

const esUnoMismo = (u: UsuarioEquipo) => u.id === sesion.usuario?.id;
const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    equipo.value = await listarEquipo(verBajas.value);
  } catch (e) {
    errorCarga.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

const mostrarClave = (password: string, u: Pick<UsuarioEquipo, 'nombre' | 'email'>) => {
  clave.password = password;
  clave.para = `${u.nombre} (${u.email})`;
  clave.visible = true;
};

// ---------- alta y edición ----------
function abrirAlta() {
  dialogo.usuario = null;
  dialogo.visible = true;
}
function abrirEdicion(usuario: UsuarioEquipo) {
  dialogo.usuario = usuario;
  dialogo.visible = true;
}
async function alCrear(respuesta: RespuestaAltaUsuario) {
  avisos.setSnackBar(`«${respuesta.usuario.nombre}» fue agregado al equipo.`, 'success');
  mostrarClave(respuesta.passwordTemporal, respuesta.usuario);
  await cargar();
}
async function alActualizar(usuario: UsuarioEquipo) {
  avisos.setSnackBar(`Se guardaron los cambios de «${usuario.nombre}».`, 'success');
  await cargar();
}

// ---------- baja / reactivación ----------
function pedirCambioEstado(usuario: UsuarioEquipo) {
  confirmarEstado.usuario = usuario;
  confirmarEstado.baja = !usuario.inhabilitado;
  confirmarEstado.visible = true;
}
async function ejecutarCambioEstado() {
  const usuario = confirmarEstado.usuario;
  if (!usuario) return;
  trabajando.value = true;
  try {
    await actualizarUsuario(usuario.id, { inhabilitado: confirmarEstado.baja });
    confirmarEstado.visible = false;
    avisos.setSnackBar(
      confirmarEstado.baja ? `«${usuario.nombre}» fue dado de baja.` : `«${usuario.nombre}» fue reactivado.`,
      'success',
    );
    await cargar();
  } catch (e) {
    confirmarEstado.visible = false;
    avisos.setSnackBar(mensajeDe(e), 'error');
  } finally {
    trabajando.value = false;
  }
}

// ---------- resetear clave ----------
function pedirReset(usuario: UsuarioEquipo) {
  confirmarReset.usuario = usuario;
  confirmarReset.visible = true;
}
async function ejecutarReset() {
  const usuario = confirmarReset.usuario;
  if (!usuario) return;
  trabajando.value = true;
  try {
    const { passwordTemporal } = await resetearPasswordUsuario(usuario.id);
    confirmarReset.visible = false;
    mostrarClave(passwordTemporal, usuario);
    await cargar(); // vuelve a figurar «Aún no ingresó»
  } catch (e) {
    confirmarReset.visible = false;
    avisos.setSnackBar(mensajeDe(e), 'error');
  } finally {
    trabajando.value = false;
  }
}

onMounted(cargar);
</script>
