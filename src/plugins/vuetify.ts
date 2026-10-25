import '@fortawesome/fontawesome-free/css/all.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, fa } from 'vuetify/iconsets/fa';

export default createVuetify({
  defaults: {
    VTextField: { variant: 'outlined', density: 'compact' },
    VAutocomplete: { variant: 'outlined', density: 'compact' },
  },
  components,
  directives,
  icons: {
    defaultSet: 'fa',
    aliases,
    sets: { fa },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          error: '#FF5252',
          success: '#4CAF50',
          warning: '#FB8C00',
          info: '#2196F3',
          footer: '#003366',
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
          footer: '#001A33',
        },
      },
    },
  },
});
