import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/general/Login.vue'),
    },
    {
      path: '/login',
      name: 'Login',
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