<template>
  <v-row class="container-full pa-0 ma-0" no-gutters>
    <v-col cols="12" class="py-0 ">
      <v-row class="container-full-login" no-gutters>
        <v-col cols="12" sm="5" md="5" class="d-flex justify-center container-color-login py-0 px-4">
          <v-form @submit.prevent="hacerLogin()" class="d-flex justify-center ma-auto">
            <v-card :max-width="xs? 350 : 350" class="pa-2 rounded-lg">
              <v-card-text>
                <v-row>
                  <v-col cols="12" class="py-1">
                    <div v-if="!registrar">
                      Nombre o Usuario
                      <v-text-field
                        class=""
                        v-model="usuario"
                        hide-details
                        variant='outlined'
                        density='comfortable'
                        clearable
                      ></v-text-field>
                    </div>
                    <div v-if="registrar">
                      Nombre y Apellido
                      <v-text-field
                        class=""
                        v-model="nombre"
                        hide-details
                        variant='outlined'
                        density='comfortable'
                        clearable
                      ></v-text-field>
                    </div>
                    <div v-if="registrar" class="pt-2">
                      Nombre de Usuario
                      <v-text-field
                        class=""
                        v-model="username"
                        hide-details
                        variant='outlined'
                        density='comfortable'
                        clearable
                      ></v-text-field>
                    </div>
                  </v-col>
                  <v-col cols="12" class="py-1" v-if="registrar">
                    Email
                    <v-text-field
                      class=""
                      v-model="email"
                      hide-details
                      variant='outlined'
                      density='comfortable'
                      :error="errorEmail"
                      clearable
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" class="py-1">
                    Contraseña
                    <v-text-field
                      class=""
                      v-model="contras"
                      hide-details
                      type="password"
                      variant='outlined'
                      density='comfortable'
                      dense
                      clearable
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" class="d-flex justify-center pt-2 pb-1">
                    <v-btn color="primary" :loading="inicioSecion" type="submit">
                      {{ registrar ? 'Registrarse' : 'Iniciar sesión' }}
                    </v-btn>
                  </v-col>
                </v-row>
                <!--<v-row clas="">
                  <v-col cols="12" class="d-flex justify-center py-1">
                    <div class="subtitle-2 text-orange" @click="controlarRegistro()">
                      {{ registrar ? 'Iniciar sesión' : '¿Eres nuevo? Registrate aquí' }}
                    </div>
                  </v-col>
                </v-row>-->
              </v-card-text>
            </v-card>
          </v-form>
        </v-col>
        <v-col cols="12" sm="7" md="7" v-if="!xs" class="py-0">
          <Logo/>
        </v-col>
      </v-row>
    </v-col>
    <!--<v-col cols="12" class="py-0 bg-footer" style="height: 5vh;"><Footer /></v-col>-->
  </v-row>
</template>

<script setup>
  //imports
  import { ref } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { useDisplay } from 'vuetify/lib/framework.mjs';
  import { useAuthStore } from '@/store/auth';
  import { genericosStore } from '@/store/genericos';
  import Logo from '@/components/generales/Logo.vue';
  
  //data
  const usuario        = ref('');
  const nombre         = ref('');
  const username       = ref('');
  const contras        = ref('');
  const email          = ref('');
  const inicioSecion   = ref(false);
  const registrar      = ref(false);
  const router         = useRouter();
  const route          = useRoute();
  const auth           = useAuthStore();
  const { xs }         = useDisplay();
  const useGenericos   = genericosStore();
  const errorEmail     = ref(false);
  const emailPattern   = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  //methods
  const validarCampos = () => {
    let error = {  resultado: 1,  msj: '' };

    if(registrar.value){
      if( !email.value || !emailPattern.test(email.value)){
        error.resultado = 0;
        error.msj       = 'Ingresar email válido.';
        return error
      }
      if(!nombre.value){
        error.resultado = 0;
        error.msj       = 'Ingresar Nombre y Apellido';
        return error
      }  
      if(!username.value){
        error.resultado = 0;
        error.msj       = 'Ingresar Nombre de Usuario';
        return error
      }    
    }else{
      if(!usuario.value){
        error.resultado = 0;
        error.msj       = 'Ingresar el usuario';
        return error
      }
    }
    if(!contras.value){
      error.resultado = 0;
      error.msj       = 'Ingresar una contraseña';
      return error
    }
    return error;
  };
  const hacerLogin = async () => {
    let error = validarCampos();
    if(error && error.resultado == 0){
      useGenericos.activarSnack = true;
      useGenericos.textoSnack   = error.msj;
      useGenericos.colorSnack   = 'info';
      return 
    }
    inicioSecion.value = true;
    let res; 
    if(registrar.value){
      res = await auth.registrarse(nombre.value, username.value, email.value, contras.value);
    }else{
      res = await auth.iniciarSesion(usuario.value, contras.value);
    }
    inicioSecion.value = false;
    if(res.resultado == 0){
      useGenericos.activarSnack = true;
      useGenericos.textoSnack   = res.msj;
      useGenericos.colorSnack   = 'error';
      usuario.value  = '';
      email.value    = ''; 
      contras.value  = '';
      nombre.value   = '';
      username.value = '';
      return 
    }
    router.push({ name: 'Inicio' });
  };
  const controlarRegistro = () => {
    registrar.value = !registrar.value;
  };
</script>

<style scoped>
  .container-full{
    height: 100%; /* Ocupa todo el alto de la pantalla */
    width: 100%;
  }
  .container-full-login{
    height: 100vh;/*95vh;*/
  }
  .container-color-login {
    background: linear-gradient(to right, #00c6ff, #0072ff); /* Fondo degradado */
  }
  .login{
    padding: 20px 25px;
    width: 100%;
    max-width: 400px; /* Tamaño máximo del formulario */
  }
</style>