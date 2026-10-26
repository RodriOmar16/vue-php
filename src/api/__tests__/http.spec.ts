import { describe, expect, it, vi } from 'vitest';
import { ApiError, ClienteHttp } from '../http';

const respuesta = (status: number, cuerpo?: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const crear = (fetchImpl: typeof fetch, extra: Partial<ConstructorParameters<typeof ClienteHttp>[0]> = {}) =>
  new ClienteHttp({
    baseUrl: 'http://api.test/api/',
    obtenerToken: () => 'TOKEN',
    fetchImpl,
    ...extra,
  });

/** Ejecuta una promesa que debe fallar y devuelve el error (tipado). */
const fallo = async (promesa: Promise<unknown>): Promise<ApiError> => {
  try {
    await promesa;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('se esperaba que fallara');
};

describe('ClienteHttp', () => {
  it('arma la URL (sin barras dobles ni parámetros vacíos) y envía el token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { ok: 1 }));
    const http = crear(fetchMock);

    const data = await http.get<{ ok: number }>('/admin/salones', {
      query: { incluirInhabilitados: true, salonId: 3, vacio: '', nulo: null, indef: undefined },
    });

    expect(data).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/admin/salones?incluirInhabilitados=true&salonId=3');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer TOKEN');
    expect(init.body).toBeUndefined();
  });

  it('envía JSON en POST y PATCH, y maneja 204 sin cuerpo', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respuesta(201, { id: 5 }))
      .mockResolvedValueOnce(respuesta(200, { id: 5 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const http = crear(fetchMock);

    await http.post('/x', { nombre: 'A' });
    await http.patch('/x/5', { nombre: 'B' });
    const vacio = await http.delete('/x/5');

    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
    expect(fetchMock.mock.calls[0][1].body).toBe('{"nombre":"A"}');
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
    expect(vacio).toBeUndefined();
  });

  it('PUT envía JSON; un FormData se manda tal cual y SIN Content-Type (lo fija el navegador)', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => respuesta(200, {}));
    const http = crear(fetchMock);

    await http.put('/x/orden', { medioIds: [2, 1] });
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    expect(fetchMock.mock.calls[0][1].body).toBe('{"medioIds":[2,1]}');

    const datos = new FormData();
    datos.append('archivo', new File(['x'], 'foto.png', { type: 'image/png' }));
    await http.post('/x', datos);
    const [, init] = fetchMock.mock.calls[1];
    expect(init.body).toBe(datos);
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer TOKEN');
  });

  it('descargar() trae un archivo con el token; si falla, el error sigue el mismo camino que el resto', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('contenido-binario', { status: 200, headers: { 'Content-Type': 'application/pdf' } }))
      .mockResolvedValueOnce(respuesta(404, { message: 'No se encontró' }));
    const http = crear(fetchMock);

    const archivo = await http.descargar('/admin/pagos/1/comprobante');
    expect(await archivo.text()).toBe('contenido-binario');
    expect(archivo.type).toBe('application/pdf');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer TOKEN');
    expect(fetchMock.mock.calls[0][1].headers.Accept).toBe('*/*');

    const error = await fallo(http.descargar('/admin/pagos/2/comprobante'));
    expect(error.status).toBe(404);
  });

  it('no envía el token en rutas no autenticadas ni si no hay token', async () => {
    // una Response nueva por llamada: su cuerpo solo se puede leer una vez
    const fetchMock = vi.fn().mockImplementation(async () => respuesta(200, {}));
    await crear(fetchMock).post('/login', {}, { autenticado: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();

    await crear(fetchMock, { obtenerToken: () => null }).get('/x');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('une los mensajes de validación (lista) y usa el mensaje de negocio de la API', async () => {
    const validacion = crear(vi.fn().mockResolvedValue(respuesta(400, { message: ['nombre no puede estar vacío', 'precio debe ser positivo'] })));
    await expect(validacion.post('/x', {})).rejects.toMatchObject({
      status: 400,
      message: 'nombre no puede estar vacío. precio debe ser positivo',
    });

    const negocio = crear(vi.fn().mockResolvedValue(respuesta(409, { message: 'Ya existe un usuario con ese email' })));
    await expect(negocio.post('/x', {})).rejects.toMatchObject({ status: 409, message: 'Ya existe un usuario con ese email' });
  });

  it('el error es una ApiError con status y código', async () => {
    const http = crear(vi.fn().mockResolvedValue(respuesta(403, { code: 'PASSWORD_CHANGE_REQUIRED', message: 'x' })));
    const error = await fallo(http.get('/x'));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('401 en una ruta autenticada avisa para cerrar la sesión; en el login no', async () => {
    const alNoAutorizado = vi.fn();
    const http = crear(vi.fn().mockResolvedValue(respuesta(401, { message: 'Unauthorized' })), { alNoAutorizado });

    await expect(http.get('/admin/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(alNoAutorizado).toHaveBeenCalledTimes(1);

    await expect(http.post('/admin/auth/login', {}, { autenticado: false })).rejects.toMatchObject({ status: 401 });
    expect(alNoAutorizado).toHaveBeenCalledTimes(1); // no se volvió a llamar
  });

  it('403 con PASSWORD_CHANGE_REQUIRED avisa del cambio de clave; otro 403 no', async () => {
    const alRequerirCambioPassword = vi.fn();
    const clave = crear(vi.fn().mockResolvedValue(respuesta(403, { code: 'PASSWORD_CHANGE_REQUIRED' })), { alRequerirCambioPassword });
    await expect(clave.get('/x')).rejects.toBeInstanceOf(ApiError);
    expect(alRequerirCambioPassword).toHaveBeenCalledTimes(1);

    const rol = crear(vi.fn().mockResolvedValue(respuesta(403, { message: 'Forbidden' })), { alRequerirCambioPassword });
    await expect(rol.get('/x')).rejects.toMatchObject({ status: 403 });
    expect(alRequerirCambioPassword).toHaveBeenCalledTimes(1);
  });

  it('mensajes claros para 429, 5xx, sin conexión y respuestas de error sin JSON', async () => {
    const e429 = await fallo(crear(vi.fn().mockResolvedValue(respuesta(429, { message: 'ThrottlerException: Too Many Requests' }))).get('/x'));
    expect(e429.message).toBe('Demasiados intentos. Espere un minuto e intente de nuevo.');

    const e500 = await fallo(crear(vi.fn().mockResolvedValue(respuesta(500, { message: 'Internal server error' }))).get('/x'));
    expect(e500.message).toContain('Error del servidor');

    const sinConexion = await fallo(crear(vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))).get('/x'));
    expect(sinConexion).toBeInstanceOf(ApiError);
    expect(sinConexion.status).toBe(0);
    expect(sinConexion.message).toContain('No se pudo conectar');

    const html = await fallo(crear(vi.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))).get('/x'));
    expect(html.status).toBe(502);
    expect(html.message).toContain('Error del servidor');
  });

  it('configurar() permite conectar los avisos después de crear el cliente', async () => {
    const http = crear(vi.fn().mockResolvedValue(respuesta(401, {})));
    const aviso = vi.fn();
    http.configurar({ alNoAutorizado: aviso });
    await http.get('/x').catch(() => undefined);
    expect(aviso).toHaveBeenCalledTimes(1);
  });
});
