<template>
  <v-dialog v-model="visible" max-width="620" scrollable :persistent="enviando">
    <v-card>
      <v-card-title>{{ menu ? 'Editar menú' : 'Nuevo menú' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-text-field v-model="nombre" label="Nombre del menú" placeholder="Menú infantil, Menú parrilla..." :rules="[requerido, maximo(100)]" :disabled="enviando" autofocus />
          <v-textarea v-model="descripcion" label="Descripción (opcional)" rows="2" auto-grow :rules="[maximo(2000)]" :disabled="enviando" />

          <v-select v-model="publico" :items="opcionesPublico" item-title="titulo" item-value="valor" label="¿Para quién es?" :disabled="enviando" />

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="precio" label="Precio" type="number" step="0.01" prefix="$" :rules="[requerido, importeValido]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-radio-group v-model="precioPor" label="Se cobra" :disabled="enviando" hide-details>
                <v-radio value="persona" label="Por persona" />
                <v-radio value="fijo" label="Precio fijo" />
              </v-radio-group>
            </v-col>
          </v-row>

          <v-autocomplete
            v-model="alimentoIds"
            :items="opcionesAlimentos"
            item-title="titulo"
            item-value="id"
            label="Qué incluye"
            multiple
            chips
            closable-chips
            :loading="cargandoAlimentos"
            :disabled="enviando"
            no-data-text="No hay alimentos. Cargalos primero en la pestaña «Alimentos»."
            class="mt-2"
          />
          <p v-if="!cargandoAlimentos && alimentosDisponibles.length === 0" class="text-caption text-warning" data-testid="sin-alimentos">
            Todavía no cargaste alimentos: podés guardar el menú ahora y sumarlos después.
          </p>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ menu ? 'Guardar cambios' : 'Crear menú' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarMenu, crearMenu, listarAlimentos } from '@/api/catalogos';
import { ApiError } from '@/api/http';
import type { Alimento, Menu, PrecioPor, PublicoMenu } from '@/api/tipos';
import { ETIQUETA_PUBLICO, ETIQUETA_TIPO_ALIMENTO } from '@/utils/catalogo';
import { aNumero, importeValido } from '@/utils/dinero';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{ modelValue: boolean; menu?: Menu | null }>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardado: [nombre: string, esNuevo: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const opcionesPublico = (Object.keys(ETIQUETA_PUBLICO) as PublicoMenu[]).map((valor) => ({ valor, titulo: ETIQUETA_PUBLICO[valor] }));

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const descripcion = ref('');
const publico = ref<PublicoMenu>('todos');
const precio = ref('');
const precioPor = ref<PrecioPor>('persona');
const alimentoIds = ref<number[]>([]);
const alimentosDisponibles = ref<Alimento[]>([]);
const cargandoAlimentos = ref(false);
const enviando = ref(false);
const error = ref('');

/** Alimentos activos + los que el menú ya tiene aunque estén de baja (para poder verlos y quitarlos). */
const opcionesAlimentos = computed(() => {
  const mapa = new Map<number, { id: number; titulo: string }>();
  const agregar = (a: { id: number; nombre: string; tipo: keyof typeof ETIQUETA_TIPO_ALIMENTO; inhabilitado: boolean }) =>
    mapa.set(a.id, {
      id: a.id,
      titulo: `${a.nombre} · ${ETIQUETA_TIPO_ALIMENTO[a.tipo].toLowerCase()}${a.inhabilitado ? ' (de baja)' : ''}`,
    });
  alimentosDisponibles.value.forEach(agregar);
  props.menu?.alimentos.forEach((a) => {
    if (!mapa.has(a.id)) agregar(a);
  });
  return [...mapa.values()];
});

watch(visible, async (abierto) => {
  if (!abierto) return;
  error.value = '';
  nombre.value = props.menu?.nombre ?? '';
  descripcion.value = props.menu?.descripcion ?? '';
  publico.value = props.menu?.publico ?? 'todos';
  precio.value = props.menu ? String(Number(props.menu.precio)) : '';
  precioPor.value = props.menu?.precioPor ?? 'persona';
  alimentoIds.value = props.menu?.alimentos.map((a) => a.id) ?? [];
  formulario.value?.resetValidation();

  cargandoAlimentos.value = true;
  try {
    alimentosDisponibles.value = await listarAlimentos(false);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los alimentos.';
  } finally {
    cargandoAlimentos.value = false;
  }
});

const mismosIds = (a: number[], b: number[]) => a.length === b.length && a.every((id) => b.includes(id));

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const base = {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim(),
      publico: publico.value,
      precio: aNumero(precio.value)!,
      precioPor: precioPor.value,
    };
    if (props.menu) {
      // alimentoIds reemplaza el conjunto: solo se envía si cambió
      const original = props.menu.alimentos.map((a) => a.id);
      await actualizarMenu(props.menu.id, {
        ...base,
        ...(!mismosIds(alimentoIds.value, original) && { alimentoIds: alimentoIds.value }),
      });
    } else {
      await crearMenu({
        ...base,
        ...(base.descripcion === '' && { descripcion: undefined }),
        ...(alimentoIds.value.length > 0 && { alimentoIds: alimentoIds.value }),
      });
    }
    visible.value = false;
    emit('guardado', base.nombre, !props.menu);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
