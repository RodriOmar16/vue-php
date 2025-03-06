import { defineStore } from "pinia";

export const genericos = defineStore("genericos", {
  state: () => {
    return {
      token: null,
      expiracion: null,
      loading: false,
      textoSnack: '',
      colorSnack: '',
      activarSnack: false,
      empresas: [],
      empresasPorUsuario: [],
      infoUsuario: null,
      tipos_comprobantes: [],
      isDarkMode: false,
    };
  },
  persist: {
    pick: [
      "token",
      "usuario",
      "email",
      "expiracion",
      "infoUsuario",
      "isDarkMode",
    ],
  },
  actions: {
    setLoading(value) {
      this.loading = value;
    },
  },
});

