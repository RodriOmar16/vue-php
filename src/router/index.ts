import { createRouter, createWebHistory } from 'vue-router';
import { ApiError } from '@/api/http';
import { genericosStore } from '@/store/genericos';
import { useSesionStore } from '@/store/sesion';
import { decidirNavegacion, type MetaRuta } from './guardias';

declare module 'vue-router' {
  interface RouteMeta extends MetaRuta {}
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ---------- Sitio público ----------
    {
      path: '/',
      component: () => import('@/layouts/LayoutPublico.vue'),
      children: [{ path: '', name: 'inicio', component: () => import('@/views/general/Inicio.vue') }],
    },
    { path: '/home', redirect: { name: 'inicio' } },

    // ---------- Back office (equivalente al /wp-admin) ----------
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/LoginAdmin.vue'),
      meta: { soloInvitado: true },
    },
    {
      path: '/admin',
      component: () => import('@/layouts/LayoutAdmin.vue'),
      meta: { requiereAuth: true },
      children: [
        { path: '', name: 'admin-inicio', component: () => import('@/views/admin/AdminInicio.vue') },
        {
          path: 'plataforma/empresas',
          name: 'admin-plataforma-empresas',
          component: () => import('@/views/admin/plataforma/EmpresasPlataforma.vue'),
          meta: { roles: ['superadmin'] },
        },
        {
          path: 'equipo',
          name: 'admin-equipo',
          component: () => import('@/views/admin/equipo/EquipoView.vue'),
          meta: { roles: ['propietario'] },
        },
        {
          path: 'cambiar-password',
          name: 'admin-cambiar-password',
          component: () => import('@/views/admin/CambiarPassword.vue'),
          meta: { permiteCambioPassword: true },
        },
      ],
    },

    { path: '/:pathMatch(.*)*', name: 'no-encontrada', component: () => import('@/views/general/NotFound.vue') },
  ],
});

router.beforeEach(async (to) => {
  const sesion = useSesionStore();
  const avisos = genericosStore();

  // Hay token guardado pero todavía no sabemos quién es (recarga de página): cargar el perfil.
  if (sesion.token && !sesion.usuario) {
    try {
      await sesion.cargarPerfil();
    } catch (error) {
      avisos.setSnackBar(
        error instanceof ApiError ? error.message : 'No se pudo cargar su sesión.',
        'error',
      );
    }
  }

  const decision = decidirNavegacion(to, {
    autenticado: sesion.autenticado,
    debeCambiarPassword: sesion.debeCambiarPassword,
    rol: sesion.rol,
  });
  if (decision.permitir) return true;
  if (decision.mensaje) avisos.setSnackBar(decision.mensaje, 'warning');
  return decision.redirigir;
});

export default router;
