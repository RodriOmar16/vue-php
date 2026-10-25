<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <v-spacer />
      <v-switch v-model="c.verBajas.value" label="Mostrar dados de baja" color="primary" hide-details density="compact" @update:model-value="c.cargar" />
      <v-btn v-if="c.puedeEditar.value" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAlta">Nuevo servicio</v-btn>
    </div>

    <v-alert v-if="c.errorCarga.value" type="error" variant="tonal" class="mb-4" role="alert">
      {{ c.errorCarga.value }}
      <template #append><v-btn variant="text" @click="c.cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="c.items.value"
      :loading="c.cargando.value"
      no-data-text="Todavía no hay servicios: mozos, video invitación, decoración..."
      items-per-page-text="Filas por página"
    >
      <template #[`item.nombre`]="{ item }">
        <div class="font-weight-medium">{{ item.nombre }}</div>
        <div v-if="item.descripcion" class="text-caption text-medium-emphasis">{{ item.descripcion }}</div>
      </template>
      <template #[`item.precio`]="{ item }">
        <span class="font-weight-medium">{{ formatearImporte(item.precio) }}</span>
        <span class="text-caption text-medium-emphasis"> {{ sufijoPrecio(item.precioPor) }}</span>
      </template>
      <template #[`item.inhabilitado`]="{ item }">
        <v-chip size="small" :color="item.inhabilitado ? 'warning' : 'success'" variant="tonal">{{ item.inhabilitado ? 'De baja' : 'Activo' }}</v-chip>
      </template>
      <template #[`item.acciones`]="{ item }">
        <template v-if="c.puedeEditar.value">
          <v-btn variant="text" size="small" :aria-label="`Editar ${item.nombre}`" @click="abrirEdicion(item)">
            <v-icon>fa-solid fa-pen</v-icon><v-tooltip activator="parent" location="top">Editar</v-tooltip>
          </v-btn>
          <v-btn variant="text" size="small" :aria-label="`${item.inhabilitado ? 'Reactivar' : 'Dar de baja'} ${item.nombre}`" @click="c.pedirCambioEstado(item)">
            <v-icon>{{ item.inhabilitado ? 'fa-solid fa-rotate-left' : 'fa-solid fa-ban' }}</v-icon>
            <v-tooltip activator="parent" location="top">{{ item.inhabilitado ? 'Reactivar' : 'Dar de baja' }}</v-tooltip>
          </v-btn>
        </template>
      </template>
    </v-data-table>

    <DialogoServicio v-model="dialogo.visible" :servicio="dialogo.servicio" @guardado="c.alGuardar" />

    <ModalConfirmar
      v-model="c.confirmar.visible"
      :titulo="c.tituloConfirmar.value"
      :mensaje="c.mensajeConfirmar.value"
      :color="c.confirmar.baja ? 'warning' : 'primary'"
      :icono="c.confirmar.baja ? 'fa-solid fa-ban' : 'fa-solid fa-rotate-left'"
      :texto-confirmar="c.tituloConfirmar.value"
      :cargando="c.trabajando.value"
      @confirmar="c.ejecutarCambioEstado"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { actualizarServicio, listarServicios } from '@/api/catalogos';
import type { Servicio } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { useCatalogo } from '@/composables/useCatalogo';
import { sufijoPrecio } from '@/utils/catalogo';
import { formatearImporte } from '@/utils/dinero';
import DialogoServicio from './DialogoServicio.vue';

const c = useCatalogo<Servicio>({
  listar: listarServicios,
  cambiarEstado: (id, inhabilitado) => actualizarServicio(id, { inhabilitado }),
});

const columnas = [
  { title: 'Servicio', key: 'nombre' },
  { title: 'Precio', key: 'precio' },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const dialogo = reactive({ visible: false, servicio: null as Servicio | null });
const abrirAlta = () => Object.assign(dialogo, { servicio: null, visible: true });
const abrirEdicion = (servicio: Servicio) => Object.assign(dialogo, { servicio, visible: true });
</script>
