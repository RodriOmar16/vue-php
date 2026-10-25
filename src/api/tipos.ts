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
  /** zona IANA de la empresa: las franjas ("15:00") y los cierres se interpretan en ella */
  zonaHoraria: string;
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

// ---------- Plataforma (solo superadmin) ----------

export interface EmpresaPlataforma {
  id: number;
  slug: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  zonaHoraria: string;
  inhabilitado: boolean;
  creadoEn: string;
  _count: { usuarios: number; salones: number };
}

export interface AltaEmpresa {
  nombre: string;
  slug: string;
  zonaHoraria?: string;
  nombreSalon?: string;
  dueno: { nombre: string; username: string; email: string };
}

/** Persona que recibe una clave temporal (dueño o empleado). */
export interface UsuarioResumen {
  id: number;
  nombre: string;
  email: string;
}

export interface RespuestaAltaEmpresa {
  empresa: Omit<EmpresaPlataforma, '_count'>;
  salon: { id: number; nombre: string; esDefault: boolean };
  dueno: UsuarioResumen & { username: string; rol: RolCodigo; debeCambiarPassword: boolean };
  /** se muestra una sola vez */
  passwordTemporal: string;
}

export interface RespuestaResetDueno {
  dueno: UsuarioResumen;
  passwordTemporal: string;
}

// ---------- Equipo de la empresa (dueño) ----------

export type RolEquipo = 'propietario' | 'empleado';

export interface UsuarioEquipo {
  id: number;
  nombre: string;
  username: string;
  email: string;
  rol: RolEquipo;
  inhabilitado: boolean;
  /** true mientras no cambie la clave temporal con la que se le dio de alta */
  debeCambiarPassword: boolean;
  creadoEn: string;
}

export interface AltaUsuario {
  nombre: string;
  username: string;
  email: string;
  rol: RolEquipo;
}

export interface RespuestaAltaUsuario {
  usuario: UsuarioEquipo;
  /** se muestra una sola vez */
  passwordTemporal: string;
}

// ---------- Salones, horarios y cierres ----------

export interface Salon {
  id: number;
  nombre: string;
  descripcion: string | null;
  capacidad: number | null;
  /** el salón que se preselecciona cuando el cliente no elige */
  esDefault: boolean;
  /** minutos de margen entre un evento y el siguiente */
  minutosLimpieza: number;
  inhabilitado: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DatosSalon {
  nombre: string;
  descripcion?: string;
  capacidad?: number;
  minutosLimpieza?: number;
  esDefault?: boolean;
  /** solo al crear: ofrecer en el salón nuevo todos los combos activos */
  ofrecerCombos?: boolean;
}

/** Ventana en la que el salón recibe eventos un día de la semana. */
export interface Franja {
  id: number;
  salonId: number;
  /** 1 = lunes ... 7 = domingo */
  diaSemana: number;
  /** HH:mm, hora local de la empresa */
  horaInicio: string;
  /** HH:mm; si es menor que horaInicio la franja termina al día siguiente */
  horaFin: string;
}

export interface DatosFranja {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

/** Cierre del salón (feriado, mantenimiento...). salonId null = todos los salones. */
export interface Bloqueo {
  id: number;
  salonId: number | null;
  /** instantes ISO en UTC */
  desde: string;
  hasta: string;
  motivo: string | null;
}

export interface DatosBloqueo {
  salonId?: number | null;
  desde: string;
  hasta: string;
  motivo?: string;
}
