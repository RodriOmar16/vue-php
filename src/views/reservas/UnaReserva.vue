<template>
  <v-row class="pt-4" :class="xs? 'px-2' : 'px-4'">
    <v-col cols="12" class="d-flex align-center justify-space-between py-1 mx-2">
      <div class="text-h5" style="font-weight: bold;">{{ nuevo ? 'Nueva Reserva' : 'Detalles de la Reserva N°: '+reserva_id }}</div>
      <v-switch v-if="!nuevo" class="pa-0 ma-0" label="Editar" color="primary" v-model="editar" :true-value="true" :false-value="false" hide-details></v-switch>
    </v-col>
    <v-col cols="12" class="py-0">
      <v-card class="pt-1">
        <v-card-title class="text-h6 pb-1">
          Datos de la Reserva
        </v-card-title>
        <v-divider class="py-1 mx-6"></v-divider>
        <v-card-text class="mx-2 mb-2">
          <v-row>
            <v-col cols="12" sm="6" md="3" class="py-1">
              Fecha Desde
              <FechaPicker
                v-model="fecha_reserva" hideDetails
              />
            </v-col>
            <v-col cols="12" sm="6" md="3" class="py-1">
              Horarios
              <v-autocomplete
                v-model="horario_id"
                item-value="id"
                item-title="nombre"
                :items="horarios"
                hide-details
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
                clearable
                @update:model-value="cambios()"
                no-data-text="No se encontraron datos"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" sm="6" md="3" class="py-1">
              Cant. Personas
              <v-text-field
                class=""
                v-model="cant_invitados"
                type="number"
                hide-details
                clearable
                @change="validarNumero('cant_personas')"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" class="py-1">
      <v-card class="pt-1">
        <v-card-title class="text-h6 pb-1">
          Datos del Cliente
        </v-card-title>
        <v-divider class="my-2 mx-6"></v-divider>
        <v-card-text class="mx-2 mb-2">
          <v-row>
            <v-col cols="12" sm="3" md="2" class="py-1">
              Dni Cliente
              <v-text-field
                class=""
                v-model="cliente_dni"
                type="number"
                hide-details
                clearable
                @change="validarNumero('dni_cliente')"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="9" md="7" class="py-1">
              Nombre Cliente
              <v-text-field
                class=""
                v-model="cliente_nombre"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="3" class="py-1">
              Fecha de Nacimiento
              <FechaPicker
                v-model="fecha_nac" hideDetails
              />
            </v-col>
            <v-col cols="12" sm="6" md="4" class="py-1">
              Email
              <v-text-field
                class=""
                v-model="cliente_email"
                hide-details
                :error="errorEmail"
                clearable
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="4" class="py-1">
              Teléfono
              <v-text-field
                class=""
                v-model="cliente_tel"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="4" class="py-1">
              Dirección
              <v-text-field
                class=""
                v-model="cliente_address"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" class="pt-1">
      <v-card>
        <v-card-title class="text-h6 pb-1">
          Resumen
        </v-card-title>
        <v-divider class="my-2 mx-6"></v-divider>
        <v-card-text class="mx-2 mb-2">
          <v-row class="">
            <v-col cols="12" sm="10" md="8" class="ma-auto">
              <v-table class="elevation-2" v-if="!xs">
                <template v-slot:default>
                  <thead class="bg-grey-lighten-1">
                    <tr>
                      <th class="text-left text-subtitle-1">
                        Concepto
                      </th>
                      <th class="text-right text-subtitle-1">
                        Detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="text-left">Cliente</td>
                      <td class="text-right">{{ '41232518 - Rodrigo Omar Miranda' }}</td>
                      <!--<td class="text-right">{{ format_money(alquiler) }}</td>-->
                    </tr>
                    <tr>
                      <td class="text-left" >Fecha reservada</td>
                      <td class="text-right">21/03/2025</td>
                    </tr>
                    <tr>
                      <td class="text-left">Horario</td>
                      <td class="text-right">16:00 a 20:00</td>
                    </tr>
                    <tr>
                      <td class="text-left">Combo</td>
                      <td class="text-right">Super 1</td>
                    </tr>
                    <tr>
                      <td class="text-left">Precio del Combo</td>
                      <td class="text-right">$350.000,00</td>
                    </tr>
                    <tr>
                      <td class="text-left">Cant. Personas del Combo</td>
                      <td class="text-right">50</td>
                    </tr>
                    <tr>
                      <td class="text-left">Cant. de Invitados</td>
                      <td class="text-right">49</td>
                    </tr>
                    <tr>
                      <td class="text-left">Cant. Adicional de Personas</td>
                      <td class="text-right">0</td>
                    </tr>
                    <tr>
                      <td class="text-left">Adicional por persona</td>
                      <td class="text-right">$5.000,00</td>
                    </tr>
                    <tr style="font-weight: bold;">
                      <td class="text-left">Total</td>
                      <td class="text-right">$350.000,00</td>
                    </tr>
                  </tbody>
                </template>
              </v-table>
              <div v-else> Proximamente</div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" class="d-flex" :class="xs ? 'justify-center' : 'justify-end'"> 
      <v-btn color="secondary" class="mr-2">{{ editar ? 'Cancelar' : 'Volver' }}</v-btn> 
      <v-btn color="success">{{ nuevo ? 'Grabar' : 'guardar' }}</v-btn> 
    </v-col>
  </v-row>
</template>

<script setup>
  import { useRouter } from 'vue-router';
  import { genericosStore } from '@/store/genericos';
  import { onMounted, ref } from 'vue';
  import { useDisplay } from 'vuetify/lib/framework.mjs';
  import FechaPicker from '@/components/utils/FechaPicker.vue';
  
  const router       = useRouter(); //console.log(router.currentRoute.value.path, router.currentRoute.value.params)
  const useGenericos = genericosStore();
  const { xs, sm }       = useDisplay();
  
  const editar        = ref(false);
  const nuevo         = ref(false);
  const reserva_id    = ref(router.currentRoute.value.params ? router.currentRoute.value.params.id : null);
  const fecha_reserva = ref(''); // DD/MM/YYYY 
  const horario_id    = ref(null);
  const combo_id      = ref(null);
  const cant_invitados= ref(null);
  const horarios      = ref([]);
  const combos        = ref([]);

  const cliente_dni    = ref(null);
  const cliente_nombre = ref(null);
  const fecha_nac      = ref(''); 
  const cliente_email  = ref(null);
  const errorEmail     = ref(false);
  const emailPattern   = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cliente_tel    = ref(null);
  const cliente_address= ref(null);



  onMounted(async () => {
    await init();
  });

  //Methods
  const init = async () => {
    if(reserva_id.value){
      nuevo.value = false;
    }else{
      nuevo.value = true; editar.value = true;
    }
    useGenericos.loading = true;
    //consultas a la api

    useGenericos.loading = false;
  };

  const validarNumero = (variable) => {
    let campo = '';
    switch(variable){
      /*case 'reserva_id': 
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
      break;*/
      case 'dni_cliente': 
        if(cliente_dni.value < 0){ 
          cliente_dni.value = null;  
          campo = 'Dni Cliente';
          useGenericos.setSnackBar('No se admiten valores negativos para el campo '+ campo , 'info');
          return;
        }
      break;
    }
  };


</script>