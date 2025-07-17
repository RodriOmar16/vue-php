<template>
  <v-row >
    <v-col cols="12">
      <v-carousel>
        <v-carousel-item
          src="https://cdn.vuetifyjs.com/images/cards/docks.jpg"
          cover
        ></v-carousel-item>

        <v-carousel-item
          src="https://cdn.vuetifyjs.com/images/cards/hotel.jpg"
          cover
        ></v-carousel-item>

        <v-carousel-item
          src="https://cdn.vuetifyjs.com/images/cards/sunshine.jpg"
          cover
        ></v-carousel-item>
      </v-carousel>
    </v-col>
    <v-col cols="3">
      Fecha
      <v-text-field
        v-model="fecha"
        type="date"
        clearable
      ></v-text-field>
      {{ fecha }}
    </v-col>
  </v-row>
</template>

<script setup>
  import { genericosStore } from '@/store/genericos';
  import { onMounted, ref } from 'vue';
  console.log("Estamos en combos")
  
  const useGenericos = genericosStore();

  const fecha = ref('');

  onMounted(async () => {
    await init();
  });

  //Methods
  const init = async () => {
    useGenericos.loading = true;
    //consultas a la api
    useGenericos.loading = false;
  };

</script>