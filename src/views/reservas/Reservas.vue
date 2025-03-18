<template>
  <v-row class="pt-4" :class="xs? 'px-2' : 'px-4'">
    <v-col cols="12">
      <v-card>
        <v-card-title class="d-flex justify-space-between">
          <div class="d-flex align-center"><span class="text-h6 pb-1" style="font-weight: bold;">Filtros</span></div>
          <v-btn title="Nueva reserva" icon color="success" @click="crearEditarReserva(null)" size="small" class="mr-4">
            <v-icon size="small">fa-solid fa-plus </v-icon>
          </v-btn>
        </v-card-title>
        <v-divider class="my-2 mx-6"></v-divider>
        <v-card-text class="mx-2 mb-2">
          <v-row>
            <v-col cols="12" sm="6" md="3" class="py-1">
              Fecha Desde
              <FechaPicker
                v-model="fecha_desde" hideDetails
              />
            </v-col>
            <v-col cols="12" sm="6" md="3"  class="py-1">
              Fecha Hasta
              <FechaPicker
                v-model="fecha_hasta"
              />
            </v-col>
            <v-col cols="12" sm="6" md="3" class="py-1">
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
            <v-col cols="12" sm="6" md="3" class="py-1">
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
            <v-col cols="12" sm="6" md="3" class="py-1">
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
            <v-col cols="12" sm="6" md="3" class="py-1">
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
            <v-col cols="12" sm="6" md="3" class="py-1">
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
            <v-col cols="12" sm="6" md="3" class="py-1">
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
            <v-col cols="6" sm="6" md="3" class="py-1">
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
            <v-col cols="6" sm="3" md="3" class="py-1 d-flex align-center">
              <v-switch label="Inhabilitadas" color="primary" v-model="habilitada" :true-value="1" :false-value="0" hide-details></v-switch>
            </v-col>
            <v-col cols="12" sm="3" md="6" class="py=1 d-flex justify-end align-center">
              <BtnFiltro @limpiar="limpiar" @filtrar="buscar"/>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12">
      <v-card>
        <v-card-title class="text-h6 pb-1" style="font-weight: bold;" >
          Resultados
        </v-card-title>
        <v-divider class="mt-0 mx-4"></v-divider>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-data-table
                :headers="header"
                :items="reservas"
              >
                <!-- Acciones -->
                <template v-slot:[`item.acciones`]="{item}">
                  <div class="d-flex justify-center">
                    <v-btn variant="plain" @click="crearEditarReserva(item)" icon color="primary" size="small">
                      <v-icon>fa-solid fa-eye</v-icon>
                      <v-tooltip activator="parent" location="bottom"
                      >Ver</v-tooltip>
                    </v-btn>
                    <v-btn variant="plain" @click="crearEditarReserva(item)" icon color="primary" size="small">
                      <v-icon>fa-solid fa-eye</v-icon>
                      <v-tooltip activator="parent" location="bottom"
                      >Ver</v-tooltip>
                    </v-btn>
                  </div>
                </template>
                <!-- No hay datos -->
                <template v-slot:no-data> <AlertDataTable class="py-2"/> </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
  import { useRouter, useRoute } from 'vue-router';
  import { onMounted, ref } from 'vue';
  import { useReservaStore } from '@/store/reservas';
  import { genericosStore } from '@/store/genericos';
  import { useDisplay } from 'vuetify/lib/framework.mjs';
  import FechaPicker from '@/components/utils/FechaPicker.vue';
  import BtnFiltro from '@/components/utils/BtnFiltro.vue';
  import AlertDataTable from '@/components/utils/AlertDataTable.vue'
  import moment from 'moment';

  const { xs }         = useDisplay();
  const useReserva     = useReservaStore();
  const useGenericos   = genericosStore();
  const router         = useRouter();

  const fecha_desde    = ref(moment(new Date()).format('DD/MM/YYYY'));
  const fecha_hasta    = ref(moment(new Date()).format('DD/MM/YYYY'));
  const habilitada     = ref(0);
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
  const reservas       = ref([
    {
      "id": 1,
      "fecha_grabacion": "2025-03-01",
      "fecha_evento": "2025-03-15",
      "cliente_id": 5,
      "estado_id": 2,
      "horario_id": 3,
      "cantidad_invitados": 50,
      "combo_id": 1,
      "inhabilitada": 0,
      "creado_en": "2025-03-01T10:30:00",
      "actualizado_en": "2025-03-10T14:45:00"
    },
    {
      "id": 2,
      "fecha_grabacion": "2025-03-02",
      "fecha_evento": "2025-03-16",
      "cliente_id": 8,
      "estado_id": 1,
      "horario_id": 2,
      "cantidad_invitados": 20,
      "combo_id": 3,
      "inhabilitada": 0,
      "creado_en": "2025-03-02T11:00:00",
      "actualizado_en": "2025-03-08T12:30:00"
    },
    {
      "id": 3,
      "fecha_grabacion": "2025-03-05",
      "fecha_evento": "2025-03-20",
      "cliente_id": 10,
      "estado_id": 3,
      "horario_id": 5,
      "cantidad_invitados": 30,
      "combo_id": 2,
      "inhabilitada": 1,
      "creado_en": "2025-03-05T09:15:00",
      "actualizado_en": "2025-03-06T16:45:00"
    }
  ]);
  const header = ref([
    { title: 'Fecha Evento', key: 'fecha_evento' },
    { title: 'Cliente', key: 'cliente_nombre'},
    { title: 'Estado', key: 'estado_nombre'},
    { title: 'Horario', key: 'horario' },
    { title: 'Combo', key: 'combo_id' },
    { title: 'Acciones', key: 'acciones', align:'center' },
  ])

  onMounted(async () => {
    await init();
  });

  //Methods
  const init = async () => {
    useGenericos.loading = true;
    //consultas a la api
    useGenericos.loading = false;
  };

  const cambios = () => { console.log("se cambiop"); };

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

  const buscar = () => {
    console.log("buscar..............")
  };

  const limpiar = () => {
    fecha_desde.value    = moment(new Date()).format('DD/MM/YYYY');
    fecha_hasta.value    = moment(new Date()).format('DD/MM/YYYY');
    habilitada.value     = 0;
    estados_codigo.value = null;
    combo_id.value       = null;
    horario_id.value     = null;
    reserva_id.value     = null;
    cant_personas.value  = null;
    cliente_codigo.value = null;
    cliente_nombre.value = null;
    dni_cliente.value    = null;
  };

  const crearEditarReserva = (item) => {
    if(!item){
      console.log("Nueva res por crear.")
      router.push({ path: '/nueva-reserva' });
    }else{
      router.push({ path: '/reserva/'+item.id });
    }
  };

</script>