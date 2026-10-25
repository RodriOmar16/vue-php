# Vistas pendientes de rehacer

Son las pantallas del diseño original (Reservas, Combos, Usuarios, Login con registro).
**No están en el router ni se compilan**: usan datos de prueba y las capas antiguas
(`authService`, `usuariosService`, la API PHP) que ya no existen.

Se rehacen sobre la API nueva (`api-reservas`), una por rebanada, y se van eliminando de aquí:

| Vista | Se rehace en |
|---|---|
| `usuarios/Usuarios.vue` | Gestión de equipo (`/admin/equipo`) |
| `combos/Combos.vue` | Combos (`/admin/combos`) |
| `reservas/Reservas.vue`, `UnaReserva.vue` | Reservas (`/admin/reservas`), cuando la API tenga reservas |
| `LoginViejo.vue` | El registro del cliente final, en el sitio público |

Sirven de referencia visual y de filtros/columnas; no de lógica.
