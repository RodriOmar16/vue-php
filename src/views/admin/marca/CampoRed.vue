<template>
  <v-text-field
    :model-value="modelValue"
    :label="etiqueta"
    placeholder="https://"
    :rules="[regla]"
    :disabled="deshabilitado"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
defineProps<{
  etiqueta: string;
  modelValue: string;
  regla: (valor: string) => true | string;
  deshabilitado: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: string] }>();
</script>
