import type { RouteLocationRaw } from 'vue-router';
import type { RolCodigo } from '@/api/tipos';

/** Metadatos que declaran las rutas. */
export interface MetaRuta {
  /** Exige sesión iniciada */
  requiereAuth?: boolean;
  /** Solo para quien NO tiene sesión (p. ej. el login) */
  soloInvitado?: boolean;
  /** Si se indica, solo estos roles */
  roles?: RolCodigo[];
  /** Disponible aunque la persona deba cambiar su clave temporal */
  permiteCambioPassword?: boolean;
}

export interface EstadoSesion {
  autenticado: boolean;
  debeCambiarPassword: boolean;
  rol: RolCodigo | null;
}

export type Decision =
  | { permitir: true }
  | { permitir: false; redirigir: RouteLocationRaw; mensaje?: string };

/**
 * Decide si se puede entrar a una ruta. Es una función pura (sin router ni
 * stores) para poder probar todas las combinaciones. Esto mejora la experiencia,
 * pero la seguridad real está en la API, que valida token y rol en cada endpoint.
 */
export function decidirNavegacion(
  destino: { meta: MetaRuta; fullPath: string },
  sesion: EstadoSesion,
): Decision {
  const { meta } = destino;

  if (meta.soloInvitado && sesion.autenticado) {
    return { permitir: false, redirigir: { name: 'admin-inicio' } };
  }

  if (meta.requiereAuth && !sesion.autenticado) {
    return {
      permitir: false,
      redirigir: { name: 'admin-login', query: { redirect: destino.fullPath } },
    };
  }

  if (meta.requiereAuth && sesion.debeCambiarPassword && !meta.permiteCambioPassword) {
    return { permitir: false, redirigir: { name: 'admin-cambiar-password' } };
  }

  if (meta.roles && (!sesion.rol || !meta.roles.includes(sesion.rol))) {
    return {
      permitir: false,
      redirigir: { name: 'admin-inicio' },
      mensaje: 'No tiene permiso para acceder a esa sección.',
    };
  }

  return { permitir: true };
}
