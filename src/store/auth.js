import { defineStore } from 'pinia';
import { iniciarSesion, cerrarSesion, registrarse } from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    nombre: null,
    username: null,
    email: null,
    contrasenia: null,
    isAuthenticated: !!localStorage.getItem('token')
  }),
  actions: {
    async iniciarSesion(usuario, contrasenia) {
      const res = await iniciarSesion(usuario, contrasenia);
      //peticion
      if(res.resultado != 0){
        this.usuario         = usuario;
        this.nombre          = null;
        this.username        = null;
        this.contrasenia     = contrasenia;
        this.isAuthenticated = true;
      }
      return res;
    },
    cerrarSesion() {
      this.usuario         = null;
      this.nombre          = null;
      this.username        = null;
      this.email           = null;
      this.contrasenia     = null;
      this.isAuthenticated = false
      cerrarSesion();
    },
    async registrarse(nombre, username, email, contrasenia){
      console.log("auth.js, :",nombre, username, email, contrasenia)
      //llamada de validaciones
      const res = await registrarse(nombre, username, email, contrasenia);
      if(res.resultado != 0){
        this.nombre          = nombre;
        this.username        = username;
        this.usuario         = null;
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