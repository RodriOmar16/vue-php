<template>
  <v-dialog v-model="activo" max-width="600">
    <v-card>
      <v-card-title>
        <span>Confirmar acción</span>
        <v-spacer></v-spacer>
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text>
        <v-row class="py-1" justify="center">
          <v-col cols="12" class="d-flex justify-center py-1">
            <v-icon :color="colorIcon" size="48">{{ icon }}</v-icon>
          </v-col>
          <v-col cols="12" class="py-1">
            <div class="text-subtitle-1 text-center">{{ text }}</div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="d-flex justify-end">
        <v-btn color="secondary" @click="cerrar">Cancelar</v-btn>
        <v-btn color="success" @click="aceptar">Aceptar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { computed } from 'vue';

  // Props
  defineProps({
    value: Boolean,
    icon: String,
    colorIcon: String,
    text: String,
  });

  // Emits
  const emit = defineEmits(['update:value', 'confirmar']);

  // Reactivity
  const activo = computed({
    get: () => value,
    set: (val) => emit('update:value', val),
  });

  // Methods
  const cerrar = () => {
    activo.value = false;
  };

  const aceptar = () => {
    console.log("Aceptar");
    activo.value = false;
    emit('confirmar');
  };
</script>
