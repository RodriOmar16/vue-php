import { defineStore } from 'pinia';
import { iniciarSesion, cerrarSesion, registrarse } from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
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
        this.contrasenia     = contrasenia;
        this.isAuthenticated = true;
      }
      return res;
    },
    cerrarSesion() {
      this.usuario         = null;
      this.email           = null;
      this.contrasenia     = null;
      this.isAuthenticated = false
      cerrarSesion();
    },
    async registrarse(usuario, email, contrasenia){
      console.log("auth.js, :",usuario, email, contrasenia)
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