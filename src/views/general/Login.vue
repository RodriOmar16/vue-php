<template>
  <v-form @submit.prevent="hacerLogin" class="container">
    <v-card class="login mx-4" :class="xs ? 'ma-auto' : 'mx-4'">
      <v-row>
        <v-col cols="12">
          Usuario
          <v-text-field
            class="mt-2"
            v-model="usuario"
            hide-details
            variant='outlined'
            density='default'
            clearable
          ></v-text-field>
        </v-col>
        <v-col cols="12" v-if="registrar">
          Email
          <v-text-field
            class="mt-2"
            v-model="email"
            hide-details
            variant='outlined'
            dense
            clearable
          ></v-text-field>
        </v-col>
        <v-col cols="12">
          Contraseña
          <v-text-field
            class="mt-2"
            v-model="contras"
            hide-details
            type="password"
            variant='outlined'
            dense
            clearable
          ></v-text-field>
        </v-col>
        <v-col cols="12" class="d-flex justify-center">
          <v-btn color="primary" :loading="inicioSecion" type="submit">
            {{ registrar ? 'Registrarse' : 'Iniciar seción' }}
          </v-btn>
        </v-col>
      </v-row>
      <v-row v-if="!registrar">
        <v-col cols="12" class="d-flex justify-center">
          <div class="subtitle-2 text-orange" @click="registrarse()">
            ¿Eres nuevo? Registrate aquí
          </div>
        </v-col>
      </v-row>
    </v-card>
  </v-form>
</template>

<script setup>
  //imports
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useDisplay } from 'vuetify/lib/framework.mjs';
  import { useAuthStore } from '@/store/auth';
  import { genericos } from '@/store/genericos';
  
  //data
  const usuario = ref('');
  const contras = ref('');
  const email   = ref('');
  const inicioSecion = ref(false);
  const registrar = ref(false);
  const router = useRouter();
  const auth = useAuthStore();
  const { xs } = useDisplay();
  const genericosStore = genericos();
  
  //methods
  const hacerLogin = () => {
    if(!usuario.value || !contras.value){ 
      genericosStore.activarSnack = true;
      genericosStore.textoSnack   = 'Ingrese usuario o contraseña faltante'
      genericosStore.colorSnack   = 'info';
    }
    if(registrar.value){
      auth.registrarse(usuario.value, contras.value);
    }else{
      inicioSecion.value = true;
      auth.iniciarSesion(usuario.value);
    }
    inicioSecion.value = true;
    router.push({name:'Inicio'});
  };
  const registrarse = () => {
    // abrir o mostrar formulario para registro
    registrar.value = true;
    console.log("registrar nuevo")
  };
</script>

<style scoped>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh; /* Ocupa todo el alto de la pantalla */
    background: linear-gradient(to right, #00c6ff, #0072ff); /* Fondo degradado */
  }
  .login{
    padding: 20px;
    width: 100%;
    max-width: 400px; /* Tamaño máximo del formulario */
  }
</style>