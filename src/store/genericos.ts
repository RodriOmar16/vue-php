import { defineStore } from 'pinia';

export type ColorAviso = 'info' | 'success' | 'warning' | 'error';

/** Estado global de la interfaz: pantalla de carga y avisos (snackbar). */
export const genericosStore = defineStore('genericos', {
  state: () => ({
    loading: false,
    activarSnack: false,
    textoSnack: '',
    colorSnack: 'info' as ColorAviso,
  }),
  actions: {
    setLoading(valor: boolean) {
      this.loading = valor;
    },
    setSnackBar(texto: string, color: ColorAviso = 'info') {
      this.textoSnack = texto;
      this.colorSnack = color;
      this.activarSnack = true;
    },
  },
});
