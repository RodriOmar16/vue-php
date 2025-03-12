import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/general/Inicio.vue'),
    },
    {
      path: '/home',
      name: 'Inicio',
      component: () => import('../views/general/Inicio.vue'),
    },
    {
      path: '/reservas',
      name: 'Reservas',
      component: () => import('../views/reservas/Reservas.vue'),
    },
    {
      path: '/combos',
      name: 'Combos',
      component: () => import('../views/combos/Combos.vue'),
    },
    {
      path: '/gestionar-usuarios',
      name: 'Dashboard',
      component: () => import('../views/usuarios/Usuarios.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/general/Login.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/general/NotFound.vue')
    }
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const token = localStorage.getItem('token');
  authStore.isAuthenticated = token ? true : false;
  if(to.meta.requiresAuth && !token){
    next({ name: 'Login' });
  }else{
    next();
  }
});

export default router;