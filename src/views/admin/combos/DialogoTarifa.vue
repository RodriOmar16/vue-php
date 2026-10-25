<template>
  <v-dialog v-model="visible" max-width="600" scrollable :persistent="enviando">
    <v-card>
      <v-card-title>{{ tarifa ? 'Editar tarifa' : 'Nueva tarifa' }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Un precio distinto para ciertos días: los sábados, un feriado, la temporada de verano...
          Si varias tarifas coinciden en una fecha gana la más específica: un día puntual, luego un rango de fechas,
          luego un día de la semana. Si empatan, la del salón elegido y después la de mayor prioridad.
        </p>
        <v-form ref="formulario" @submit.prevent="enviar">
          <v-select v-model="salonId" :items="opcionesSalon" item-title="titulo" item-value="valor" label="¿En qué salón?" :disabled="enviando" />

          <h3 class="text-subtitle-2 mt-2 mb-2">¿Cuándo rige?</h3>
          <v-select
            v-model="diaSemana"
            :items="opcionesDia"
            item-title="titulo"
            item-value="valor"
            label="Día de la semana"
            :rules="[regla.alMenosUna]"
            :disabled="enviando"
          />
          <v-switch v-model="limitarFechas" label="Limitar a una fecha o rango de fechas" color="primary" hide-details density="compact" :disabled="enviando" />
          <v-row v-if="limitarFechas" class="mt-1">
            <v-col cols="12" sm="6">
              <v-text-field v-model="fechaDesde" label="Desde el día" type="date" :rules="[regla.requeridoFecha]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="fechaHasta"
                label="Hasta el día (opcional)"
                type="date"
                hint="Inclusive. Vacío = solo ese día (un feriado)."
                persistent-hint
                :rules="[regla.hastaDia]"
                :disabled="enviando"
              />
            </v-col>
          </v-row>

          <h3 class="text-subtitle-2 mt-6 mb-2">Precio</h3>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="precioBase" label="Precio base" type="number" step="0.01" prefix="$" :rules="[requerido, importeValido]" :disabled="enviando" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="precioAdicionalPersona"
                label="Invitado extra (opcional)"
                type="number"
                step="0.01"
                prefix="$"
                hint="Vacío = rige el del combo"
                persistent-hint
                :rules="[importeValido]"
                :disabled="enviando"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="prioridad"
            label="Prioridad (opcional)"
            type="number"
            hint="Solo desempata entre tarifas igual de específicas: gana la mayor."
            persistent-hint
            class="mt-2"
            :rules="[regla.prioridad]"
            :disabled="enviando"
          />

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3" role="alert">{{ error }}</v-alert>
          <button type="submit" class="d-none" tabindex="-1" aria-hidden="true">enviar</button>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="enviando" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="enviando" @click="enviar">{{ tarifa ? 'Guardar cambios' : 'Crear tarifa' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { actualizarTarifa, crearTarifa } from '@/api/combos';
import { ApiError } from '@/api/http';
import type { ComboSalon, Tarifa } from '@/api/tipos';
import { aNumero, importeValido } from '@/utils/dinero';
import { DIAS_SEMANA } from '@/utils/horarios';
import { requerido } from '@/utils/reglas';

const props = defineProps<{
  modelValue: boolean;
  comboId: number;
  /** Si se indica, se edita esa tarifa; si no, se crea una nueva. */
  tarifa?: Tarifa | null;
  salones: ComboSalon[];
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean]; guardada: [esNueva: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});

const opcionesSalon = computed(() => [
  { titulo: 'Todos los salones donde se ofrece', valor: null as number | null },
  ...props.salones.filter((s) => !s.inhabilitado || s.id === props.tarifa?.salonId).map((s) => ({ titulo: s.nombre, valor: s.id as number | null })),
]);
const opcionesDia = [
  { titulo: 'Cualquier día', valor: null as number | null },
  ...DIAS_SEMANA.map((d) => ({ titulo: d.nombre, valor: d.valor as number | null })),
];

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const salonId = ref<number | null>(null);
const diaSemana = ref<number | null>(null);
const limitarFechas = ref(false);
const fechaDesde = ref('');
const fechaHasta = ref('');
const precioBase = ref('');
const precioAdicionalPersona = ref('');
const prioridad = ref('');
const enviando = ref(false);
const error = ref('');

const regla = {
  // una tarifa tiene que regir por algún día de la semana, por fechas, o por ambos
  alMenosUna: () => diaSemana.value !== null || limitarFechas.value || 'Elegí un día de la semana, un rango de fechas, o ambos',
  requeridoFecha: (v: string) => !!v || 'Campo obligatorio',
  hastaDia: (v: string) => !v || !fechaDesde.value || v >= fechaDesde.value || 'No puede ser anterior al día de inicio',
  prioridad: (v: string) => v === '' || (/^\d+$/.test(String(v).trim()) && Number(v) <= 1000) || 'Un número entero entre 0 y 1000',
};

watch(visible, (abierto) => {
  if (!abierto) return;
  error.value = '';
  const t = props.tarifa;
  salonId.value = t?.salonId ?? null;
  diaSemana.value = t?.diaSemana ?? null;
  limitarFechas.value = !!t?.fechaDesde;
  fechaDesde.value = t?.fechaDesde ?? '';
  fechaHasta.value = t && t.fechaHasta !== t.fechaDesde ? (t.fechaHasta ?? '') : '';
  precioBase.value = t ? String(Number(t.precioBase)) : '';
  precioAdicionalPersona.value = t?.precioAdicionalPersona ? String(Number(t.precioAdicionalPersona)) : '';
  prioridad.value = t && t.prioridad !== 0 ? String(t.prioridad) : '';
  formulario.value?.resetValidation();
});

async function enviar() {
  error.value = '';
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  enviando.value = true;
  try {
    // null = «sin esa condición»: al editar quita la que antes estaba; al crear equivale a omitirla
    const datos = {
      salonId: salonId.value,
      diaSemana: diaSemana.value,
      fechaDesde: limitarFechas.value ? fechaDesde.value : null,
      fechaHasta: limitarFechas.value ? fechaHasta.value || fechaDesde.value : null,
      precioBase: aNumero(precioBase.value)!,
      precioAdicionalPersona: aNumero(precioAdicionalPersona.value),
      prioridad: Number(prioridad.value || 0),
    };
    if (props.tarifa) {
      await actualizarTarifa(props.comboId, props.tarifa.id, datos);
    } else {
      await crearTarifa(props.comboId, {
        ...datos,
        salonId: datos.salonId ?? undefined,
        diaSemana: datos.diaSemana ?? undefined,
        fechaDesde: datos.fechaDesde ?? undefined,
        fechaHasta: datos.fechaHasta ?? undefined,
        precioAdicionalPersona: datos.precioAdicionalPersona ?? undefined,
      });
    }
    visible.value = false;
    emit('guardada', !props.tarifa);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    enviando.value = false;
  }
}
</script>
