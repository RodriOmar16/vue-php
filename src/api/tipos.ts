/** Tipos de las respuestas de api-reservas (a mano: la API aún no documenta sus respuestas en Swagger). */

export type RolCodigo = 'superadmin' | 'propietario' | 'empleado';

/** Cómo se llama cada rol de cara al usuario. «Superadmin» solo lo ve quien lo es. */
export const ETIQUETA_ROL: Record<RolCodigo, string> = {
  superadmin: 'Superadmin',
  propietario: 'Dueño',
  empleado: 'Empleado',
};

export interface EmpresaResumen {
  id: number;
  slug: string;
  nombre: string;
}

export interface Perfil {
  id: number;
  nombre: string;
  username: string;
  email: string;
  rol: RolCodigo;
  debeCambiarPassword: boolean;
  /** null para el superadmin, que no pertenece a ninguna empresa */
  empresa: EmpresaResumen | null;
}

export interface RespuestaLogin {
  accessToken: string;
  tokenType: 'Bearer';
  /** segundos */
  expiresIn: number;
  debeCambiarPassword: boolean;
  usuario: Perfil;
}
