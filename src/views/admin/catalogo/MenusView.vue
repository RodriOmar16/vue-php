<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <v-spacer />
      <v-switch v-model="c.verBajas.value" label="Mostrar dados de baja" color="primary" hide-details density="compact" @update:model-value="c.cargar" />
      <v-btn v-if="c.puedeEditar.value" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAlta">Nuevo menú</v-btn>
    </div>

    <v-alert v-if="c.errorCarga.value" type="error" variant="tonal" class="mb-4" role="alert">
      {{ c.errorCarga.value }}
      <template #append><v-btn variant="text" @click="c.cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="c.items.value"
      :loading="c.cargando.value"
      no-data-text="Todavía no hay menús."
      items-per-page-text="Filas por página"
    >
      <template #[`item.nombre`]="{ item }">
        <div class="font-weight-medium">{{ item.nombre }}</div>
        <div v-if="item.descripcion" class="text-caption text-medium-emphasis">{{ item.descripcion }}</div>
      </template>
      <template #[`item.publico`]="{ item }">{{ ETIQUETA_PUBLICO[item.publico] }}</template>
      <template #[`item.precio`]="{ item }">
        <span class="font-weight-medium">{{ formatearImporte(item.precio) }}</span>
        <span class="text-caption text-medium-emphasis"> {{ sufijoPrecio(item.precioPor) }}</span>
      </template>
      <template #[`item.alimentos`]="{ item }">
        <span v-if="item.alimentos.length === 0" class="text-medium-emphasis">Sin alimentos</span>
        <div v-else class="d-flex flex-wrap ga-1 py-1">
          <v-chip v-for="a in item.alimentos" :key="a.id" size="x-small" variant="tonal" :prepend-icon="ICONO_TIPO_ALIMENTO[a.tipo]" :class="{ 'text-decoration-line-through': a.inhabilitado }">
            {{ a.nombre }}
          </v-chip>
        </div>
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

    <DialogoMenu v-model="dialogo.visible" :menu="dialogo.menu" @guardado="c.alGuardar" />

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
import { actualizarMenu, listarMenus } from '@/api/catalogos';
import type { Menu } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { useCatalogo } from '@/composables/useCatalogo';
import { ETIQUETA_PUBLICO, ICONO_TIPO_ALIMENTO, sufijoPrecio } from '@/utils/catalogo';
import { formatearImporte } from '@/utils/dinero';
import DialogoMenu from './DialogoMenu.vue';

const c = useCatalogo<Menu>({
  listar: listarMenus,
  cambiarEstado: (id, inhabilitado) => actualizarMenu(id, { inhabilitado }),
});

const columnas = [
  { title: 'Menú', key: 'nombre' },
  { title: 'Para', key: 'publico' },
  { title: 'Precio', key: 'precio' },
  { title: 'Incluye', key: 'alimentos', sortable: false },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const dialogo = reactive({ visible: false, menu: null as Menu | null });
const abrirAlta = () => Object.assign(dialogo, { menu: null, visible: true });
const abrirEdicion = (menu: Menu) => Object.assign(dialogo, { menu, visible: true });
</script>
