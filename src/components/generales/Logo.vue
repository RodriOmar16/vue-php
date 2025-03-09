<template>
  <v-container class="pa-0 ma-0 fill-height" fluid>
    <v-row class="pa-0 ma-0 fill-height" justify="center" align="center">
      <v-col cols="12" sm="8" md="6" class="pa-0 d-flex justify-center align-center">
        <v-img
          src="src/assets/images/innovartic.png"
          class="svg-image"
          max-width="350"
          contain
        ></v-img>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// No es necesario importar nada adicional
</script>

<style scoped>
.fill-height {
  height: 100vh; /* Llena toda la altura del viewport */
}

.svg-image {
  display: block;
  max-width: 100%; /* Asegura que se redimensione al contenedor */
  height: auto;    /* Mantiene las proporciones */
}
</style>
