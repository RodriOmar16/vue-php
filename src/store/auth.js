import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    contrasenia: null,
    isAuthenticated: false
  }),
  actions: {
    iniciarSesion(usuario) {
      this.usuario = usuario;
      this.isAuthenticated = true;
    },
    cerrarSesion() {
      this.usuario = null;
      this.isAuthenticated = false
    },
    registrarse(usuario, contrasenia){
      console.log(usuario, contrasenia)
      this.usuario = usuario;
      this.contrasenia = contrasenia;
      this.isAuthenticated = true;
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