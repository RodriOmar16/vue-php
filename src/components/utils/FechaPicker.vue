<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    offset-y
    max-width="290px"
    min-width="290px"
  >
    <template v-slot:activator="{ on, attrs }">
      <div class="d-flex">
        <v-text-field
          class="mt-2"
          v-model="fecha"
          hide-details
          outlined
          dense
          readonly
          filled
          clearable
        ></v-text-field>
        <v-btn
          class="mt-1"
          color="primary"
          v-bind="attrs"
          v-on="on"
          title="Seleccionar Fecha"
          icon
        >
          <v-icon>fa-solid fa-calendar-days</v-icon>
        </v-btn>
      </div>
    </template>

    <v-date-picker 
      v-model="date"
      @update:model-value="menu = false"
      @change="formatearFecha"
      :hide-header="true"
      bg-color="white"
    ></v-date-picker>
  </v-menu>
</template>

<script setup>
  import { ref, computed, watch, onMounted } from "vue";
  import moment from "moment";

  // Props y eventos
  const props = defineProps({
    modelValue: String
  });
  const emit = defineEmits(["update:modelValue"]);

  // Variables reactivas
  const menu = ref(false);
  const date = ref(moment(new Date()).format("YYYY-MM-DD"));

  // Computed para manejar el binding con v-model
  const fecha = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value)
  });

  // Métodos
  const aplicarFormato = () => {
    if (fecha.value) {
      let fechaArr = fecha.value.split("/");
      date.value = moment(new Date(fechaArr[2], fechaArr[1] - 1, fechaArr[0])).format("YYYY-MM-DD");
    } else {
      fecha.value = moment(new Date()).format("DD/MM/YYYY");
    }
  };

  const formatearFecha = () => {
    if (!date.value) {
      fecha.value = null;
    } else {
      let dateArr = date.value.split("-");
      fecha.value = moment(new Date(dateArr[0], dateArr[1] - 1, dateArr[2])).format("DD/MM/YYYY");
    }
  };

  // Hooks
  onMounted(() => {
    aplicarFormato();
  });

  // Watchers
  watch(menu, (val) => {
    if (val) aplicarFormato();
  });

  watch(date, (val) => {
    if (!val) {
      fecha.value = null;
    } else {
      let dateArr = val.split("-");
      fecha.value = moment(new Date(dateArr[0], dateArr[1] - 1, dateArr[2])).format("DD/MM/YYYY");
    }
  });
</script>
