<template>
  <v-dialog
    v-model="props.loading"
    width="300"
    persistent>
    <v-card
      color="info"
      dark>
      <v-card-text>
        <span>Por favor espere...</span>
        <v-progress-linear
          color="white"
          class="mb-0"
          indeterminate>
        </v-progress-linear>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
  //PROPS
  const props = defineProps({
    loading: {
      type: Boolean,
      default: false,
    }
  });
</script>
