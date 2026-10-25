<template>
  <!-- persistent: hay que cerrarlo a propósito, la clave no se vuelve a mostrar -->
  <v-dialog v-model="visible" max-width="520" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="warning" class="mr-3">fa-solid fa-key</v-icon>
        Clave temporal
      </v-card-title>
      <v-card-text>
        <p class="mb-4">
          {{ descripcion }}
        </p>
        <v-text-field
          :model-value="password"
          label="Contraseña temporal"
          readonly
          hide-details
          class="clave"
          data-testid="clave-temporal"
          :append-inner-icon="copiado ? 'fa-solid fa-check' : 'fa-regular fa-copy'"
          @click:append-inner="copiar"
          @focus="seleccionar"
        />
        <v-alert type="warning" variant="tonal" density="compact" class="mt-4">
          Esta clave <strong>no se vuelve a mostrar</strong>. Anotala o copiala ahora y pasásela a la persona
          por un canal seguro. Deberá cambiarla la primera vez que ingrese.
        </v-alert>
        <p v-if="errorCopia" class="text-caption text-error mt-2" role="alert">{{ errorCopia }}</p>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn color="primary" variant="flat" @click="visible = false">Ya la anoté</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  password: string;
  /** a quién corresponde, p. ej. «María Pérez (maria@salon.com)» */
  para?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: boolean] }>();

const visible = computed({
  get: () => props.modelValue,
  set: (valor: boolean) => emit('update:modelValue', valor),
});
const descripcion = computed(() =>
  props.para ? `Contraseña temporal para ${props.para}.` : 'Esta es la contraseña temporal.',
);

const copiado = ref(false);
const errorCopia = ref('');

watch(visible, (abierto) => {
  if (abierto) {
    copiado.value = false;
    errorCopia.value = '';
  }
});

async function copiar() {
  errorCopia.value = '';
  try {
    await navigator.clipboard.writeText(props.password);
    copiado.value = true;
  } catch {
    errorCopia.value = 'No se pudo copiar automáticamente. Seleccioná el texto y copialo a mano.';
  }
}

const seleccionar = (evento: FocusEvent) => (evento.target as HTMLInputElement | null)?.select();
</script>

<style scoped>
.clave :deep(input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
}
</style>
