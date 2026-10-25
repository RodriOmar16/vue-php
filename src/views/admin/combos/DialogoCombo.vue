<template>
  <v-dialog v-model="visible" max-width="820" scrollable :persistent="enviando">
    <v-card>
      <v-card-title>{{ combo ? 'Editar combo' : 'Nuevo combo' }}</v-card-title>
      <v-card-text>
        <v-form ref="formulario" @submit.prevent="enviar">
          <h3 class="text-subtitle-1 mb-2">El combo</h3>
          <v-text-field v-model="nombre" label="Nombre del combo" placeholder="Combo cumpleaños, Fiesta de 15..." :rules="[requerido, maximo(100)]" :disabled="enviando" autofocus />
          <v-textarea v-model="descripcion" label="Descripción (opcional)" rows="2" auto-grow :rules="[maximo(4000)]" :disabled="enviando" />

          <h3 class="text-subtitle-1 mt-4 mb-2">Precio y capacidad</h3>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="precioBase" label="Precio base" type="number" step="0.01" prefix="$" :rules="[requerido, importeValido]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="maxPersonas" label="Invitados incluidos" type="number" suffix="personas" :rules="[requerido, regla.personas]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="precioAdicionalPersona"
                label="Precio por invitado extra"
                type="number"
                step="0.01"
                prefix="$"
                hint="Por cada persona que supere los invitados incluidos"
                persistent-hint
                :rules="[importeValido]"
                :disabled="enviando"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="cantidadHoras" label="Duración incluida" type="number" suffix="horas" :rules="[requerido, regla.horas]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="precioHoraExtra"
                label="Precio de cada hora extra"
                type="number"
                step="0.01"
                prefix="$"
                hint="Si el cliente quiere estirar el evento (a tu criterio)"
                persistent-hint
                :rules="[importeValido]"
                :disabled="enviando"
              />
            </v-col>
          </v-row>

          <h3 class="text-subtitle-1 mt-6 mb-1">Dónde se ofrece</h3>
          <p v-if="!cargandoOpciones && salones.length === 0" class="text-caption text-warning" data-testid="sin-salones">
            Todavía no cargaste salones. Podés guardar el combo ahora y asignarlo después.
          </p>
          <div class="d-flex flex-wrap">
            <v-checkbox
              v-for="s in opcionesSalones"
              :key="s.id"
              v-model="salonIds"
              :value="s.id"
              :label="s.titulo"
              density="compact"
              hide-details
              class="mr-4"
              :disabled="enviando"
            />
          </div>

          <h3 class="text-subtitle-1 mt-6 mb-1">Qué incluye</h3>
          <v-autocomplete
            v-model="menuIds"
            :items="opcionesMenus"
            item-title="titulo"
            item-value="id"
            label="Opciones de menú"
            hint="El cliente elige UNA de estas opciones y viene incluida en el precio base."
            persistent-hint
            multiple
            chips
            closable-chips
            :loading="cargandoOpciones"
            :disabled="enviando"
            no-data-text="No hay menús. Cargalos primero en Catálogo → Menús."
          />
          <v-row v-for="id in menuIds" :key="id" dense class="align-center">
            <v-col cols="12" sm="6" class="text-body-2">{{ nombreMenu(id) }}</v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="recargos[id]"
                :label="`Recargo · ${nombreMenu(id)}`"
                type="number"
                step="0.01"
                prefix="$"
                hint="Opcional: se suma si el cliente elige esta opción"
                persistent-hint
                :rules="[importeValido]"
                :disabled="enviando"
              />
            </v-col>
          </v-row>

          <v-autocomplete
            v-model="instalacionIds"
            :items="opcionesInstalaciones"
            item-title="titulo"
            item-value="id"
            label="Instalaciones incluidas"
            hint="Todo lo que elijas viene incluido en el precio base."
            persistent-hint
            multiple
            chips
            closable-chips
            class="mt-4"
            :loading="cargandoOpciones"
            :disabled="enviando"
            no-data-text="No hay instalaciones. Cargalas en Catálogo → Instalaciones."
          />
          <v-autocomplete
            v-model="servicioIds"
            :items="opcionesServicios"
            item-title="titulo"
            item-value="id"
            label="Servicios incluidos"
            hint="Todo lo que elijas viene incluido en el precio base."
            persistent-hint
            multiple
            chips
            closable-chips
            class="mt-4"
            :loading="cargandoOpciones"
            :disabled="enviando"
            no-data-text="No hay servicios. Cargalos en Catálogo → Servicios."
          />
          <p class="text-caption text-medium-emphasis mt-2">
            Lo que no incluyas acá el cliente igual puede sumarlo como adicional, al precio de tu catálogo.
          </p>

          <v-textarea v-model="observaciones" label="Observaciones (opcional)" rows="2" auto-grow class="mt-4" :rules="[maximo(4000)]" :disabled="enviando" />

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ combo ? 'Guardar cambios' : 'Crear combo' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarCombo, crearCombo } from '@/api/combos';
import { listarInstalaciones, listarMenus, listarServicios } from '@/api/catalogos';
import { ApiError } from '@/api/http';
import { listarSalones } from '@/api/salones';
import type { Combo, Instalacion, Menu, Salon, Servicio } from '@/api/tipos';
import { aNumero, importeValido } from '@/utils/dinero';
import { maximo, requerido } from '@/utils/reglas';

const props = defineProps<{ modelValue: boolean; combo?: Combo | null }>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardado: [nombre: string, esNuevo: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const nombre = ref('');
const descripcion = ref('');
const observaciones = ref('');
const precioBase = ref('');
const maxPersonas = ref('');
const precioAdicionalPersona = ref('');
const cantidadHoras = ref('');
const precioHoraExtra = ref('');
const salonIds = ref<number[]>([]);
const menuIds = ref<number[]>([]);
const recargos = reactive<Record<number, string>>({});
const instalacionIds = ref<number[]>([]);
const servicioIds = ref<number[]>([]);

const salones = ref<Salon[]>([]);
const menus = ref<Menu[]>([]);
const instalaciones = ref<Instalacion[]>([]);
const servicios = ref<Servicio[]>([]);
const cargandoOpciones = ref(false);
const enviando = ref(false);
const error = ref('');

const entero = (v: string) => /^\d+$/.test(String(v).trim());
const regla = {
  personas: (v: string) => !v || (entero(v) && Number(v) >= 1 && Number(v) <= 5000) || 'Un número entero entre 1 y 5000',
  horas: (v: string) => !v || (entero(v) && Number(v) >= 1 && Number(v) <= 48) || 'Un número entero entre 1 y 48',
};

/** Items activos + los que el combo ya tiene aunque estén de baja (para poder verlos y quitarlos). */
type Item = { id: number; nombre: string; inhabilitado: boolean };
function opciones(activos: Item[], actuales: Item[] = []) {
  const mapa = new Map<number, { id: number; titulo: string }>();
  for (const x of [...activos, ...actuales.filter((a) => !activos.some((b) => b.id === a.id))]) {
    mapa.set(x.id, { id: x.id, titulo: x.inhabilitado ? `${x.nombre} (de baja)` : x.nombre });
  }
  return [...mapa.values()];
}
const opcionesSalones = computed(() => opciones(salones.value, props.combo?.salones));
const opcionesMenus = computed(() => opciones(menus.value, props.combo?.menus));
const opcionesInstalaciones = computed(() => opciones(instalaciones.value, props.combo?.instalaciones));
const opcionesServicios = computed(() => opciones(servicios.value, props.combo?.servicios));
const nombreMenu = (id: number) => opcionesMenus.value.find((m) => m.id === id)?.titulo ?? `Menú ${id}`;

watch(visible, async (abierto) => {
  if (!abierto) return;
  error.value = '';
  const c = props.combo;
  nombre.value = c?.nombre ?? '';
  descripcion.value = c?.descripcion ?? '';
  observaciones.value = c?.observaciones ?? '';
  precioBase.value = c ? String(Number(c.precioBase)) : '';
  maxPersonas.value = c?.maxPersonas.toString() ?? '';
  precioAdicionalPersona.value = c ? String(Number(c.precioAdicionalPersona)) : '';
  cantidadHoras.value = c?.cantidadHoras.toString() ?? '';
  precioHoraExtra.value = c ? String(Number(c.precioHoraExtra)) : '';
  salonIds.value = c?.salones.map((s) => s.id) ?? [];
  menuIds.value = c?.menus.map((m) => m.id) ?? [];
  for (const k of Object.keys(recargos)) delete recargos[Number(k)];
  for (const m of c?.menus ?? []) recargos[m.id] = m.recargo === null ? '' : String(Number(m.recargo));
  instalacionIds.value = c?.instalaciones.map((i) => i.id) ?? [];
  servicioIds.value = c?.servicios.map((s) => s.id) ?? [];
  formulario.value?.resetValidation();

  cargandoOpciones.value = true;
  try {
    [salones.value, menus.value, instalaciones.value, servicios.value] = await Promise.all([
      listarSalones(false), listarMenus(false), listarInstalaciones(false), listarServicios(false),
    ]);
    // Combo nuevo: por defecto se ofrece en todos los salones activos
    if (!c) salonIds.value = salones.value.map((s) => s.id);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los salones y el catálogo.';
  } finally {
    cargandoOpciones.value = false;
  }
});

const mismoConjunto = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));
const recargoNum = (id: number) => {
  const n = aNumero(recargos[id] ?? '');
  return n === null || n === 0 ? null : n;
};

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    const base = {
      nombre: nombre.value.trim(),
      precioBase: aNumero(precioBase.value)!,
      maxPersonas: Number(maxPersonas.value),
      precioAdicionalPersona: aNumero(precioAdicionalPersona.value) ?? 0,
      cantidadHoras: Number(cantidadHoras.value),
      precioHoraExtra: aNumero(precioHoraExtra.value) ?? 0,
    };
    const menusPayload = menuIds.value.map((menuId) => ({ menuId, ...(recargoNum(menuId) !== null && { recargo: recargoNum(menuId)! }) }));
    const c = props.combo;

    if (c) {
      const menusAntes = new Map(c.menus.map((m) => [m.id, m.recargo === null ? null : Number(m.recargo)]));
      const menusCambiaron =
        !mismoConjunto(menuIds.value, c.menus.map((m) => m.id)) || menuIds.value.some((id) => recargoNum(id) !== menusAntes.get(id));
      await actualizarCombo(c.id, {
        ...base,
        descripcion: descripcion.value.trim(),
        observaciones: observaciones.value.trim(),
        // las listas reemplazan el conjunto completo: solo se envían si cambiaron
        ...(!mismoConjunto(salonIds.value, c.salones.map((s) => s.id)) && { salonIds: salonIds.value }),
        ...(menusCambiaron && { menus: menusPayload }),
        ...(!mismoConjunto(instalacionIds.value, c.instalaciones.map((i) => i.id)) && { instalacionIds: instalacionIds.value }),
        ...(!mismoConjunto(servicioIds.value, c.servicios.map((s) => s.id)) && { servicioIds: servicioIds.value }),
      });
    } else {
      await crearCombo({
        ...base,
        ...(descripcion.value.trim() && { descripcion: descripcion.value.trim() }),
        ...(observaciones.value.trim() && { observaciones: observaciones.value.trim() }),
        salonIds: salonIds.value,
        ...(menusPayload.length > 0 && { menus: menusPayload }),
        ...(instalacionIds.value.length > 0 && { instalacionIds: instalacionIds.value }),
        ...(servicioIds.value.length > 0 && { servicioIds: servicioIds.value }),
      });
    }
    visible.value = false;
    emit('guardado', base.nombre, !c);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
