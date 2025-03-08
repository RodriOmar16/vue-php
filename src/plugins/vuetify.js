import '@fortawesome/fontawesome-free/css/all.css'; // Importa el CSS de FontAwesome
import 'vuetify/styles'; // Estilos de Vuetify
import { createVuetify } from 'vuetify';
import { aliases, fa } from 'vuetify/iconsets/fa'; // Iconos FontAwesome
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'fa',
    aliases,
    sets: {
      fa,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2', // Azul predeterminado
          secondary: '#424242', // Gris
          error: '#FF5252', // Rojo
          success: '#4CAF50', // Verde
          warning: '#FB8C00', // Naranja
          info: '#2196F3', // Azul Claro
          footer: '#003366'
        },
      },
      dark: {
        colors: {
          primary: '#2196F3',
          secondary: '#757575',
          error: '#EF5350',
          success: '#66BB6A',
          warning: '#FFB74D',
          info: '#29B6F6',
          footer: '#001A33'
        },
      },
    },
  },
});

export default vuetify;
