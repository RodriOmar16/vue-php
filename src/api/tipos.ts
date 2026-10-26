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

// ---------- Catálogos del dueño: alimentos, menús, instalaciones, servicios ----------
// Los importes llegan de la API como texto con 2 decimales («1500.00») y se envían como número.

export type TipoAlimento = 'comida' | 'bebida';
export type PublicoMenu = 'ninos' | 'adultos' | 'todos';
export type PrecioPor = 'persona' | 'fijo';

export interface Alimento {
  id: number;
  nombre: string;
  tipo: TipoAlimento;
  inhabilitado: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** Alimento tal como aparece dentro de un menú (puede estar de baja). */
export type AlimentoEnMenu = Pick<Alimento, 'id' | 'nombre' | 'tipo' | 'inhabilitado'>;

export interface Menu {
  id: number;
  nombre: string;
  descripcion: string | null;
  publico: PublicoMenu;
  precio: string;
  precioPor: PrecioPor;
  inhabilitado: boolean;
  creadoEn: string;
  actualizadoEn: string;
  alimentos: AlimentoEnMenu[];
}

export interface DatosMenu {
  nombre: string;
  descripcion?: string;
  publico?: PublicoMenu;
  precio: number;
  precioPor?: PrecioPor;
  /** Reemplaza el conjunto completo de alimentos; omitirlo no lo toca */
  alimentoIds?: number[];
}

export interface Instalacion {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  edadMin: number | null;
  edadMax: number | null;
  inhabilitado: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DatosInstalacion {
  nombre: string;
  descripcion?: string;
  precio?: number;
  /** null quita la restricción */
  edadMin?: number | null;
  edadMax?: number | null;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  precioPor: PrecioPor;
  inhabilitado: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface DatosServicio {
  nombre: string;
  descripcion?: string;
  precio: number;
  precioPor?: PrecioPor;
}

// ---------- Combos, tarifas y cotizador ----------

export interface ComboSalon {
  id: number;
  nombre: string;
  inhabilitado: boolean;
}

/** Opción de menú dentro de un combo: el cliente elige UNA; `recargo` es lo que se suma si esa opción es más cara. */
export interface ComboMenu {
  id: number;
  nombre: string;
  publico: PublicoMenu;
  precio: string;
  precioPor: PrecioPor;
  inhabilitado: boolean;
  recargo: string | null;
}

export interface ComboInstalacion {
  id: number;
  nombre: string;
  precio: string;
  inhabilitado: boolean;
}

export interface ComboServicio {
  id: number;
  nombre: string;
  precio: string;
  precioPor: PrecioPor;
  inhabilitado: boolean;
}

export interface Combo {
  id: number;
  nombre: string;
  descripcion: string | null;
  /** incluye hasta `maxPersonas` invitados y `cantidadHoras` de duración */
  precioBase: string;
  maxPersonas: number;
  /** por cada invitado que supere maxPersonas */
  precioAdicionalPersona: string;
  cantidadHoras: number;
  precioHoraExtra: string;
  observaciones: string | null;
  inhabilitado: boolean;
  creadoEn: string;
  actualizadoEn: string;
  salones: ComboSalon[];
  menus: ComboMenu[];
  instalaciones: ComboInstalacion[];
  servicios: ComboServicio[];
}

export interface DatosCombo {
  nombre: string;
  descripcion?: string;
  precioBase: number;
  maxPersonas: number;
  precioAdicionalPersona?: number;
  cantidadHoras: number;
  precioHoraExtra?: number;
  observaciones?: string;
  /** Cada lista reemplaza el conjunto completo; omitirla no lo toca */
  salonIds?: number[];
  menus?: { menuId: number; recargo?: number }[];
  instalacionIds?: number[];
  servicioIds?: number[];
}

/** Precio especial de un combo por día de la semana, feriado o temporada. */
export interface Tarifa {
  id: number;
  comboId: number;
  /** null = todos los salones donde se ofrece el combo */
  salonId: number | null;
  /** 1 = lunes ... 7 = domingo */
  diaSemana: number | null;
  /** YYYY-MM-DD, siempre juntas o ambas null */
  fechaDesde: string | null;
  fechaHasta: string | null;
  precioBase: string;
  precioAdicionalPersona: string | null;
  prioridad: number;
  inhabilitado: boolean;
}

export interface DatosTarifa {
  /** null quita la condición (al editar) */
  salonId?: number | null;
  diaSemana?: number | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  precioBase: number;
  precioAdicionalPersona?: number | null;
  prioridad?: number;
}

export interface Cotizacion {
  combo: { id: number; nombre: string };
  salonId: number;
  fecha: string;
  invitados: number;
  maxPersonas: number;
  precioBase: { importe: string; origen: 'combo' | 'tarifa'; tarifaId: number | null };
  excedente: { personas: number; precioPorPersona: string; importe: string };
  total: string;
}

// ---------- Fotos (medios) ----------

export type TipoMedio = 'salones' | 'combos' | 'instalaciones';

export interface Medio {
  id: number;
  orden: number;
  esPortada: boolean;
  alt: string | null;
  /** URL pública (assets.studiosrm.com.ar): el navegador la baja directo, sin pasar por la API */
  url: string;
  mime: string;
  bytes: number;
}

// ---------- Marca de la empresa (lo que muestra el sitio público) ----------

export const REDES = ['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'web'] as const;
export type Red = (typeof REDES)[number];

export interface MarcaEmpresa {
  slug: string;
  nombre: string;
  colorPrimario: string | null;
  colorSecundario: string | null;
  tituloHero: string | null;
  textoHero: string | null;
  sobreNosotros: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  redes: Partial<Record<Red, string>> | null;
  logoUrl: string | null;
}

/** Omitir un campo lo conserva; null lo quita (el nombre no se puede quitar) */
export interface CambiosMarca {
  nombre?: string;
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  tituloHero?: string | null;
  textoHero?: string | null;
  sobreNosotros?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  redes?: Partial<Record<Red, string>> | null;
}
