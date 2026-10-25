<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-2 ga-2">
      <h1 class="text-h5">Combos</h1>
      <v-spacer />
      <v-switch v-model="c.verBajas.value" label="Mostrar dados de baja" color="primary" hide-details density="compact" @update:model-value="c.cargar" />
      <v-btn v-if="c.puedeEditar.value" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAlta">Nuevo combo</v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Los paquetes que ofrecés: un precio base con invitados y horas incluidos, y lo que viene dentro.
      Entrá a cada combo para cargar sus tarifas por día o feriado y probar cuánto sale.
    </p>

    <v-alert v-if="c.errorCarga.value" type="error" variant="tonal" class="mb-4" role="alert">
      {{ c.errorCarga.value }}
      <template #append><v-btn variant="text" @click="c.cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="c.items.value"
      :loading="c.cargando.value"
      no-data-text="Todavía no hay combos."
      items-per-page-text="Filas por página"
    >
      <template #[`item.nombre`]="{ item }">
        <router-link :to="{ name: 'admin-combo-detalle', params: { id: item.id } }" class="font-weight-medium">{{ item.nombre }}</router-link>
        <div v-if="item.descripcion" class="text-caption text-medium-emphasis">{{ item.descripcion }}</div>
      </template>
      <template #[`item.precioBase`]="{ item }">
        <div class="font-weight-medium">{{ formatearImporte(item.precioBase) }}</div>
        <div class="text-caption text-medium-emphasis">hasta {{ item.maxPersonas }} personas · {{ item.cantidadHoras }} h</div>
      </template>
      <template #[`item.salones`]="{ item }">
        <span v-if="item.salones.length === 0" class="text-medium-emphasis">Ningún salón</span>
        <div v-else class="d-flex flex-wrap ga-1">
          <v-chip v-for="s in item.salones" :key="s.id" size="x-small" variant="tonal" :class="{ 'text-decoration-line-through': s.inhabilitado }">{{ s.nombre }}</v-chip>
        </div>
      </template>
      <template #[`item.incluye`]="{ item }">
        <span class="text-caption">
          {{ item.menus.length }} {{ item.menus.length === 1 ? 'menú' : 'menús' }} ·
          {{ item.instalaciones.length }} {{ item.instalaciones.length === 1 ? 'instalación' : 'instalaciones' }} ·
          {{ item.servicios.length }} {{ item.servicios.length === 1 ? 'servicio' : 'servicios' }}
        </span>
      </template>
      <template #[`item.inhabilitado`]="{ item }">
        <v-chip size="small" :color="item.inhabilitado ? 'warning' : 'success'" variant="tonal">{{ item.inhabilitado ? 'De baja' : 'Activo' }}</v-chip>
      </template>
      <template #[`item.acciones`]="{ item }">
        <v-btn variant="text" size="small" :aria-label="`Ver el detalle de ${item.nombre}`" :to="{ name: 'admin-combo-detalle', params: { id: item.id } }">
          <v-icon>fa-solid fa-eye</v-icon><v-tooltip activator="parent" location="top">Ver detalle, tarifas y precios</v-tooltip>
        </v-btn>
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

    <DialogoCombo v-model="dialogo.visible" :combo="dialogo.combo" @guardado="c.alGuardar" />

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
import { actualizarCombo, listarCombos } from '@/api/combos';
import type { Combo } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { useCatalogo } from '@/composables/useCatalogo';
import { formatearImporte } from '@/utils/dinero';
import DialogoCombo from './DialogoCombo.vue';

const c = useCatalogo<Combo>({
  listar: listarCombos,
  cambiarEstado: (id, inhabilitado) => actualizarCombo(id, { inhabilitado }),
});

const columnas = [
  { title: 'Combo', key: 'nombre' },
  { title: 'Precio base', key: 'precioBase' },
  { title: 'Se ofrece en', key: 'salones', sortable: false },
  { title: 'Incluye', key: 'incluye', sortable: false },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

const dialogo = reactive({ visible: false, combo: null as Combo | null });
const abrirAlta = () => Object.assign(dialogo, { combo: null, visible: true });
const abrirEdicion = (combo: Combo) => Object.assign(dialogo, { combo, visible: true });
</script>
