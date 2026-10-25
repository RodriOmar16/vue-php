<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <h1 class="text-h5">Empresas</h1>
      <v-spacer />
      <v-text-field
        v-model="busqueda"
        label="Buscar"
        prepend-inner-icon="fa-solid fa-magnifying-glass"
        hide-details
        clearable
        class="busqueda"
        density="compact"
      />
      <v-btn color="primary" prepend-icon="fa-solid fa-plus" @click="altaAbierta = true">Nueva empresa</v-btn>
    </div>

    <v-alert v-if="errorCarga" type="error" variant="tonal" class="mb-4" role="alert">
      {{ errorCarga }}
      <template #append><v-btn variant="text" @click="cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="empresas"
      :search="busqueda ?? ''"
      :loading="cargando"
      no-data-text="Todavía no hay empresas. Creá la primera con «Nueva empresa»."
      items-per-page-text="Filas por página"
    >
      <template #[`item.nombre`]="{ item }">
        <div class="font-weight-medium">{{ item.nombre }}</div>
        <div class="text-caption text-medium-emphasis">/{{ item.slug }}</div>
      </template>
      <template #[`item.inhabilitado`]="{ item }">
        <v-chip :color="item.inhabilitado ? 'warning' : 'success'" size="small" variant="tonal">
          {{ item.inhabilitado ? 'Suspendida' : 'Activa' }}
        </v-chip>
      </template>
      <template #[`item.acciones`]="{ item }">
        <v-btn
          icon="fa-solid fa-key"
          variant="text"
          size="small"
          :aria-label="`Resetear la clave del dueño de ${item.nombre}`"
          @click="pedirReset(item)"
        >
          <v-icon>fa-solid fa-key</v-icon>
          <v-tooltip activator="parent" location="top">Resetear clave del dueño</v-tooltip>
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          :aria-label="`${item.inhabilitado ? 'Reactivar' : 'Suspender'} ${item.nombre}`"
          @click="pedirCambioEstado(item)"
        >
          <v-icon>{{ item.inhabilitado ? 'fa-solid fa-play' : 'fa-solid fa-pause' }}</v-icon>
          <v-tooltip activator="parent" location="top">{{ item.inhabilitado ? 'Reactivar' : 'Suspender' }}</v-tooltip>
        </v-btn>
      </template>
    </v-data-table>

    <DialogoAltaEmpresa v-model="altaAbierta" @creada="alCrear" />

    <!-- Suspender / reactivar -->
    <ModalConfirmar
      v-model="confirmarEstado.visible"
      :titulo="confirmarEstado.suspender ? 'Suspender empresa' : 'Reactivar empresa'"
      :color="confirmarEstado.suspender ? 'warning' : 'primary'"
      :icono="confirmarEstado.suspender ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'"
      :texto-confirmar="confirmarEstado.suspender ? 'Suspender' : 'Reactivar'"
      :cargando="trabajando"
      @confirmar="ejecutarCambioEstado"
    >
      <template v-if="confirmarEstado.suspender">
        <strong>{{ confirmarEstado.empresa?.nombre }}</strong> quedará suspendida: su dueño y sus empleados
        <strong>pierden el acceso al instante</strong>. Podés reactivarla cuando quieras.
      </template>
      <template v-else>
        <strong>{{ confirmarEstado.empresa?.nombre }}</strong> volverá a estar activa y su equipo podrá ingresar de nuevo.
      </template>
    </ModalConfirmar>

    <!-- Resetear la clave del dueño -->
    <ModalConfirmar
      v-model="confirmarReset.visible"
      titulo="Resetear clave del dueño"
      color="warning"
      icono="fa-solid fa-key"
      texto-confirmar="Generar clave temporal"
      :cargando="trabajando"
      @confirmar="ejecutarReset()"
    >
      Se generará una <strong>clave temporal nueva</strong> para el dueño de
      <strong>{{ confirmarReset.empresa?.nombre }}</strong>. La que usa hoy dejará de funcionar y deberá cambiar la nueva al ingresar.
    </ModalConfirmar>

    <!-- La empresa tiene varios dueños: elegir a cuál -->
    <v-dialog v-model="elegirDueno.visible" max-width="480">
      <v-card>
        <v-card-title>¿A qué dueño?</v-card-title>
        <v-card-text>
          <p class="mb-2"><strong>{{ elegirDueno.empresa?.nombre }}</strong> tiene varios dueños. Elegí a quién resetearle la clave:</p>
          <v-radio-group v-model="elegirDueno.seleccionado" hide-details>
            <v-radio v-for="d in elegirDueno.duenos" :key="d.id" :value="d.id" :label="`${d.nombre} (${d.email})`" />
          </v-radio-group>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="elegirDueno.visible = false">Cancelar</v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :disabled="!elegirDueno.seleccionado"
            :loading="trabajando"
            @click="ejecutarReset(elegirDueno.seleccionado ?? undefined)"
          >
            Generar clave temporal
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DialogoClaveTemporal v-model="clave.visible" :password="clave.password" :para="clave.para" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { actualizarEmpresa, listarEmpresas, resetearDueno } from '@/api/plataforma';
import { ApiError } from '@/api/http';
import type { EmpresaPlataforma, RespuestaAltaEmpresa, UsuarioResumen } from '@/api/tipos';
import DialogoClaveTemporal from '@/components/utils/DialogoClaveTemporal.vue';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { genericosStore } from '@/store/genericos';
import DialogoAltaEmpresa from './DialogoAltaEmpresa.vue';

const avisos = genericosStore();

const columnas = [
  { title: 'Empresa', key: 'nombre' },
  { title: 'Zona horaria', key: 'zonaHoraria' },
  { title: 'Usuarios', key: '_count.usuarios', align: 'end' as const },
  { title: 'Salones', key: '_count.salones', align: 'end' as const },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const empresas = ref<EmpresaPlataforma[]>([]);
const busqueda = ref<string | null>('');
const cargando = ref(false);
const trabajando = ref(false);
const errorCarga = ref('');
const altaAbierta = ref(false);

const confirmarEstado = reactive({ visible: false, suspender: true, empresa: null as EmpresaPlataforma | null });
const confirmarReset = reactive({ visible: false, empresa: null as EmpresaPlataforma | null });
const elegirDueno = reactive({
  visible: false,
  empresa: null as EmpresaPlataforma | null,
  duenos: [] as UsuarioResumen[],
  seleccionado: null as number | null,
});
const clave = reactive({ visible: false, password: '', para: '' });

const mensajeDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.');

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    empresas.value = await listarEmpresas();
  } catch (e) {
    errorCarga.value = mensajeDe(e);
  } finally {
    cargando.value = false;
  }
}

function mostrarClave(password: string, persona: UsuarioResumen) {
  clave.password = password;
  clave.para = `${persona.nombre} (${persona.email})`;
  clave.visible = true;
}

async function alCrear(respuesta: RespuestaAltaEmpresa) {
  avisos.setSnackBar(`Empresa «${respuesta.empresa.nombre}» creada.`, 'success');
  mostrarClave(respuesta.passwordTemporal, respuesta.dueno);
  await cargar();
}

// ---------- suspender / reactivar ----------
function pedirCambioEstado(empresa: EmpresaPlataforma) {
  confirmarEstado.empresa = empresa;
  confirmarEstado.suspender = !empresa.inhabilitado;
  confirmarEstado.visible = true;
}

async function ejecutarCambioEstado() {
  const empresa = confirmarEstado.empresa;
  if (!empresa) return;
  trabajando.value = true;
  try {
    await actualizarEmpresa(empresa.id, { inhabilitado: confirmarEstado.suspender });
    confirmarEstado.visible = false;
    avisos.setSnackBar(
      confirmarEstado.suspender ? `«${empresa.nombre}» fue suspendida.` : `«${empresa.nombre}» fue reactivada.`,
      'success',
    );
    await cargar();
  } catch (e) {
    avisos.setSnackBar(mensajeDe(e), 'error');
  } finally {
    trabajando.value = false;
  }
}

// ---------- resetear la clave del dueño ----------
function pedirReset(empresa: EmpresaPlataforma) {
  confirmarReset.empresa = empresa;
  confirmarReset.visible = true;
}

/** Sin usuarioId funciona si hay un único dueño; con varios la API responde la lista y se pide elegir. */
async function ejecutarReset(usuarioId?: number) {
  const empresa = confirmarReset.empresa;
  if (!empresa) return;
  trabajando.value = true;
  try {
    const respuesta = await resetearDueno(empresa.id, usuarioId);
    confirmarReset.visible = false;
    elegirDueno.visible = false;
    mostrarClave(respuesta.passwordTemporal, respuesta.dueno);
  } catch (e) {
    const duenos = (e instanceof ApiError && e.status === 400 ? (e.cuerpo as { duenos?: UsuarioResumen[] } | undefined)?.duenos : undefined) ?? [];
    if (duenos.length > 1 && usuarioId === undefined) {
      confirmarReset.visible = false;
      elegirDueno.empresa = empresa;
      elegirDueno.duenos = duenos;
      elegirDueno.seleccionado = null;
      elegirDueno.visible = true;
    } else {
      confirmarReset.visible = false;
      elegirDueno.visible = false;
      avisos.setSnackBar(mensajeDe(e), 'error');
    }
  } finally {
    trabajando.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.busqueda {
  max-width: 260px;
}
</style>
