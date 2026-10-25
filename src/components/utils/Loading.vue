<template>
  <v-dialog :model-value="loading" width="300" persistent>
    <v-card color="info" dark>
      <v-card-text>
        <span>Por favor espere...</span>
        <v-progress-linear color="white" class="mb-0" indeterminate />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ loading?: boolean }>(), { loading: false });
</script>
