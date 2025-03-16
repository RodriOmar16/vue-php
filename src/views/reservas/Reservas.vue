<template>
  <v-row class="pt-2">
    <v-col cols="12">
      <v-card>
        <v-card-title>
          Filtros
        </v-card-title>
        <v-card-text class="mx-4">
          <v-row>
            <!--Fecha_desde, Fecha_hasta, habilitadas, estados_reserva,
	          combos_habilitados, horarios, cantidad_personas, Cliente_nombre, dni_cliente-->
            <v-col cols="12" sm="4" md="2">
              Fecha Desde
              <FechaPicker
                v-model="fecha_desde"
              />
            </v-col>
            <!--<v-col cols="12" sm="4" md="3">
              Fecha Hasta
              <FechaPicker
                v-model="fecha_hasta"
              />
            </v-col>-->
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12">
      <v-card>
        <v-card-title>
          Resultados
        </v-card-title>
        <v-card-text>
          skjdnfkjsadn
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
  import { ref } from 'vue';
  import { useReservaStore } from '@/store/reservas';
  import { useDisplay } from 'vuetify/lib/framework.mjs';
  import FechaPicker from '@/components/utils/FechaPicker.vue';
  import moment from 'moment';

  const { xs }         = useDisplay();
  const useReserva     = useReservaStore();
  const fecha_desde    = ref(moment(new Date()).format('DD/MM/YYYY'));
  const fecha_hasta    = ref(/*moment(*/new Date()/*).format('DD/MM/YYYY')*/);
  const habilitada     = ref(null);
  const estados_codigo = ref(null);
  const combo_id       = ref(null);
  const horario_id     = ref(null);
  const cant_personas  = ref(null);
  const cliente_codigo = ref(null);
  const cliente_nombre = ref(null);
  const dni_cliente    = ref(null);
  const combos         = ref([]);
  const horarios       = ref([]);

  //Fecha_desde, Fecha_hasta, habilitadas, estados_reserva,
	//combos_habilitados, horarios, cantidad_personas, Cliente_nombre, dni_cliente
</script>