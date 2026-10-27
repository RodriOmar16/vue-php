# vue-php

**El panel de administración (`/admin`) del sistema de reservas de salones de fiestas**: la herramienta de trabajo de los dueños y empleados de cada salón, y del superadmin de la plataforma. Funciona como el `/wp-admin` de WordPress. Todo lo que muestra lo pide a `api-reservas`; la seguridad real está en la API.

| Proyecto | Qué es |
|---|---|
| `api-reservas` | API REST, base de datos y reglas del negocio |
| **vue-php** (este) | Panel `/admin` para dueños y empleados |
| `sitio-reservas` | Sitio público para el cliente final |

> El nombre `vue-php` es histórico (antes trabajaba con una API en PHP, que ya no se usa).

## Qué se encarga de hacer

- **Reservas.** Lista con filtros, detalle de cada una, calendario mensual y semanal, y avisos de lo que requiere atención (comprobantes por revisar, reembolsos por devolver).
- **Pagos.** Ver el comprobante que subió el cliente, aprobarlo o rechazarlo con motivo, registrar pagos en efectivo o transferencia, cancelar reservas y manejar los reembolsos.
- **Lo que ofrece el salón.** Salones y sus horarios, cierres, menús, alimentos, instalaciones, servicios y combos con tarifas y un simulador de precios.
- **Marca y página pública.** Logo, colores, textos, datos bancarios, política de cancelación del cliente y «Mi página» (qué secciones se ven y en qué orden).
- **Equipo.** Alta de empleados y dueños con clave temporal.
- **Plataforma (superadmin).** Alta de empresas y reseteo de sus dueños.

Qué ve cada persona depende de su rol: *dueño*, *empleado* (solo consulta lo de configuración) o *superadmin*.

## Tecnología

Vue 3 (`<script setup lang="ts">`) · TypeScript · Vite · Vuetify 3 · Pinia · Vue Router · Vitest + Vue Test Utils.

## Puesta en marcha

Requisito: la API corriendo (por defecto en `http://localhost:3000`).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Variable de entorno | Para qué sirve | Por defecto |
|---|---|---|
| `VITE_API_URL` | Dirección de la API | `http://localhost:3000/api` |
| `VITE_SITIO_URL` | Dirección del sitio público (botón «Ver mi página» y enlaces a reservas) | `http://localhost:3001` |

Para no tener que iniciar sesión en cada recarga durante el desarrollo, se puede poner `VITE_DEV_EMAIL` y `VITE_DEV_PASSWORD` en `.env.development.local` (git lo ignora). En producción no hace nada.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa los tipos y compila para producción |
| `npm run typecheck` | Solo revisa los tipos |
| `npm run test:unit` | Tests (`npx vitest run` para una sola pasada) |

## Dónde está cada cosa

```
src/api/        cliente de la API y un archivo por recurso
src/views/admin/   una carpeta por sección del panel
src/router/     rutas, permisos por rol y menú lateral
src/store/      sesión y avisos globales
src/utils/      lógica pura y testeada (fechas en la zona de la empresa, dinero, calendario…)
```

Para entrar en detalle (convenciones y decisiones) leé [`CLAUDE.md`](./CLAUDE.md).
