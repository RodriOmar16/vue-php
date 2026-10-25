<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <v-spacer />
      <v-switch v-model="c.verBajas.value" label="Mostrar dados de baja" color="primary" hide-details density="compact" @update:model-value="c.cargar" />
      <v-btn v-if="c.puedeEditar.value" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAlta">Nueva instalación</v-btn>
    </div>

    <v-alert v-if="c.errorCarga.value" type="error" variant="tonal" class="mb-4" role="alert">
      {{ c.errorCarga.value }}
      <template #append><v-btn variant="text" @click="c.cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="c.items.value"
      :loading="c.cargando.value"
      no-data-text="Todavía no hay instalaciones: juegos y atracciones de tu salón."
      items-per-page-text="Filas por página"
    >
      <template #[`item.nombre`]="{ item }">
        <div class="font-weight-medium">{{ item.nombre }}</div>
        <div v-if="item.descripcion" class="text-caption text-medium-emphasis">{{ item.descripcion }}</div>
      </template>
      <template #[`item.edades`]="{ item }">{{ textoEdades(item.edadMin, item.edadMax) }}</template>
      <template #[`item.precio`]="{ item }">
        <span v-if="Number(item.precio) === 0" class="text-medium-emphasis">Sin cargo</span>
        <span v-else class="font-weight-medium">{{ formatearImporte(item.precio) }}</span>
      </template>
      <template #[`item.inhabilitado`]="{ item }">
        <v-chip size="small" :color="item.inhabilitado ? 'warning' : 'success'" variant="tonal">{{ item.inhabilitado ? 'De baja' : 'Activa' }}</v-chip>
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

    <DialogoInstalacion v-model="dialogo.visible" :instalacion="dialogo.instalacion" @guardado="c.alGuardar" />

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
import { actualizarInstalacion, listarInstalaciones } from '@/api/catalogos';
import type { Instalacion } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { useCatalogo } from '@/composables/useCatalogo';
import { textoEdades } from '@/utils/catalogo';
import { formatearImporte } from '@/utils/dinero';
import DialogoInstalacion from './DialogoInstalacion.vue';

const c = useCatalogo<Instalacion>({
  listar: listarInstalaciones,
  cambiarEstado: (id, inhabilitado) => actualizarInstalacion(id, { inhabilitado }),
  genero: 'f',
});

const columnas = [
  { title: 'Instalación', key: 'nombre' },
  { title: 'Edades', key: 'edades', sortable: false },
  { title: 'Precio adicional', key: 'precio' },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const dialogo = reactive({ visible: false, instalacion: null as Instalacion | null });
const abrirAlta = () => Object.assign(dialogo, { instalacion: null, visible: true });
const abrirEdicion = (instalacion: Instalacion) => Object.assign(dialogo, { instalacion, visible: true });
</script>
