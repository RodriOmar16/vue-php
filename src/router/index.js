import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Iniciar-Sesion',
      component: () => import('../views/general/Login.vue'),
    },
    {
      path: '/home',
      name: 'Inicio',
      component: () => import('../views/general/Inicio.vue'),
    },
  ],
})

export default router;