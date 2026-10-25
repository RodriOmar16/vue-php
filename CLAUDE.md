# vue-php (front del sistema de reservas)

Front multi-tenant para salones de fiestas: sitio público para clientes (en construcción) y back office de dueños/empleados bajo `/admin` (como el `/wp-admin` de WordPress). Consume `api-reservas` (NestJS) en `D:\Disco C\Documentos\Mis Proyectos\api-reservas`. La API PHP vieja (`miapp-api`) ya no se usa.

## Stack
Vue 3 (`<script setup lang="ts">`) · TypeScript 6.0.3 (fijo: `vue-tsc` aún no soporta TS 7) · Vite · Vuetify 3 · Pinia · Vue Router 4 · Vitest + @vue/test-utils + jsdom. Sin axios: cliente `fetch` propio.

## Comandos
- `npm run dev` (o `serve`) — dev server en http://localhost:5173
- `npm run typecheck` — `vue-tsc --noEmit`
- `npm run build` — typecheck + `vite build`
- `npm run test:unit` — Vitest (`npx vitest run` para una pasada)
- La API debe estar corriendo (`npm run start:dev` en `api-reservas`, puerto 3000). Los orígenes permitidos por CORS se configuran en su `.env` (`CORS_ORIGINS`, por defecto `http://localhost:5173`).

## Entorno
- `.env.example` documenta `VITE_API_URL` (default `http://localhost:3000/api`).
- Login automático de desarrollo: poner `VITE_DEV_EMAIL` y `VITE_DEV_PASSWORD` en `.env.development.local` (git lo ignora por `*.local`). Usa el login normal de la API; no hay atajos de autenticación, y en el build de producción no hace nada. Cerrar sesión a propósito lo desactiva hasta el próximo login manual.

## Estructura (`src/`)
- `api/` — `http.ts` (cliente tipado `ClienteHttp`, `ApiError`), `cliente.ts` (instancia única), `auth.ts`, `tipos.ts` (tipos de respuesta escritos a mano: la API aún no documenta respuestas en Swagger), `token.ts`. Un archivo por recurso a medida que se agreguen.
- `store/` — Pinia: `sesion.ts` (token, perfil, rol), `genericos.ts` (loading + snackbar global).
- `router/` — `index.ts` (rutas y `beforeEach`), `guardias.ts` (decisión pura de acceso, testeada), `menu.ts` (menú lateral por rol), `redireccion.ts` (anti open-redirect), `autologin.ts`.
- `layouts/` — `LayoutPublico` (sitio) y `LayoutAdmin` (barra + menú lateral por rol).
- `views/admin/` — `LoginAdmin`, `CambiarPassword`, `AdminInicio`. `views/general/` — sitio público. `views/_pendientes/` — pantallas del diseño viejo, sin ruta ni compilación, a rehacer una por rebanada (ver su README).
- `components/utils/` — `Loading`, `SnackBar` (ya TS); el resto (`FechaPicker`, `ModalConfirmar`, etc.) sigue en JS y se convierte al usarlo.
- `test/ayudas.ts` (en `src/test/`): ayudantes comunes para probar pantallas con diálogos de Vuetify. Tests junto al código en `__tests__/`.

## Convenciones
- **Roles**: `propietario` (se muestra «Dueño»), `empleado`, `superadmin` (solo lo ve quien lo es). El front solo mejora la experiencia: la seguridad real está en la API.
- **Rutas**: `meta` declara `requiereAuth`, `soloInvitado`, `roles`, `permiteCambioPassword` (tipado en `guardias.ts`). Para sumar una sección: ruta hija de `/admin` con sus `roles` + item en `router/menu.ts` con los mismos roles + vista + `api/<recurso>.ts` + tests.
- **Errores de la API**: siempre `ApiError` (`status`, `message` en español, `code` opcional). 401 en ruta autenticada → `alNoAutorizado` (cierra sesión y manda al login con `?redirect=`); 403 `PASSWORD_CHANGE_REQUIRED` → pantalla de cambio de clave; `status 0` = sin conexión.
- **Dinero**: la API devuelve texto con 2 decimales (`"1500.00"`) y recibe números. El front nunca calcula totales: los pide a la API.
- **Fechas y horas**: la zona horaria de la empresa viene en `usuario.empresa.zonaHoraria`. Todo lo que el dueño escribe (cierres, y más adelante reservas) se interpreta en ESA zona, no en la del navegador: usar `utils/zonaHoraria.ts` (`localAIso`, `isoALocal`, `describirRango`...; maneja horario de verano) para convertir de/hacia los instantes ISO de la API. Las franjas son `HH:mm` locales sin conversión; las fechas de tarifas, `YYYY-MM-DD`.
- Los diálogos con clave temporal (alta de empresa, alta de persona, resetear) usan `DialogoClaveTemporal`: la clave se muestra una vez y solo se cierra con «Ya la anoté». Las reglas de formulario compartidas están en `utils/reglas.ts`.
- Las listas de catálogo comparten `composables/useCatalogo.ts` (carga, filtro de bajas, permisos, baja/reactivación con confirmación). Para sumar otra lista del mismo estilo: view + dialog + `useCatalogo` + ruta hija de `catalogo` + pestaña en `LayoutCatalogo.vue`. Las bajas son lógicas; el género del texto («dado/dada de baja») sale de `genero`.
- Importes: la API los devuelve como texto («1500.00»); `utils/dinero.ts` los formatea en pesos, valida lo que se escribe y convierte a número para enviar. Al editar un campo opcional que antes tenía valor, vaciarlo envía `null` (la API lo interpreta como «quitar»); omitirlo lo conserva.
- Los cierres «de días completos» se guardan de las 00:00 a las 00:00 del día siguiente al último; `describirRango` y el diálogo ya lo traducen a «hasta el día X inclusive».
- Los filtros de query solo admiten los parámetros que la API declara (rechaza los desconocidos con 400).
- UI en español, iconos FontAwesome (`fa-solid fa-...`), accesibilidad básica (`role="alert"`, `aria-label` en botones de icono).

## Tests
- Hay que mockear `@/api/auth` (u otro módulo de API) con `vi.mock`, no `fetch`, salvo en los tests del cliente HTTP.
- En tests de pantallas con diálogos: los cerrados siguen montados en el DOM y las animaciones no terminan en jsdom; elegir botones dentro de `.v-overlay--active` y no esperar a que el DOM se vacíe (ver los helpers en `EquipoView.spec.ts`).
- Vuetify en jsdom necesita `vitest.setup.ts` (ResizeObserver, matchMedia, visualViewport) y `server.deps.inline: ['vuetify']`. Definir esos stubs como funciones normales, no `vi.fn` (`vi.resetAllMocks()` los vaciaría).
- Navegar al mismo path dos veces es una navegación duplicada (sin guardias): salir a otra ruta antes.

## Pendientes (por rebanadas)
1. ~~Base: login, sesión, layout, cambio de clave~~ (hecha)
2. ~~Panel Plataforma (superadmin): alta de empresas y reseteo de dueño~~ (hecha)
3. ~~Equipo (dueño): alta de empleados/dueños con clave temporal~~ (hecha)
4. ~~Salones, franjas horarias y bloqueos~~ (hecha: `/admin/salones`, `/admin/salones/:id/horarios`, `/admin/cierres`; el empleado solo consulta)
5. ~~Catálogos: alimentos, menús, instalaciones, servicios~~ (hecha: `/admin/catalogo/{menus,alimentos,instalaciones,servicios}`; el empleado solo consulta)
6. ~~Combos: tarifas y cotizador~~ (hecha: `/admin/combos` y `/admin/combos/:id` con tarifas y «Probar el precio»; el empleado solo consulta. Instalaciones: «Apto para todo público (ATP)» o «Con límite de edad»)
7. Reservas y sitio público (cuando la API los tenga) · fotos (MinIO). El sitio público podría ser un proyecto Nuxt aparte (decisión pendiente, ver CLAUDE.md de la API); el cliente ve «Mi cuenta», no «Usuarios».
- Deuda: bundle de ~680 kB (Vuetify completo; usar `vite-plugin-vuetify`), actualizaciones mayores de dependencias (vite 8, vuetify 4, pinia 4, vue-router 5), `FechaPicker` y utilidades aún en JS.
