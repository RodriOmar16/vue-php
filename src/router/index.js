import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: (to) => {
        const token = localStorage.getItem('token');
        return token ? '/home' : 'login';
      }
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
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const token = localStorage.getItem('token');
  authStore.isAuthenticated = token ? true : false;
  if(to.meta.requiresAuth && !token){
    next({ name: 'Login' });
  }else if(!to.meta.requiresAuth && token && to.name === 'Login'){
    next({ name: 'Inicio' });
  }else{
    next();
  }
});

export default router;