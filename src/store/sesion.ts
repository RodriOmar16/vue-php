import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { cambiarPassword as cambiarPasswordApi, login, obtenerPerfil } from '@/api/auth';
import { ApiError } from '@/api/http';
import { borrarToken, guardarToken, leerToken } from '@/api/token';
import type { Perfil } from '@/api/tipos';

/**
 * Sesión del personal. Está "autenticado" cuando hay token Y se pudo cargar el perfil:
 * así un token viejo o un servidor caído no dejan entrar a una pantalla vacía.
 */
export const useSesionStore = defineStore('sesion', () => {
  const token = ref<string | null>(leerToken());
  const usuario = ref<Perfil | null>(null);

  const autenticado = computed(() => !!token.value && !!usuario.value);
  const rol = computed(() => usuario.value?.rol ?? null);
  const esSuperadmin = computed(() => rol.value === 'superadmin');
  const esDueno = computed(() => rol.value === 'propietario');
  const esEmpleado = computed(() => rol.value === 'empleado');
  const debeCambiarPassword = computed(() => usuario.value?.debeCambiarPassword ?? false);

  async function iniciarSesion(email: string, password: string) {
    const respuesta = await login(email.trim(), password);
    guardarToken(respuesta.accessToken);
    token.value = respuesta.accessToken;
    usuario.value = respuesta.usuario;
  }

  /** Trae el perfil si hay token. Un 401 (token vencido) cierra la sesión; otros errores se propagan. */
  async function cargarPerfil() {
    if (!token.value) return;
    try {
      usuario.value = await obtenerPerfil();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        cerrarSesion();
        return;
      }
      throw error;
    }
  }

  async function cambiarPassword(passwordActual: string, passwordNueva: string) {
    await cambiarPasswordApi(passwordActual, passwordNueva);
    await cargarPerfil();
  }

  function cerrarSesion() {
    borrarToken();
    token.value = null;
    usuario.value = null;
  }

  return {
    token,
    usuario,
    autenticado,
    rol,
    esSuperadmin,
    esDueno,
    esEmpleado,
    debeCambiarPassword,
    iniciarSesion,
    cargarPerfil,
    cambiarPassword,
    cerrarSesion,
  };
});
