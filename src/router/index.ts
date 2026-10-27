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
          path: 'salones',
          name: 'admin-salones',
          component: () => import('@/views/admin/salones/SalonesView.vue'),
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'salones/:id/horarios',
          name: 'admin-salon-horarios',
          component: () => import('@/views/admin/salones/HorariosSalonView.vue'),
          props: (route) => ({ id: Number(route.params.id) }),
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'cierres',
          name: 'admin-bloqueos',
          component: () => import('@/views/admin/salones/BloqueosView.vue'),
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'calendario',
          name: 'admin-calendario',
          component: () => import('@/views/admin/reservas/CalendarioView.vue'),
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'reservas',
          name: 'admin-reservas',
          component: () => import('@/views/admin/reservas/ReservasView.vue'),
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'reservas/:id',
          name: 'admin-reserva-detalle',
          component: () => import('@/views/admin/reservas/ReservaDetalleView.vue'),
          props: true,
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'pagina',
          name: 'admin-pagina',
          component: () => import('@/views/admin/pagina/MiPaginaView.vue'),
          meta: { roles: ['propietario'] },
        },
        {
          path: 'marca',
          name: 'admin-marca',
          component: () => import('@/views/admin/marca/MarcaView.vue'),
          meta: { roles: ['propietario'] },
        },
        {
          path: 'combos',
          name: 'admin-combos',
          component: () => import('@/views/admin/combos/CombosView.vue'),
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'combos/:id',
          name: 'admin-combo-detalle',
          component: () => import('@/views/admin/combos/ComboDetalleView.vue'),
          props: (route) => ({ id: Number(route.params.id) }),
          meta: { roles: ['propietario', 'empleado'] },
        },
        {
          path: 'catalogo',
          component: () => import('@/views/admin/catalogo/LayoutCatalogo.vue'),
          redirect: { name: 'admin-catalogo-menus' },
          meta: { roles: ['propietario', 'empleado'] },
          children: [
            { path: 'menus', name: 'admin-catalogo-menus', component: () => import('@/views/admin/catalogo/MenusView.vue') },
            { path: 'alimentos', name: 'admin-catalogo-alimentos', component: () => import('@/views/admin/catalogo/AlimentosView.vue') },
            { path: 'instalaciones', name: 'admin-catalogo-instalaciones', component: () => import('@/views/admin/catalogo/InstalacionesView.vue') },
            { path: 'servicios', name: 'admin-catalogo-servicios', component: () => import('@/views/admin/catalogo/ServiciosView.vue') },
          ],
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
