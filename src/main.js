import './assets/main.css'
import vuetify from './plugins/vuetify'; // Importa Vuetify
import { createApp } from 'vue'
import { createPinia } from 'pinia';
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router);
app.use(vuetify);
app.use(createPinia());

app.mount('#app')
