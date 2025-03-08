import { defineStore } from 'pinia';
import { iniciarSesion, registrarse } from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    email: null,
    contrasenia: null,
    isAuthenticated: false
  }),
  actions: {
    async iniciarSesion(usuario, contrasenia) {
      console.log("usuario:",usuario, ", contrasenia: ", contrasenia)
      const res = await iniciarSesion(usuario, contrasenia);
      //peticion
      if(res.resultado != 0){
        this.usuario         = usuario;
        this.contrasenia     = contrasenia;
        this.isAuthenticated = true;
      }
      return res;
    },
    cerrarSesion() {
      this.usuario = null;
      this.isAuthenticated = false
    },
    async registrarse(usuario, email, contrasenia){
      console.log(usuario, email, contrasenia)
      //llamada de validaciones
      const res = await registrarse(usuario, email, contrasenia);
      if(res.resultado != 0){
        this.usuario         = usuario;
        this.email           = email;
        this.contrasenia     = contrasenia;
        this.isAuthenticated = true;
      }
      return res;
    }
  },
  getters: {
    usuarioAutenticado: (state) => !!state.usuario
  }
});

/*
<script setup>
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';

const authStore = useAuthStore();
const { usuarioAutenticado } = storeToRefs(authStore);
</script>

<template>
  <div v-if="usuarioAutenticado">
    ¡Bienvenido, usuario autenticado!
  </div>
  <div v-else>
    Por favor, inicia sesión.
  </div>
</template>
--------------------------------------------------------
Iniciar sesión en un botón
vue
Copiar
Editar
<script setup>
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();

const login = () => {
  authStore.iniciarSesion({ nombre: 'Juan', email: 'juan@example.com' });
};
</script>

<template>
  <button @click="login">Iniciar sesión</button>
</template>
Cerrar sesión
vue
Copiar
Editar
<script setup>
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();

const logout = () => {
  authStore.cerrarSesion();
};
</script>

<template>
  <button @click="logout">Cerrar sesión</button>
</template>
*/