/** Cliente HTTP de la API: tipado, con token automático y errores uniformes. */

export class ApiError extends Error {
  constructor(
    /** código HTTP; 0 si no hubo respuesta (servidor caído, sin red) */
    readonly status: number,
    message: string,
    /** código de negocio opcional que manda la API, p. ej. PASSWORD_CHANGE_REQUIRED */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface OpcionesHttp {
  baseUrl: string;
  obtenerToken: () => string | null;
  /** Se invoca ante un 401 de una ruta autenticada (token vencido o usuario dado de baja). */
  alNoAutorizado?: () => void;
  /** Se invoca ante 403 PASSWORD_CHANGE_REQUIRED (clave temporal sin cambiar). */
  alRequerirCambioPassword?: () => void;
  fetchImpl?: typeof fetch;
}

export interface OpcionesPedido {
  cuerpo?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** false = ruta pública o de login: no envía el token ni dispara el cierre de sesión ante un 401 */
  autenticado?: boolean;
}

const MENSAJES_ESTADO: Record<number, string> = {
  401: 'Su sesión expiró. Vuelva a iniciar sesión.',
  403: 'No tiene permiso para realizar esta acción.',
  404: 'No se encontró lo que busca.',
  429: 'Demasiados intentos. Espere un minuto e intente de nuevo.',
};

const MENSAJE_SERVIDOR = 'Error del servidor. Intente más tarde.';

/**
 * La API responde { message: string | string[] } (los de validación vienen como lista).
 * Los mensajes de negocio (400, 409...) se muestran tal cual; los de sesión, límite de
 * intentos y errores del servidor se reemplazan por textos propios, claros y sin detalles técnicos.
 */
const extraerMensaje = (cuerpo: unknown, status: number): string => {
  if (status >= 500) return MENSAJE_SERVIDOR;
  if (status === 401 || status === 429) return MENSAJES_ESTADO[status];

  const mensaje = (cuerpo as { message?: unknown } | null)?.message;
  if (Array.isArray(mensaje) && mensaje.length > 0) {
    return mensaje.join('. ');
  }
  if (typeof mensaje === 'string' && mensaje) {
    return mensaje;
  }
  return MENSAJES_ESTADO[status] ?? 'No se pudo completar la operación.';
};

export class ClienteHttp {
  constructor(private opciones: OpcionesHttp) {}

  /** Permite conectar los avisos de sesión después de crear el cliente (evita dependencias circulares). */
  configurar(cambios: Partial<Pick<OpcionesHttp, 'alNoAutorizado' | 'alRequerirCambioPassword'>>) {
    this.opciones = { ...this.opciones, ...cambios };
  }

  get<T>(ruta: string, opciones?: Omit<OpcionesPedido, 'cuerpo'>) {
    return this.pedir<T>('GET', ruta, opciones);
  }
  post<T>(ruta: string, cuerpo?: unknown, opciones?: Omit<OpcionesPedido, 'cuerpo'>) {
    return this.pedir<T>('POST', ruta, { ...opciones, cuerpo });
  }
  patch<T>(ruta: string, cuerpo?: unknown, opciones?: Omit<OpcionesPedido, 'cuerpo'>) {
    return this.pedir<T>('PATCH', ruta, { ...opciones, cuerpo });
  }
  delete<T = void>(ruta: string, opciones?: Omit<OpcionesPedido, 'cuerpo'>) {
    return this.pedir<T>('DELETE', ruta, opciones);
  }

  async pedir<T>(
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    ruta: string,
    { cuerpo, query, autenticado = true }: OpcionesPedido = {},
  ): Promise<T> {
    const { baseUrl, obtenerToken, fetchImpl = fetch } = this.opciones;

    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(query ?? {})) {
      if (valor !== undefined && valor !== null && valor !== '') {
        parametros.set(clave, String(valor));
      }
    }
    const qs = parametros.toString();
    const url = `${baseUrl.replace(/\/+$/, '')}${ruta}${qs ? `?${qs}` : ''}`;

    const cabeceras: Record<string, string> = { Accept: 'application/json' };
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    const token = autenticado ? obtenerToken() : null;
    if (token) cabeceras.Authorization = `Bearer ${token}`;

    let respuesta: Response;
    try {
      respuesta = await fetchImpl(url, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      });
    } catch {
      throw new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.');
    }

    if (respuesta.ok) {
      if (respuesta.status === 204) return undefined as T;
      return (await respuesta.json()) as T;
    }

    let cuerpoError: unknown = null;
    try {
      cuerpoError = await respuesta.json();
    } catch {
      /* respuesta de error sin JSON */
    }
    const codigo = (cuerpoError as { code?: string } | null)?.code;
    const error = new ApiError(respuesta.status, extraerMensaje(cuerpoError, respuesta.status), codigo);

    if (respuesta.status === 401 && autenticado) {
      this.opciones.alNoAutorizado?.();
    } else if (respuesta.status === 403 && codigo === 'PASSWORD_CHANGE_REQUIRED') {
      this.opciones.alRequerirCambioPassword?.();
    }
    throw error;
  }
}
