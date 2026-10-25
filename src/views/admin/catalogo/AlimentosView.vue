<template>
  <div>
    <div class="d-flex flex-wrap align-center mb-4 ga-2">
      <v-btn-toggle v-model="filtroTipo" color="primary" density="compact" variant="outlined" divided>
        <v-btn value="comida" size="small">Comidas</v-btn>
        <v-btn value="bebida" size="small">Bebidas</v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-switch v-model="c.verBajas.value" label="Mostrar dados de baja" color="primary" hide-details density="compact" @update:model-value="c.cargar" />
      <v-btn v-if="c.puedeEditar.value" color="primary" prepend-icon="fa-solid fa-plus" @click="abrirAlta">Nuevo alimento</v-btn>
    </div>

    <v-alert v-if="c.errorCarga.value" type="error" variant="tonal" class="mb-4" role="alert">
      {{ c.errorCarga.value }}
      <template #append><v-btn variant="text" @click="c.cargar">Reintentar</v-btn></template>
    </v-alert>

    <v-data-table
      :headers="columnas"
      :items="visibles"
      :loading="c.cargando.value"
      no-data-text="Todavía no hay alimentos. Son los ingredientes con los que armás tus menús."
      items-per-page-text="Filas por página"
    >
      <template #[`item.tipo`]="{ item }">
        <v-chip size="small" variant="tonal" :prepend-icon="ICONO_TIPO_ALIMENTO[item.tipo]">{{ ETIQUETA_TIPO_ALIMENTO[item.tipo] }}</v-chip>
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

    <DialogoAlimento v-model="dialogo.visible" :alimento="dialogo.alimento" @guardado="c.alGuardar" />

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
import { computed, reactive, ref } from 'vue';
import { actualizarAlimento, listarAlimentos } from '@/api/catalogos';
import type { Alimento, TipoAlimento } from '@/api/tipos';
import ModalConfirmar from '@/components/utils/ModalConfirmar.vue';
import { useCatalogo } from '@/composables/useCatalogo';
import { ETIQUETA_TIPO_ALIMENTO, ICONO_TIPO_ALIMENTO } from '@/utils/catalogo';
import DialogoAlimento from './DialogoAlimento.vue';

const c = useCatalogo<Alimento>({
  listar: listarAlimentos,
  cambiarEstado: (id, inhabilitado) => actualizarAlimento(id, { inhabilitado }),
});

const columnas = [
  { title: 'Nombre', key: 'nombre' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Estado', key: 'inhabilitado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
];

// Filtro por tipo en el navegador: son pocos registros y evita otra consulta
const filtroTipo = ref<TipoAlimento | undefined>(undefined);
const visibles = computed(() => (filtroTipo.value ? c.items.value.filter((a) => a.tipo === filtroTipo.value) : c.items.value));

const dialogo = reactive({ visible: false, alimento: null as Alimento | null });
const abrirAlta = () => Object.assign(dialogo, { alimento: null, visible: true });
const abrirEdicion = (alimento: Alimento) => Object.assign(dialogo, { alimento, visible: true });
</script>
