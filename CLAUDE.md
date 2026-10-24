# vue-php

Front del sistema de reservas de un salón de eventos (reservas, combos, usuarios).
Consume la API PHP `miapp-api` (Laragon, `http://localhost/miapp-api/`). Este repo es solo el front.

## Stack
Vue 3 (`<script setup>`, JavaScript, sin TS) · Vite · Vuetify 3 · Pinia · Vue Router 4 · moment · FontAwesome · Vitest + jsdom.

## Comandos
- `npm run serve` — dev server (el README dice `dev`, pero el script es `serve`)
- `npm run build` / `npm run preview`
- `npm run test:unit` — Vitest (todavía no hay tests)

## Estructura (`src/`)
- `views/` por módulo: `general`, `reservas`, `combos`, `usuarios`
- `components/generales` (navbar, footer, logo) y `components/utils` (FechaPicker, Loading, SnackBar, ModalConfirmar, etc.)
- `services/` — llamadas a la API vía `apiFetch` (`api.js`); un archivo por módulo
- `store/` — Pinia (`auth`, `genericos` para loading/snackbar, `reservas`, `usuarios`)
- `router/index.js` — guard por token en `localStorage`; alias `@` = `src/`
- `otros/` — notas de diseño (roles, flujos de reservas y combos, SQL); leerlas antes de implementar módulos

## Convenciones
- Respuesta estándar de la API: `{ resultado: 0|1, msj, ... }`; `apiFetch` devuelve `resultado: 0` ante cualquier error.
- Feedback al usuario: `genericosStore().setSnackBar(texto, color)` y `loading`.
- Fechas en UI `DD/MM/YYYY`; la API usa `YYYY-MM-DD`.
- UI en español. Íconos FontAwesome (`fa-solid fa-...`).
- Roles previstos: DBA, admin, organizador. La autorización real debe validarse en la API, no solo en el front.

## Estado y pendientes conocidos
- `reservasService.js` vacío; stores `reservas` y `usuarios` vacíos; `Reservas.vue` usa datos hardcodeados.
- `auth.js` guarda la contraseña en el state (quitar).
- Sin roles en el router; sin manejo de 401/token expirado.
- Dependencias desactualizadas con vulnerabilidades (`npm audit`).
