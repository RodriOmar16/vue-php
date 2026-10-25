import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { cliente } from '@/api/cliente';
import App from './App.vue';
import './assets/main.css';
import vuetify from './plugins/vuetify';
import router from './router';
import { genericosStore } from './store/genericos';
import { useSesionStore } from './store/sesion';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia).use(router).use(vuetify);

// El cliente HTTP avisa de eventos de sesión; acá, donde ya existen router y stores, se conectan.
cliente.configurar({
  alNoAutorizado: () => {
    const sesion = useSesionStore();
    const estabaEnElPanel = router.currentRoute.value.matched.some((r) => r.meta.requiereAuth);
    sesion.cerrarSesion();
    if (estabaEnElPanel) {
      genericosStore().setSnackBar('Su sesión expiró. Vuelva a iniciar sesión.', 'warning');
      void router.push({
        name: 'admin-login',
        query: { redirect: router.currentRoute.value.fullPath },
      });
    }
  },
  alRequerirCambioPassword: () => {
    void useSesionStore().cargarPerfil().then(() => router.push({ name: 'admin-cambiar-password' }));
  },
});

app.mount('#app');
