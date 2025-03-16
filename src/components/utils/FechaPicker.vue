<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    offset-y
    max-width="290px"
    min-width="290px"
  >
    <template v-slot:activator="{ props }">
      <div class="d-flex">
        <v-text-field
          class=""
          v-model="fecha"
          :hide-details="hideDetails"
          variant="outlined"
          density='comfortable'
          :clearable="!readOnly"
          placeholder="DD/MM/YYYY"
          @change="aplicarFormato()"
          @input="aplicarMask()"
          maxlength="10"
          :disabled="disabled"
          :readonly="readOnly"
        ></v-text-field>
        <v-btn
          class="mt-1"
          color="primary"
          v-bind="props"
          title="Seleccionar Fecha"
          icon
          variant="text"
          :disabled="disabled"
          :readonly="readOnly"
        >
          <v-icon>fa-solid fa-calendar-days</v-icon>
        </v-btn>
      </div>
    </template>

    <v-date-picker 
      v-model="date"
      hide-header
      bg-color="white"
      @update:model-value="formatearFecha()"
    ></v-date-picker>
  </v-menu>
</template>

<script setup>
  /*
    Este componente requiere que desde el padre se envie un formato "DD/MM/YYYY" como String
    lo procesa como Date para que el v-date-picker lo entienda y lo emit como una String en el mismo formato 
    "DD/MM/YYYY", pero con la fecha seleccionada.
  */
  import { ref, computed, watch, onMounted } from "vue";
  import moment from "moment";

  // Props y eventos
  const props = defineProps({
    modelValue: String,
    disabled: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    hideDetails: { type: Boolean, default: true },
  });
  const emit = defineEmits(["update:modelValue"]);

  // Variables reactivas
  const menu = ref(false);
  const date = ref(new Date());

  // Computed para manejar el binding con v-model
  const fecha = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value)
  });

  // Métodos
  const aplicarFormato = () => {
    if (fecha.value) {
      let fecha_date = new Date(fecha.value.split("/").reverse().join("-"));
      fecha_date.setDate(fecha_date.getDate() + 1);
      date.value = fecha_date // Convierte string a Date fecha.value
    } else {
      date.value = new Date();
    }
  };

  const formatearFecha = () => {
    menu.value = false
    if (!date.value) {
      fecha.value = null;
    } else {
      fecha.value = moment(date.value).format("DD/MM/YYYY");
    }
  };

  const aplicarMask = () => {
    let valor = event.target.value;

    // Elimina cualquier carácter no numérico
    valor = valor.replace(/\D/g, "");

    // Inserta las barras según el formato "DD/MM/YYYY"
    if (valor.length >= 3) {
      valor = valor.slice(0, 2) + "/" + valor.slice(2);
    }
    if (valor.length >= 6) {
      valor = valor.slice(0, 5) + "/" + valor.slice(5);
    }

    // Limita el input al formato "DD/MM/YYYY"
    if (valor.length > 10) {
      valor = valor.slice(0, 10);
    }

    // Actualiza el valor en el campo
    fecha.value = valor;
  };

  // Hooks
  onMounted(() => {
    aplicarFormato();
  });

  // Watchers
  watch(fecha, (val) => {
    if (!val){ date.value = new Date();}
  });
  /*watch(menu, (val) => {
    //if (val) aplicarFormato();
    if (!val) formatearFecha();
  });*/

  /*watch(date, (val) => {
    if (!val) {
      fecha.value = null;
    } else {
      //fecha.value = moment(val).format("DD/MM/YYYY");
      //fecha.value = new Date();
    }
  });*/
</script>
