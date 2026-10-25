<template>
  <v-card variant="outlined">
    <v-card-title class="text-subtitle-1">Probar el precio</v-card-title>
    <v-card-text>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Elegí un salón, una fecha y la cantidad de invitados para ver cuánto sale este combo, con la tarifa que corresponda ese día.
      </p>
      <v-form ref="formulario" @submit.prevent="calcular">
        <v-row>
          <v-col cols="12" sm="4">
            <v-select v-model="salonId" :items="opcionesSalon" item-title="titulo" item-value="valor" label="Salón" :rules="[regla.salon]" :disabled="calculando" />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field v-model="fecha" label="Fecha del evento" type="date" :rules="[regla.fecha]" :disabled="calculando" />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field v-model="invitados" label="Invitados" type="number" :rules="[regla.invitados]" :disabled="calculando" />
          </v-col>
        </v-row>
        <v-btn type="submit" color="primary" :loading="calculando" prepend-icon="fa-solid fa-calculator">Calcular</v-btn>
      </v-form>

      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" role="alert">{{ error }}</v-alert>

      <div v-if="resultado" class="mt-6" data-testid="resultado-cotizacion">
        <v-table density="comfortable">
          <tbody>
            <tr>
              <td>
                Precio base
                <div class="text-caption text-medium-emphasis" data-testid="origen-precio">{{ origen }}</div>
              </td>
              <td class="text-right">{{ formatearImporte(resultado.precioBase.importe) }}</td>
            </tr>
            <tr>
              <td>
                Invitados extra
                <div class="text-caption text-medium-emphasis" data-testid="detalle-excedente">{{ detalleExcedente }}</div>
              </td>
              <td class="text-right">{{ formatearImporte(resultado.excedente.importe) }}</td>
            </tr>
            <tr class="font-weight-bold">
              <td>Total</td>
              <td class="text-right text-h6" data-testid="total-cotizacion">{{ formatearImporte(resultado.total) }}</td>
            </tr>
          </tbody>
        </v-table>
        <p class="text-caption text-medium-emphasis mt-2">No incluye menús elegidos, adicionales ni horas extra.</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { cotizarCombo } from '@/api/combos';
import { ApiError } from '@/api/http';
import type { Combo, Cotizacion, Tarifa } from '@/api/tipos';
import { describirTarifa } from '@/utils/combos';
import { formatearImporte } from '@/utils/dinero';

const props = defineProps<{ combo: Combo; tarifas: Tarifa[] }>();

const formulario = ref<InstanceType<typeof VForm> | null>(null);
const salonId = ref<number | null>(null);
const fecha = ref('');
const invitados = ref(String(props.combo.maxPersonas));
const calculando = ref(false);
const error = ref('');
const resultado = ref<Cotizacion | null>(null);

const opcionesSalon = computed(() =>
  props.combo.salones.filter((s) => !s.inhabilitado).map((s) => ({ titulo: s.nombre, valor: s.id as number | null })),
);

// Un solo salón: ya viene elegido
watch(
  opcionesSalon,
  (opciones) => {
    if (salonId.value === null && opciones.length === 1) salonId.value = opciones[0].valor;
  },
  { immediate: true },
);

const regla = {
  salon: (v: number | null) => v !== null || 'Elegí un salón',
  fecha: (v: string) => !!v || 'Elegí una fecha',
  invitados: (v: string) => (/^\d+$/.test(String(v).trim()) && Number(v) >= 1 && Number(v) <= 5000) || 'Un número entero entre 1 y 5000',
};

const origen = computed(() => {
  const r = resultado.value;
  if (!r) return '';
  if (r.precioBase.origen === 'combo') return 'Precio base del combo';
  const t = props.tarifas.find((x) => x.id === r.precioBase.tarifaId);
  return t ? `Tarifa aplicada: ${describirTarifa(t, props.combo.salones)}` : 'Tarifa especial';
});

const detalleExcedente = computed(() => {
  const r = resultado.value;
  if (!r) return '';
  return r.excedente.personas === 0
    ? `Dentro de los ${r.maxPersonas} invitados incluidos`
    : `${r.excedente.personas} ${r.excedente.personas === 1 ? 'persona' : 'personas'} sobre las ${r.maxPersonas} incluidas × ${formatearImporte(r.excedente.precioPorPersona)}`;
});

async function calcular() {
  error.value = '';
  resultado.value = null;
  const validacion = await formulario.value?.validate();
  if (!validacion?.valid) return;

  calculando.value = true;
  try {
    resultado.value = await cotizarCombo(props.combo.id, {
      salonId: salonId.value!,
      fecha: fecha.value,
      invitados: Number(invitados.value),
    });
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intentá de nuevo.';
  } finally {
    calculando.value = false;
  }
}
</script>
