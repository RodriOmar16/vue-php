<template>
  <v-row class="pt-4" :class="xs? 'px-2' : 'px-4'">
    <v-col cols="12">
      <v-card>
        <v-card-title>
          Filtros
        </v-card-title>
        <v-divider class="py-2"></v-divider>
        <v-card-text class="mx-4 mb-2">
          <v-row>
            <!--Fecha_desde, Fecha_hasta, habilitadas, estados_reserva,
	          combos_habilitados, horarios, cantidad_personas, Cliente_nombre, dni_cliente-->
            <v-col cols="12" sm="4" md="3" class="py-1">
              Fecha Desde
              <FechaPicker
                v-model="fecha_desde" hideDetails
              />
            </v-col>
            <v-col cols="12" sm="4" md="3"  class="py-1">
              Fecha Hasta
              <FechaPicker
                v-model="fecha_hasta"
              />
            </v-col>
            <v-col cols="12" md="3" class="py-1">
              Estados
              <v-autocomplete
                v-model="estados_codigo"
                item-value="id"
                item-title="nombre"
                :items="estados"
                hide-details
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="cambios()"
                no-data-text="No se encontraron datos"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" md="3" class="py-1">
              Combos
              <v-autocomplete
                v-model="combo_id"
                item-value="id"
                item-title="nombre"
                :items="combos"
                hide-details
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="cambios()"
                no-data-text="No se encontraron datos"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" md="3" class="py-1">
              Horarios
              <v-autocomplete
                v-model="horario_id"
                item-value="id"
                item-title="nombre"
                :items="horarios"
                hide-details
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="cambios()"
                no-data-text="No se encontraron datos"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" md="3" class="py-1">
              Cód. Reserva
              <v-text-field
                class=""
                v-model="reserva_id"
                variant="outlined"
                density='comfortable'
                type="number"
                hide-details
                clearable
                @change="validarNumero('reserva_id')"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="3" class="py-1">
              Cant. Personas
              <v-text-field
                class=""
                v-model="cant_personas"
                variant="outlined"
                density='comfortable'
                type="number"
                hide-details
                clearable
                @change="validarNumero('cant_personas')"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="3" class="py-1">
              Dni Cliente
              <v-text-field
                class=""
                v-model="dni_cliente"
                variant="outlined"
                density='comfortable'
                type="number"
                hide-details
                clearable
                @change="validarNumero('dni_cliente')"
              ></v-text-field>
            </v-col>
            <v-col cols="6" md="3" class="py-1">
              Nombre Cliente
              <v-text-field
                class=""
                v-model="cliente_nombre"
                variant="outlined"
                density='comfortable'
                hide-details
                clearable
              ></v-text-field>
            </v-col>
            <v-col cols="6" md="9" class="py=1 d-flex justify-end">
              Buscar
            </v-col>
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
  import { onMounted, ref } from 'vue';
  import { useReservaStore } from '@/store/reservas';
  import { genericosStore } from '@/store/genericos';
  import { useDisplay } from 'vuetify/lib/framework.mjs';
  import FechaPicker from '@/components/utils/FechaPicker.vue';
  import moment from 'moment';

  const { xs }         = useDisplay();
  const useReserva     = useReservaStore();
  const useGenericos   = genericosStore();
  const fecha_desde    = ref(moment(new Date()).format('DD/MM/YYYY'));
  const fecha_hasta    = ref(moment(new Date()).format('DD/MM/YYYY'));
  const habilitada     = ref(null);
  const estados_codigo = ref(null);
  const combo_id       = ref(null);
  const horario_id     = ref(null);
  const reserva_id     = ref(null);
  const cant_personas  = ref(null);
  const cliente_codigo = ref(null);
  const cliente_nombre = ref(null);
  const dni_cliente    = ref(null);
  const estados        = ref([]);
  const combos         = ref([]);
  const horarios       = ref([]);

  onMounted(async () => {
    await init();
  });

  //Methods
  const init = async () => {
    useGenericos.loading = true;
    //consultas a la api
    useGenericos.loading = false;
  };

  const cambios = () => { console.log("se cambiop"); }
  const validarNumero = (variable) => {
    let campo = '';
    switch(variable){
      case 'reserva_id': 
        if(reserva_id.value < 0){ 
          reserva_id.value = null; 
          campo = 'Cód. Reserva';
          useGenericos.setSnackBar('No se admiten valores negativos para el campo '+ campo , 'info');
          return;
        }
      break;
      case 'cant_personas': 
        if(cant_personas.value < 0){ 
          cant_personas.value = null;  
          campo = 'Cant. Personas';
          useGenericos.setSnackBar('No se admiten valores negativos para el campo '+ campo , 'info');
          return;
        }
      break;
      case 'dni_cliente': 
        if(dni_cliente.value < 0){ 
          dni_cliente.value = null;  
          campo = 'Dni Cliente';
          useGenericos.setSnackBar('No se admiten valores negativos para el campo '+ campo , 'info');
          return;
        }
      break;
    }
  };

</script>